const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

const PYTHON_HOST = '127.0.0.1';
const PYTHON_PORT = 8000;
const GENERATED_DIR = path.join(__dirname, '..', 'generated');

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

router.use('/output', express.static(GENERATED_DIR));

function callPythonService(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: PYTHON_HOST,
      port: PYTHON_PORT,
      path: '/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 300000,
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.detail || `Python error (${res.statusCode})`));
          }
        } catch {
          reject(new Error(`Invalid response: ${responseData.slice(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Python service unavailable: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Python service timed out')); });
    req.write(data);
    req.end();
  });
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { prompt, negative_prompt, width, height, steps, guidance_scale, seed } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    logger.info('image_generate_start', `prompt="${prompt.slice(0, 100)}" ${width}x${height} steps=${steps}`, { user: req.userId });

    const result = await callPythonService({
      prompt: prompt.trim(),
      negative_prompt: negative_prompt || '',
      width: width || 512,
      height: height || 512,
      steps: steps || 4,
      guidance_scale: guidance_scale ?? 2.0,
      seed: seed ?? -1,
    });

    const imageId = uuidv4();
    const imageRecord = {
      id: imageId,
      prompt: prompt.trim(),
      filename: result.filename,
      seed: result.seed,
      inference_time: result.inference_time,
      user_id: req.userId,
      created_at: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('image_generated', { ...imageRecord, image: result.image });
    }

    logger.info('image_generate_done', `prompt="${prompt.slice(0, 60)}" time=${result.inference_time}s`, { user: req.userId });
    res.json({ ...imageRecord, image: result.image });
  } catch (error) {
    logger.error('image_generate_error', error.message, { stack: error.stack, user: req.userId });
    res.status(500).json({ error: error.message });
  }
});

function callPythonTextService(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: PYTHON_HOST, port: PYTHON_PORT, path: '/generate-text', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 300000,
    };
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(parsed.detail || `Python error (${res.statusCode})`));
        } catch { reject(new Error(`Invalid response: ${responseData.slice(0, 200)}`)); }
      });
    });
    req.on('error', (err) => reject(new Error(`Python service unavailable: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Python service timed out')); });
    req.write(data);
    req.end();
  });
}

router.post('/text', authMiddleware, async (req, res) => {
  try {
    const { prompt, thinking, max_tokens, temperature, top_p } = req.body;
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    logger.info('text_generate', `prompt="${prompt.slice(0, 80)}" thinking=${!!thinking}`, { user: req.userId });
    const result = await callPythonTextService({
      prompt: prompt.trim(), thinking: !!thinking,
      max_tokens: max_tokens || 256, temperature: temperature ?? 0.7, top_p: top_p ?? 0.9,
    });
    res.json({ text: result.text, thinking_text: result.thinking_text || '', tokens_per_sec: result.tokens_per_sec, inference_time: result.inference_time });
  } catch (error) {
    logger.error('text_generate_error', error.message, { stack: error.stack, user: req.userId });
    res.status(500).json({ error: error.message });
  }
});

router.post('/text/stream', authMiddleware, async (req, res) => {
  const { prompt, thinking, max_tokens, temperature, top_p } = req.body;
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  logger.info('text_stream_start', `prompt="${prompt.slice(0, 80)}" thinking=${!!thinking}`, { user: req.userId });
  const data = JSON.stringify({
    prompt: prompt.trim(), thinking: !!thinking,
    max_tokens: max_tokens || 256, temperature: temperature ?? 0.7, top_p: top_p ?? 0.9,
  });
  const options = {
    hostname: PYTHON_HOST, port: PYTHON_PORT, path: '/generate-text-stream', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    timeout: 300000,
  };
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  if (res.socket) res.socket.setNoDelay(true);
  const proxyReq = http.request(options, (proxyRes) => {
    proxyRes.on('data', (chunk) => { res.write(chunk); });
    proxyRes.on('end', () => { res.end(); });
  });
  proxyReq.on('error', (err) => {
    logger.error('text_stream_error', err.message, { user: req.userId });
    res.write(`data: ${JSON.stringify({ type: 'error', text: err.message })}\n\n`);
    res.end();
  });
  proxyReq.on('timeout', () => {
    logger.error('text_stream_timeout', 'Stream timed out', { user: req.userId });
    proxyReq.destroy();
    res.write(`data: ${JSON.stringify({ type: 'error', text: 'Timeout' })}\n\n`);
    res.end();
  });
  proxyReq.write(data);
  proxyReq.end();
});

router.get('/health', authMiddleware, async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: PYTHON_HOST,
        port: PYTHON_PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000,
      };
      const r = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid response')); }
        });
      });
      r.on('error', (err) => reject(err));
      r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
      r.end();
    });
    res.json(result);
  } catch (error) {
    res.status(503).json({ status: 'error', detail: error.message });
  }
});

module.exports = router;
