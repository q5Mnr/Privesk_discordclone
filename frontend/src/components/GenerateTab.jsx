import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Download, ImageIcon, MessageSquareText, Maximize2, Minimize2, X, Plus, Trash2, MessageCircle, Music, Volume2, Play, Square, Zap } from 'lucide-react';
import { apiPost, apiGet, apiDelete, apiPut } from '../utils/api';
import RenderMessage from './RenderMessage';

const STREAM_URL = `http://${window.location.hostname}:3001/api/generate/text/stream`;

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-discord-green/20 flex items-center justify-center">
          <Sparkles size={16} className="text-discord-green animate-pulse" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-yellow-400/80 font-medium">Думаю...</span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-discord-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-discord-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-discord-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function ThinkingBlock({ text, streaming }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [text]);
  return (
    <div className="mb-2 border border-discord-yellow/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-discord-yellow/10 border-b border-discord-yellow/20">
        <Sparkles size={12} className="text-discord-yellow animate-pulse" />
        <span className="text-xs text-discord-yellow/80 font-medium">Рассуждение</span>
        {streaming && <span className="w-1.5 h-3 bg-discord-yellow animate-pulse ml-auto" />}
      </div>
      <div ref={ref} className="px-3 py-2 text-xs text-discord-muted italic bg-discord-yellow/5 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
        {text}
      </div>
    </div>
  );
}

function ChatMessage({ msg }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        msg.role === 'user'
          ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white rounded-br-md shadow-lg'
          : msg.error
            ? 'bg-discord-red/20 border border-discord-red/30 text-discord-red rounded-bl-md'
            : 'bg-discord-dark border border-discord-light/20 text-discord-text rounded-bl-md'
      }`}>
        {msg.role === 'assistant' && msg.thinking && (
          <ThinkingBlock text={msg.thinking} streaming={false} />
        )}
        <div className="text-sm">
          {msg.role === 'assistant'
            ? <RenderMessage text={msg.content} />
            : <span className="whitespace-pre-wrap">{msg.content}</span>
          }
        </div>
      </div>
    </div>
  );
}

function StreamMessage({ streamMsg }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-discord-dark border border-discord-light/20 px-4 py-3">
        {streamMsg.thinking && (
          <ThinkingBlock text={streamMsg.thinking} streaming={!streamMsg.text} />
        )}
        {streamMsg.text ? (
          <div className="text-sm text-discord-text"><RenderMessage text={streamMsg.text} /></div>
        ) : !streamMsg.thinking ? (
          <ThinkingIndicator />
        ) : (
          <div className="text-xs text-discord-muted italic flex items-center gap-2">
            <span className="w-1.5 h-3 bg-discord-accent animate-pulse" />
            Печатаю ответ...
          </div>
        )}
      </div>
    </div>
  );
}

function ChatSidebar({ chats, activeId, onSelect, onNew, onDelete }) {
  return (
    <div className="w-56 bg-discord-dark border-r border-discord-light/20 flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-discord-light/20">
        <button onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all shadow-lg">
          <Plus size={16} />Новый чат
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <div key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`flex items-center gap-2 px-3 py-2.5 mx-2 my-1 rounded-xl cursor-pointer group transition-all ${
              activeId === chat.id ? 'bg-discord-accent/15 text-discord-accent font-medium' : 'text-discord-muted hover:bg-discord-light/20 hover:text-discord-text'
            }`}>
            <MessageCircle size={14} className="flex-shrink-0 opacity-60" />
            <span className="flex-1 text-sm truncate">{chat.title}</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:text-discord-red transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {chats.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-discord-muted">Нет чатов</div>
        )}
      </div>
    </div>
  );
}

function FullScreenChat({ onClose, chats, setChats, loadChatMessages, createChat, deleteChat, saveMessage, updateChatTitle }) {
  const [activeChat, setActiveChat] = useState(null);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [thinking, setThinking] = useState(true);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [streamMsg, setStreamMsg] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeMessages = chats.find(c => c.id === activeChat)?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, streamMsg, loadingMsg]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChat]);

  const updateChat = (id, updater) => {
    setChats(prev => prev.map(c => c.id === id ? updater(c) : c));
  };

  const createNewChat = async () => {
    const id = await createChat();
    if (id) setActiveChat(id);
  };

  useEffect(() => {
    if (!activeChat && chats.length > 0) {
      setActiveChat(chats[0].id);
      loadChatMessages(chats[0].id);
    }
    if (!activeChat && chats.length === 0) createNewChat();
  }, []);

  const pollHealth = async (retries = 60, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/generate/health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.text_model) return true;
        if (data.text_error) throw new Error(data.text_error);
        setLoadingMsg(`Модель загружается... (${Math.round((i + 1) * interval / 1000)}с)`);
      } catch (e) {
        if (e.message.includes('model failed') || e.message.includes('not found')) throw e;
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error('Тайм-аут загрузки модели (5 мин)');
  };

  const streamSend = async (userMsg, useThinking) => {
    const token = localStorage.getItem('token');
    const res = await fetch(STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt: userMsg, thinking: useThinking, max_tokens: useThinking ? 4096 : 1024, temperature: 0.7, top_p: 0.9 }),
    });
    if (res.status === 503) throw new Error('still loading');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let thinkingBuf = '';
    let answerBuf = '';
    let inThinking = false;
    let lineBuffer = '';
    setStreamMsg({ thinking: '', text: '', done: false });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const parts = lineBuffer.split('\n');
      lineBuffer = parts.pop();
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.type === 'thinking') {
            inThinking = true;
            thinkingBuf += data.text;
            setStreamMsg(prev => ({ ...prev, thinking: thinkingBuf }));
          } else if (data.type === 'thinking_done') {
            inThinking = false;
          } else if (data.type === 'text') {
            answerBuf += data.text;
            setStreamMsg(prev => ({ ...prev, text: answerBuf }));
          } else if (data.type === 'done') {
            setStreamMsg(prev => ({ ...prev, done: true }));
          } else if (data.type === 'error') {
            throw new Error(data.text);
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }
    return { thinking: thinkingBuf, text: answerBuf };
  };

  const handleSend = async () => {
    if (!input.trim() || generating || !activeChat) return;
    const userMsg = input.trim();
    setInput('');
    setError('');
    setLoadingMsg('');
    setStreamMsg(null);
    setGenerating(true);

    const userMessage = { role: 'user', content: userMsg };
    updateChat(activeChat, c => ({ ...c, messages: [...c.messages, userMessage] }));
    saveMessage(activeChat, userMessage);

    updateChat(activeChat, c => {
      const newTitle = c.messages.length === 0 ? userMsg.slice(0, 40) : c.title;
      if (c.messages.length === 0 && newTitle !== c.title) updateChatTitle(activeChat, newTitle);
      return { ...c, title: newTitle };
    });

    try {
      const result = await streamSend(userMsg, thinking);
      const assistantMsg = { role: 'assistant', content: result.text, thinking: result.thinking };
      updateChat(activeChat, c => ({ ...c, messages: [...c.messages, assistantMsg] }));
      saveMessage(activeChat, assistantMsg);
    } catch (err) {
      if (err.message.includes('still loading') || err.message.includes('503')) {
        setLoadingMsg('Модель загружается, ожидание...');
        try {
          await pollHealth();
          setStreamMsg(null);
          const result = await streamSend(userMsg, thinking);
          const assistantMsg = { role: 'assistant', content: result.text, thinking: result.thinking };
          updateChat(activeChat, c => ({ ...c, messages: [...c.messages, assistantMsg] }));
          saveMessage(activeChat, assistantMsg);
        } catch (retryErr) {
          setError(retryErr.message);
          const errMsg = { role: 'assistant', content: 'Ошибка: ' + retryErr.message, error: true };
          updateChat(activeChat, c => ({ ...c, messages: [...c.messages, errMsg] }));
          saveMessage(activeChat, errMsg);
        }
      } else {
        setError(err.message);
        const errMsg = { role: 'assistant', content: 'Ошибка: ' + err.message, error: true };
        updateChat(activeChat, c => ({ ...c, messages: [...c.messages, errMsg] }));
        saveMessage(activeChat, errMsg);
      }
    } finally {
      setGenerating(false);
      setLoadingMsg('');
      setStreamMsg(null);
    }
  };

  const handleSelectChat = (id) => {
    setActiveChat(id);
    const chat = chats.find(c => c.id === id);
    if (chat && (!chat.messages || chat.messages.length === 0)) {
      loadChatMessages(id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-discord-dark flex">
      <ChatSidebar
        chats={chats}
        activeId={activeChat}
        onSelect={handleSelectChat}
        onNew={createNewChat}
        onDelete={deleteChat}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-3 bg-discord-darker border-b border-discord-light/20">
          <div className="flex items-center gap-3">
            <MessageSquareText size={20} className="text-discord-accent" />
            <span className="font-bold text-discord-white truncate">
              {chats.find(c => c.id === activeChat)?.title || 'Чат с Qwen3'}
            </span>
            <span className="text-xs text-discord-muted">Qwen3 1.7B</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className={`relative w-9 h-5 rounded-full transition-colors ${thinking ? 'bg-discord-green' : 'bg-discord-muted'}`}
                onClick={() => setThinking(!thinking)}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${thinking ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-discord-muted">Thinking</span>
            </label>
            <button onClick={onClose} className="p-2 hover:bg-discord-light/30 rounded-xl text-discord-muted hover:text-discord-white transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {activeMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-discord-muted">
              <MessageSquareText size={48} className="mb-3 opacity-30" />
              <p className="text-lg font-medium">Начните диалог</p>
              <p className="text-sm mt-1">Задайте любой вопрос нейросети Qwen3</p>
            </div>
          )}
          {activeMessages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
          {generating && streamMsg && <StreamMessage streamMsg={streamMsg} />}
          {generating && !streamMsg && (
            <div className="flex justify-start">
              <div className="bg-discord-dark border border-discord-light/20 rounded-2xl rounded-bl-md px-4 py-3">
                {loadingMsg ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-discord-yellow rounded-full animate-pulse" />
                    <span className="text-sm text-discord-muted">{loadingMsg}</span>
                  </div>
                ) : (
                  <ThinkingIndicator />
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 bg-discord-darker border-t border-discord-light/20">
          {error && <div className="mb-2 text-xs text-discord-red">{error}</div>}
          <div className="flex gap-2">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Введите сообщение..." disabled={generating}
              className="flex-1 bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 disabled:opacity-50" />
            <button onClick={handleSend} disabled={generating || !input.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all text-sm shadow-lg">
              {generating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageGeneration() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [steps, setSteps] = useState(4);
  const [guidance, setGuidance] = useState(2.0);
  const [seed, setSeed] = useState(-1);
  const [generating, setGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [error, setError] = useState('');
  const resultRef = useRef(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');
    setCurrentImage(null);
    try {
      const result = await apiPost('/api/generate', {
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim(),
        width, height, steps, guidance_scale: guidance, seed,
      });
      setCurrentImage(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Промпт</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Опишите изображение..." rows={2} disabled={generating}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 resize-none transition-colors" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Негативный промпт</label>
        <input value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
          placeholder="Чего избежать..." disabled={generating}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Ширина</label>
          <select value={width} onChange={e => setWidth(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors">
            {[256, 384, 512, 640, 768, 896, 1024].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Высота</label>
          <select value={height} onChange={e => setHeight(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors">
            {[256, 384, 512, 640, 768, 896, 1024].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Шаги</label>
          <input type="number" min={1} max={50} value={steps} onChange={e => setSteps(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">CFG</label>
          <input type="number" min={0} max={20} step={0.5} value={guidance} onChange={e => setGuidance(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Seed (-1=случайный)</label>
          <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
        </div>
      </div>
      <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg">
        {generating ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Генерация...</>) : (<><Sparkles size={18} />Сгенерировать</>)}
      </button>
      {error && <div className="bg-discord-red/20 border border-discord-red/30 text-discord-red px-4 py-2 rounded-xl text-sm">{error}</div>}
      {currentImage && (
        <div ref={resultRef} className="space-y-2">
          <div className="relative group">
            <img src={`data:image/png;base64,${currentImage.image}`} alt={currentImage.prompt} className="w-full rounded-xl" />
            <a href={`data:image/png;base64,${currentImage.image}`} download={currentImage.filename}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-xl text-white transition opacity-0 group-hover:opacity-100">
              <Download size={18} />
            </a>
          </div>
          <div className="text-xs text-discord-muted space-y-0.5">
            <p className="text-discord-text text-sm">{currentImage.prompt}</p>
            <p>Seed: {currentImage.seed} &bull; {currentImage.inference_time}s</p>
          </div>
        </div>
      )}
      {!generating && !currentImage && (
        <div className="text-center py-8 text-discord-muted">
          <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Введите промпт и нажмите Сгенерировать</p>
        </div>
      )}
    </div>
  );
}

function TextGeneration({ onOpenChat }) {
  const [prompt, setPrompt] = useState('');
  const [thinking, setThinking] = useState(true);
  const [maxTokens, setMaxTokens] = useState(256);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [streamMsg, setStreamMsg] = useState(null);

  const pollHealth = async (retries = 60, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/generate/health', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.text_model) return true;
        if (data.text_error) throw new Error(data.text_error);
        setLoadingMsg(`Модель загружается... (${Math.round((i + 1) * interval / 1000)}с)`);
      } catch (e) {
        if (e.message.includes('model failed') || e.message.includes('not found')) throw e;
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error('Тайм-аут загрузки модели (5 мин)');
  };

  const streamGenerate = async (userMsg, useThinking) => {
    const token = localStorage.getItem('token');
    const res = await fetch(STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt: userMsg, thinking: useThinking, max_tokens: useThinking ? Math.min(Math.max(maxTokens, 2048), 4096) : maxTokens, temperature, top_p: topP }),
    });
    if (res.status === 503) throw new Error('still loading');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let thinkingBuf = '';
    let answerBuf = '';
    let inThinking = false;
    let lineBuffer = '';
    setStreamMsg({ thinking: '', text: '', done: false });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const parts = lineBuffer.split('\n');
      lineBuffer = parts.pop();
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.type === 'thinking') {
            inThinking = true;
            thinkingBuf += data.text;
            setStreamMsg(prev => ({ ...prev, thinking: thinkingBuf }));
          } else if (data.type === 'thinking_done') {
            inThinking = false;
          } else if (data.type === 'text') {
            answerBuf += data.text;
            setStreamMsg(prev => ({ ...prev, text: answerBuf }));
          } else if (data.type === 'done') {
            setStreamMsg(prev => ({ ...prev, done: true }));
          } else if (data.type === 'error') {
            throw new Error(data.text);
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }
    return { thinking: thinkingBuf, text: answerBuf };
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');
    setLoadingMsg('');
    setStreamMsg(null);
    const userMsg = prompt.trim();
    setPrompt('');
    try {
      const result = await streamGenerate(userMsg, thinking);
      setHistory(prev => [...prev, {
        role: 'assistant', content: result.text, thinking: result.thinking,
      }]);
    } catch (err) {
      if (err.message.includes('still loading') || err.message.includes('503')) {
        setLoadingMsg('Модель загружается, ожидание...');
        try {
          await pollHealth();
          setStreamMsg(null);
          const result = await streamGenerate(userMsg, thinking);
          setHistory(prev => [...prev, {
            role: 'assistant', content: result.text, thinking: result.thinking,
          }]);
        } catch (retryErr) {
          setError(retryErr.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setGenerating(false);
      setLoadingMsg('');
      setStreamMsg(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-discord-text font-medium">Qwen3-1.7B</span>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${thinking ? 'bg-discord-green' : 'bg-discord-muted'}`}
              onClick={() => setThinking(!thinking)}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${thinking ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-discord-muted">Рассуждение</span>
          </label>
        </div>
        <button onClick={onOpenChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all shadow-lg">
          <Maximize2 size={14} />
          Полный чат
        </button>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Сообщение</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={thinking ? "Задайте вопрос с рассуждением..." : "Введите сообщение..."} rows={3} disabled={generating}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 resize-none transition-colors" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Макс. токенов</label>
          <input type="number" min={1} max={4096} value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Temperature</label>
          <input type="number" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Top P</label>
          <input type="number" min={0} max={1} step={0.05} value={topP} onChange={e => setTopP(Number(e.target.value))}
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors" />
        </div>
      </div>
      <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg">
        {generating ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{loadingMsg || 'Генерация...'}</>) : (<><MessageSquareText size={18} />Отправить</>)}
      </button>
      {error && <div className="bg-discord-red/20 border border-discord-red/30 text-discord-red px-4 py-2 rounded-xl text-sm">{error}</div>}
      {generating && streamMsg && (
        <div className="bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-3 border-l-2 border-discord-accent">
          {streamMsg.thinking && <ThinkingBlock text={streamMsg.thinking} streaming={!streamMsg.text} />}
          {streamMsg.text ? (
            <div className="text-sm text-discord-text"><RenderMessage text={streamMsg.text} /></div>
          ) : !streamMsg.thinking ? (
            <ThinkingIndicator />
          ) : null}
        </div>
      )}
      {history.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {history.map((msg, i) => (
            <div key={i} className="bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-3 border-l-2 border-discord-accent">
              <span className="text-xs font-bold uppercase text-discord-accent">Нейросеть</span>
              {msg.thinking && (
                <ThinkingBlock text={msg.thinking} streaming={false} />
              )}
              <div className="text-sm text-discord-text"><RenderMessage text={msg.content} /></div>
            </div>
          ))}
        </div>
      )}
      {history.length === 0 && !generating && (
        <div className="text-center py-8 text-discord-muted">
          <MessageSquareText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Введите сообщение или откройте полный чат</p>
        </div>
      )}
    </div>
  );
}

const VOICE_PRESETS = [
  { id: 'anna', name: 'Анна', icon: '👩', lang: 'ru-RU', rate: 1.0, pitch: 1.1 },
  { id: 'mikhail', name: 'Михаил', icon: '👨', lang: 'ru-RU', rate: 1.0, pitch: 0.9 },
  { id: 'elena', name: 'Елена', icon: '👩‍🦰', lang: 'ru-RU', rate: 1.1, pitch: 1.2 },
  { id: 'sergey', name: 'Сергей', icon: '🧑', lang: 'ru-RU', rate: 0.9, pitch: 0.8 },
  { id: 'alena', name: 'Алёна', icon: '👧', lang: 'ru-RU', rate: 1.05, pitch: 1.3 },
  { id: 'maxim', name: 'Максим', icon: '🧔', lang: 'ru-RU', rate: 0.95, pitch: 0.75 },
];

const MUSIC_GENRES = [
  { id: 'lofi', name: 'Lo-Fi', icon: '🍃', bpmRange: [70, 90] },
  { id: 'edm', name: 'EDM', icon: '⚡', bpmRange: [124, 140] },
  { id: 'ambient', name: 'Ambient', icon: '🌌', bpmRange: [50, 70] },
  { id: 'rock', name: 'Rock', icon: '🎸', bpmRange: [110, 140] },
  { id: 'jazz', name: 'Jazz', icon: '🎷', bpmRange: [85, 115] },
  { id: 'classical', name: 'Classical', icon: '🎻', bpmRange: [60, 85] },
  { id: 'hiphop', name: 'Hip-Hop', icon: '🎤', bpmRange: [80, 100] },
  { id: 'synthwave', name: 'Synthwave', icon: '🌆', bpmRange: [100, 125] },
  { id: 'drill', name: 'Drill', icon: '🔊', bpmRange: [135, 150] },
  { id: 'pop', name: 'Pop', icon: '🎤', bpmRange: [108, 128] },
];

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const ROOT_NOTES = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63];

function midiToFreq(note) { return 440 * Math.pow(2, (note - 69) / 12); }
function scaleFreqs(root, scaleName, octaves = 2) {
  const intervals = SCALES[scaleName] || SCALES.minor;
  const notes = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) {
      notes.push(root * Math.pow(2, (interval + oct * 12) / 12));
    }
  }
  return notes;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function chance(p) { return Math.random() < p; }

function parseDescription(text) {
  const t = text.toLowerCase();
  const result = { bpm: 110, scale: 'minor', root: 220, energy: 0.5, instruments: ['sine', 'triangle'], mood: 'neutral' };

  if (/быстр|fast|speed|энерг|power|дрiv|агресс|metal|thrash/i.test(t)) { result.bpm = randInt(130, 160); result.energy = 0.8; }
  else if (/медленн|slow|тихо|спокойн|relax|chill|лень/i.test(t)) { result.bpm = randInt(55, 75); result.energy = 0.3; }
  else if (/средн|medium|норм|standard/i.test(t)) { result.bpm = randInt(90, 115); result.energy = 0.5; }

  if (/тёмн|dark|минор|minor|злой|evil|драма|horror|ужас|мрачн/i.test(t)) { result.scale = 'minor'; result.root = pick([146.83, 164.81, 174.61, 196]); }
  else if (/ярк|bright|весел|happy|радост|солнц|лето|свадьб|major/i.test(t)) { result.scale = 'major'; result.root = pick([261.63, 293.66, 329.63, 349.23]); }
  else if (/джаз|jazz|свободн|improv/i.test(t)) { result.scale = 'mixolydian'; result.root = pick([220, 246.94, 261.63]); }
  else if (/блюз|blues|печальн|грустн|ностальг/i.test(t)) { result.scale = 'blues'; result.root = pick([174.61, 196, 220]); }
  else if (/пентатон|поп|folk|народн/i.test(t)) { result.scale = 'pentatonic'; result.root = pick([261.63, 293.66, 329.63]); }
  else if (/космос|space|dream|ambien|атмосфер|воздушн/i.test(t)) { result.scale = 'dorian'; result.root = pick([130.81, 146.83, 164.81]); }

  if (/рок|rock|метал|metal|пункт|punk|distort/i.test(t)) { result.instruments = ['sawtooth', 'square']; result.energy = Math.max(result.energy, 0.7); }
  else if (/синт|synth|электро|electro|retro|80s/i.test(t)) { result.instruments = ['square', 'sawtooth']; }
  else if (/фортепиано|piano|классик|classical|оркестр/i.test(t)) { result.instruments = ['triangle', 'sine']; }
  else if (/гитар|guitar|акустик|acoustic/i.test(t)) { result.instruments = ['triangle', 'sawtooth']; }
  else if (/органич|organic|природ|nature|лес|forest/i.test(t)) { result.instruments = ['sine', 'triangle']; result.energy = Math.max(result.energy, 0.4); }

  if (/рван|broken|glitch|бит|碎/i.test(t)) result.mood = 'glitch';
  else if (/эпичн|epic|героическ|battle| fight/i.test(t)) result.mood = 'epic';
  else if (/романтич|love|нежн|soft|мечтательн/i.test(t)) result.mood = 'romantic';
  else if (/танец|dance|club|party|вечеринк/i.test(t)) result.mood = 'dance';

  return result;
}

function renderMusicOffline(genreId, durationSec, description) {
  const sr = 44100;
  const len = Math.floor(sr * durationSec);
  const offline = new OfflineAudioContext(2, len, sr);
  const vol = 0.35;

  let config;
  if (description && description.trim()) {
    const parsed = parseDescription(description);
    config = {
      bpm: parsed.bpm,
      scale: parsed.scale,
      rootNote: parsed.root,
      energy: parsed.energy,
      waveA: parsed.instruments[0],
      waveB: parsed.instruments[1] || parsed.instruments[0],
      mood: parsed.mood,
      genreId: null,
    };
  } else {
    const genre = MUSIC_GENRES.find(g => g.id === genreId) || MUSIC_GENRES[0];
    const bpm = randInt(genre.bpmRange[0], genre.bpmRange[1]);
    const scaleName = pick(Object.keys(SCALES));
    const root = pick(ROOT_NOTES);
    const energy = genre.id === 'ambient' ? rand(0.2, 0.4) : genre.id === 'drill' || genre.id === 'edm' ? rand(0.7, 0.95) : rand(0.4, 0.75);
    const waveA = genre.id === 'rock' || genre.id === 'drill' ? 'sawtooth' : genre.id === 'synthwave' ? 'square' : pick(['sine', 'triangle']);
    const waveB = pick(['sine', 'triangle', 'sawtooth']);
    config = { bpm, scale: scaleName, rootNote: root, energy, waveA, waveB, mood: pick(['neutral', 'epic', 'romantic', 'dance', 'glitch']), genreId };
  }

  const { bpm, scale, rootNote, energy, waveA, waveB, mood } = config;
  const beatDur = 60 / bpm;
  const totalBeats = Math.min(Math.floor(durationSec / beatDur), 2000);
  const scaleNotes = scaleFreqs(rootNote, scale, 3);
  const bassNotes = scaleFreqs(rootNote * 0.5, scale, 2);

  const CHORD_PROGRESSIONS = [
    [0, 3, 4, 0], [0, 5, 3, 4], [0, 4, 5, 3], [0, 2, 4, 5],
    [0, 0, 3, 4], [0, 3, 5, 4], [5, 4, 0, 0], [0, 1, 4, 0],
  ];
  const progression = pick(CHORD_PROGRESSIONS);

  const GENRE_DRUMS = {
    lofi: (i) => ({ kick: [0,7].includes(i%16), snare: [4,12].includes(i%16), hh: i%2===0, hhOpen: i%16===6 }),
    edm: (i) => ({ kick: [0,4,8,12].includes(i%16), snare: [4,12].includes(i%16), hh: i%2===1 || i%4===0, hhOpen: i%8===6 }),
    ambient: (i) => ({ kick: chance(0.15), snare: chance(0.08), hh: chance(0.2), hhOpen: chance(0.05) }),
    rock: (i) => ({ kick: [0,6,8,14].includes(i%16), snare: [4,12].includes(i%16), hh: true, hhOpen: i%16===14 }),
    jazz: (i) => ({ kick: chance(0.25), snare: [6,14].includes(i%16), hh: i%2===0, hhOpen: chance(0.15) }),
    classical: (i) => ({ kick: false, snare: false, hh: false, hhOpen: false }),
    hiphop: (i) => ({ kick: [0,3,8,11].includes(i%16), snare: [4,12].includes(i%16), hh: i%2===0 || (i%4===2 && chance(0.7)), hhOpen: i%16===14 }),
    synthwave: (i) => ({ kick: [0,8].includes(i%16), snare: [4,12].includes(i%16), hh: i%2===1, hhOpen: false }),
    drill: (i) => ({ kick: [0,5,8,13].includes(i%16), snare: [4,12].includes(i%16), hh: i%4===0 || chance(0.5), hhOpen: i%16===6 }),
    pop: (i) => ({ kick: [0,6,8,14].includes(i%16), snare: [4,12].includes(i%16), hh: i%2===0, hhOpen: i%16===14 }),
  };
  const genreDrumFn = GENRE_DRUMS[config.genreId] || GENRE_DRUMS.pop;

  const drumPattern = [];
  for (let i = 0; i < 16; i++) {
    drumPattern.push(genreDrumFn(i));
  }

  const melodyPattern = [];
  const melodyLen = randInt(4, 8);
  for (let i = 0; i < melodyLen; i++) {
    melodyPattern.push({
      noteIdx: randInt(0, scaleNotes.length - 1),
      dur: pick([0.5, 0.5, 1, 1, 1.5, 2]),
      rest: chance(0.2),
      vel: rand(0.5, 1.0),
    });
  }

  const bassPattern = [];
  const bassLen = randInt(2, 4);
  for (let i = 0; i < bassLen; i++) {
    bassPattern.push({
      noteIdx: randInt(0, Math.min(3, bassNotes.length - 1)),
      dur: pick([0.5, 1, 1, 2]),
      vel: rand(0.4, 0.85),
    });
  }

  const padPattern = [];
  const padLen = randInt(2, 4);
  for (let i = 0; i < padLen; i++) {
    padPattern.push({
      chordIdx: progression[i % progression.length],
      dur: pick([2, 4, 8]),
      wave: pick(['sine', 'triangle']),
    });
  }

  for (let beat = 0; beat < totalBeats; beat++) {
    const t = beat * beatDur;
    const beatInBar = beat % 16;
    const bar = Math.floor(beat / 16);
    const chordIdx = progression[bar % progression.length];
    const chordRoot = scaleNotes[chordIdx];

    const drum = drumPattern[beatInBar];
    const intensity = energy * (0.8 + 0.2 * Math.sin(beat * 0.05));

    if (drum.kick) {
      try {
        const kick = offline.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(160 + rand(-10, 10), t);
        kick.frequency.exponentialRampToValueAtTime(35, t + 0.09);
        const kg = offline.createGain();
        kg.gain.setValueAtTime(vol * (0.5 + intensity * 0.3), t);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        kick.connect(kg).connect(offline.destination);
        kick.start(t);
        kick.stop(t + 0.18);
      } catch (e) {}
    }

    if (drum.snare) {
      try {
        const snLen = Math.floor(sr * rand(0.04, 0.07));
        const snBuf = offline.createBuffer(1, snLen, sr);
        const snD = snBuf.getChannelData(0);
        for (let j = 0; j < snLen; j++) snD[j] = (Math.random() * 2 - 1);
        const sn = offline.createBufferSource();
        sn.buffer = snBuf;
        const sg = offline.createGain();
        sg.gain.setValueAtTime(vol * (0.12 + intensity * 0.1), t);
        sg.gain.exponentialRampToValueAtTime(0.001, t + snLen / sr);
        const bp = offline.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = rand(2500, 4500);
        bp.Q.value = rand(1, 2.5);
        sn.connect(bp).connect(sg).connect(offline.destination);
        sn.start(t);
        sn.stop(t + snLen / sr);
      } catch (e) {}
    }

    if (drum.hh || drum.hhOpen) {
      try {
        const hhDur = drum.hhOpen ? rand(0.04, 0.08) : rand(0.015, 0.03);
        const hhLen = Math.floor(sr * hhDur);
        const hhBuf = offline.createBuffer(1, hhLen, sr);
        const hhD = hhBuf.getChannelData(0);
        for (let j = 0; j < hhLen; j++) hhD[j] = (Math.random() * 2 - 1);
        const hh = offline.createBufferSource();
        hh.buffer = hhBuf;
        const hg = offline.createGain();
        hg.gain.setValueAtTime(vol * rand(0.04, 0.09), t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + hhDur);
        const hp = offline.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = rand(6000, 10000);
        hh.connect(hp).connect(hg).connect(offline.destination);
        hh.start(t);
        hh.stop(t + hhDur);
      } catch (e) {}
    }

    if (beat % 4 === 0) {
      try {
        const bassPat = bassPattern[(beat / 4) % bassPattern.length];
        const bassFreq = bassNotes[bassPat.noteIdx];
        const bassDur = bassPat.dur * beatDur;
        const bass = offline.createOscillator();
        bass.type = energy > 0.6 ? 'sawtooth' : 'triangle';
        bass.frequency.setValueAtTime(bassFreq, t);
        if (chance(0.3)) bass.frequency.linearRampToValueAtTime(bassFreq * pick([0.5, 1.5, 2]), t + bassDur * 0.8);
        const bg = offline.createGain();
        bg.gain.setValueAtTime(vol * bassPat.vel * intensity, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + bassDur * 0.95);
        const lp = offline.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = rand(200, 500);
        bass.connect(lp).connect(bg).connect(offline.destination);
        bass.start(t);
        bass.stop(t + bassDur);
      } catch (e) {}
    }

    try {
      const melPat = melodyPattern[beat % melodyPattern.length];
      if (!melPat.rest && chance(energy * 0.8 + 0.2)) {
        const melFreq = scaleNotes[melPat.noteIdx] * pick([1, 1, 1, 2, 0.5]);
        const melDur = melPat.dur * beatDur;
        const mel = offline.createOscillator();
        mel.type = waveA;
        mel.frequency.setValueAtTime(melFreq, t);
        if (chance(0.4)) mel.frequency.linearRampToValueAtTime(melFreq * pick([1.05, 0.95, 1.1, 0.9]), t + melDur * 0.5);
        const mg = offline.createGain();
        mg.gain.setValueAtTime(0, t);
        mg.gain.linearRampToValueAtTime(vol * melPat.vel * 0.2 * intensity, t + 0.01);
        mg.gain.setValueAtTime(vol * melPat.vel * 0.2 * intensity, t + melDur * 0.6);
        mg.gain.linearRampToValueAtTime(0, t + melDur);
        mel.connect(mg).connect(offline.destination);
        mel.start(t);
        mel.stop(t + melDur + 0.01);
      }
    } catch (e) {}

    try {
      const melPat = melodyPattern[beat % melodyPattern.length];
      if (chance(energy * 0.4) && !melPat.rest) {
        const arpFreq = scaleNotes[(melPat.noteIdx + pick([2, 4, 5])) % scaleNotes.length];
        const arp = offline.createOscillator();
        arp.type = waveB;
        arp.frequency.value = arpFreq * pick([1, 2]);
        const ag = offline.createGain();
        ag.gain.setValueAtTime(0, t);
        ag.gain.linearRampToValueAtTime(vol * 0.08 * intensity, t + 0.005);
        ag.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.4);
        arp.connect(ag).connect(offline.destination);
        arp.start(t);
        arp.stop(t + beatDur * 0.4);
      }
    } catch (e) {}

    if (mood === 'epic' || mood === 'neutral' || mood === 'romantic') {
      const pat = padPattern[bar % padPattern.length];
      if (pat && beat % 4 === 0) {
        const chordFreq = scaleNotes[pat.chordIdx % scaleNotes.length];
        const padDurBeats = Math.max(pat.dur, 3);
        const padEnd = Math.min(t + padDurBeats * beatDur, durationSec);
        [1, 1.25, 1.5].forEach((mult) => {
          try {
            const pad = offline.createOscillator();
            pad.type = pat.wave;
            pad.frequency.value = chordFreq * mult;
            const pg = offline.createGain();
            pg.gain.setValueAtTime(0, t);
            pg.gain.linearRampToValueAtTime(vol * 0.06, t + beatDur * 0.5);
            pg.gain.setValueAtTime(vol * 0.06, padEnd - beatDur);
            pg.gain.linearRampToValueAtTime(0, padEnd);
            pad.connect(pg).connect(offline.destination);
            pad.start(t);
            pad.stop(padEnd + 0.01);
          } catch (e) {}
        });
      }
    }

    if (mood === 'glitch' && chance(0.08)) {
      try {
        const glLen = Math.floor(sr * rand(0.01, 0.05));
        const glBuf = offline.createBuffer(1, glLen, sr);
        const glD = glBuf.getChannelData(0);
        for (let j = 0; j < glLen; j++) glD[j] = (Math.random() * 2 - 1) * 0.3;
        const gl = offline.createBufferSource();
        gl.buffer = glBuf;
        const gg = offline.createGain();
        gg.gain.setValueAtTime(vol * 0.15, t);
        gg.gain.exponentialRampToValueAtTime(0.001, t + glLen / sr);
        gl.connect(gg).connect(offline.destination);
        gl.start(t);
        gl.stop(t + glLen / sr);
      } catch (e) {}
    }

    if (mood === 'dance' && beat % 2 === 0 && chance(0.3)) {
      try {
        const sq = offline.createOscillator();
        sq.type = 'square';
        sq.frequency.value = chordRoot * pick([1, 2, 4]);
        const sqg = offline.createGain();
        sqg.gain.setValueAtTime(vol * 0.06, t);
        sqg.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.15);
        const sqlp = offline.createBiquadFilter();
        sqlp.type = 'lowpass';
        sqlp.frequency.value = rand(800, 2000);
        sq.connect(sqlp).connect(sqg).connect(offline.destination);
        sq.start(t);
        sq.stop(t + beatDur * 0.15);
      } catch (e) {}
    }
  }

  if (chance(0.6)) {
    const fillBeat = totalBeats - randInt(4, 8);
    for (let i = 0; i < 8; i++) {
      const ft = (fillBeat + i * 0.5) * beatDur;
      if (ft < 0 || ft >= durationSec) continue;
      const fl = offline.createOscillator();
      fl.type = 'sine';
      fl.frequency.setValueAtTime(rand(200, 400), ft);
      fl.frequency.exponentialRampToValueAtTime(rand(80, 150), ft + 0.08);
      const fg = offline.createGain();
      fg.gain.setValueAtTime(vol * 0.3, ft);
      fg.gain.exponentialRampToValueAtTime(0.001, ft + 0.1);
      fl.connect(fg).connect(offline.destination);
      fl.start(ft);
      fl.stop(ft + 0.1);
    }
  }

  return offline.startRendering();
}

function bufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = Math.min(buffer.length, sr * 180);
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = len * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  const channels = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function TrackPlayer({ blob, name, onDownload }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const [waveform, setWaveform] = useState(null);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrent(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    });

    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    });

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const decoded = await actx.decodeAudioData(reader.result);
        const raw = decoded.getChannelData(0);
        const samples = 120;
        const step = Math.floor(raw.length / samples);
        const bars = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += Math.abs(raw[i * step + j] || 0);
          bars.push(sum / step);
        }
        const max = Math.max(...bars, 0.01);
        setWaveform(bars.map(b => b / max));
      } catch (e) { console.error(e); }
    };
    reader.readAsArrayBuffer(blob);

    return () => { audio.pause(); audio.src = ''; URL.revokeObjectURL(url); };
  }, [blob]);

  useEffect(() => {
    if (!canvasRef.current || !waveform) return;
    const ctx = canvasRef.current.getContext('2d');
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.clearRect(0, 0, w, h);

    const barW = w / waveform.length;
    const progressIdx = Math.floor((progress / 100) * waveform.length);

    waveform.forEach((val, i) => {
      const barH = val * h * 0.9;
      const x = i * barW;
      const y = (h - barH) / 2;

      if (i <= progressIdx) {
        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, '#a855f7');
        grad.addColorStop(1, '#ec4899');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
      }
      ctx.fillRect(x + 0.5, y, Math.max(barW - 1, 1), barH);
    });
  }, [waveform, progress]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:opacity-90 transition-all flex-shrink-0">
          {playing ? <Square size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-discord-white font-medium truncate">{name}</span>
            <span className="text-[10px] text-discord-muted ml-2">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="h-1.5 bg-discord-light/20 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = pct * duration;
            }}>
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {waveform && (
        <div className="bg-discord-darker/50 rounded-lg p-2">
          <canvas ref={canvasRef} width={360} height={48} className="w-full h-12" />
        </div>
      )}

      <button onClick={onDownload}
        className="w-full py-1.5 rounded-lg bg-discord-light/10 border border-discord-light/20 text-xs text-discord-white hover:bg-discord-light/20 transition-all flex items-center justify-center gap-1.5">
        <Download size={12} /> Скачать WAV
      </button>
    </div>
  );
}

function MusicGeneration({ user }) {
  const [activeSection, setActiveSection] = useState('tts');
  const [ttsText, setTtsText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('anna');
  const [generating, setGenerating] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('lofi');
  const [musicDuration, setMusicDuration] = useState(30);
  const [volume, setVolume] = useState(50);
  const [status, setStatus] = useState('');
  const [generatedTrack, setGeneratedTrack] = useState(null);
  const [trackName, setTrackName] = useState('');
  const [musicDescription, setMusicDescription] = useState('');

  const isPrivetPlus = user?.subscription === 'privet_plus' || user?.subscription === 'sosiska';
  const isPrivet = user?.subscription === 'privet' || isPrivetPlus;

  const handleTTS = useCallback(() => {
    if (!ttsText.trim() || generating) return;
    if (!('speechSynthesis' in window)) {
      setStatus('SpeechSynthesis не поддерживается в этом браузере');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    window.speechSynthesis.cancel();
    setGenerating(true);
    setStatus('Озвучиваю...');

    const voice = VOICE_PRESETS.find(v => v.id === selectedVoice) || VOICE_PRESETS[0];
    const utter = new SpeechSynthesisUtterance(ttsText);
    utter.lang = voice.lang;
    utter.rate = voice.rate;
    utter.pitch = voice.pitch;
    utter.volume = volume / 100;

    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find(v => v.lang.startsWith('ru') && v.name.toLowerCase().includes(voice.name.toLowerCase().split(' ')[0]));
    if (ruVoice) utter.voice = ruVoice;
    else {
      const anyRu = voices.find(v => v.lang.startsWith('ru'));
      if (anyRu) utter.voice = anyRu;
    }

    utter.onend = () => {
      setGenerating(false);
      setStatus('Готово!');
      setTimeout(() => setStatus(''), 2000);
    };
    utter.onerror = () => {
      setGenerating(false);
      setStatus('Ошибка озвучки');
      setTimeout(() => setStatus(''), 2000);
    };

    window.speechSynthesis.speak(utter);
  }, [ttsText, selectedVoice, generating, volume]);

  const handleGenerateMusic = useCallback(async (desc) => {
    if (generating) return;
    const maxDur = isPrivetPlus ? 180 : 30;
    if (musicDuration > maxDur) {
      setStatus(`Макс. ${maxDur}с для вашей подписки`);
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    setGenerating(true);
    setGeneratedTrack(null);
    const useDesc = desc || (activeSection === 'describe' ? musicDescription : '');
    setStatus(`Генерирую трек (${musicDuration}с)...`);

    try {
      if (typeof OfflineAudioContext === 'undefined') {
        throw new Error('OfflineAudioContext не поддерживается этим браузером');
      }
      const audioBuffer = await renderMusicOffline(selectedGenre, musicDuration, useDesc);
      if (!audioBuffer || audioBuffer.length === 0) throw new Error('Пустой аудиобуфер');
      const blob = bufferToWav(audioBuffer);
      if (!blob || blob.size === 0) throw new Error('Ошибка конвертации WAV');
      const genreName = useDesc ? 'По описанию' : (MUSIC_GENRES.find(g => g.id === selectedGenre)?.name || selectedGenre);
      const name = useDesc ? `${useDesc.slice(0, 30)} — ${musicDuration}с` : `${genreName} — ${musicDuration}с`;
      setGeneratedTrack(blob);
      setTrackName(name);
      setStatus('Трек готов! Можно прослушать и скачать.');
    } catch (err) {
      console.error('Music generation error:', err);
      setStatus('Ошибка: ' + (err.message || err.toString() || 'неизвестная ошибка'));
    } finally {
      setGenerating(false);
      setTimeout(() => setStatus(''), 4000);
    }
  }, [selectedGenre, musicDuration, generating, isPrivetPlus, musicDescription, activeSection]);

  const handleDownload = useCallback(() => {
    if (!generatedTrack) return;
    const url = URL.createObjectURL(generatedTrack);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trackName.replace(/[^a-zA-Zа-яА-ЯёЁ0-9 ]/g, '_')}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedTrack, trackName]);

  if (!isPrivet) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-discord-white font-bold mb-1">Доступно по подписке</p>
        <p className="text-discord-muted text-sm">Купите Privet или выше для доступа к нейросети</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-discord-dark/50 rounded-xl p-3 border border-discord-light/10">
        <Volume2 size={14} className="text-discord-muted" />
        <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none bg-discord-light/20 accent-purple-500" />
        <span className="text-xs text-discord-muted w-10 text-right">{volume}%</span>
      </div>

      <div className="flex gap-1 bg-discord-dark border border-discord-light/20 rounded-xl p-1">
        <button onClick={() => setActiveSection('tts')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === 'tts' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20'}`}>
          🗣️ Озвучка
        </button>
        <button onClick={() => setActiveSection('music')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === 'music' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20'}`}>
          🎵 Жанр
        </button>
        <button onClick={() => setActiveSection('describe')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === 'describe' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20'}`}>
          ✨ По описанию
        </button>
      </div>

      {activeSection === 'tts' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-discord-muted mb-1.5 block">Голос</label>
            <div className="grid grid-cols-3 gap-1.5">
              {VOICE_PRESETS.map(v => (
                <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all text-left ${
                    selectedVoice === v.id ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-discord-dark/50 border-discord-light/10 hover:border-green-500/30 text-discord-white'
                  }`}>
                  <span className="text-base">{v.icon}</span>
                  <span className="text-xs font-medium truncate">{v.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-discord-muted mb-1.5 block">Текст для озвучки</label>
            <textarea value={ttsText} onChange={e => setTtsText(e.target.value)} rows={3}
              placeholder="Привет, как дела? Расскажи мне что-нибудь интересное."
              className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-green-500/50 resize-none transition-colors" />
          </div>
          <button onClick={handleTTS} disabled={generating || !ttsText.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Озвучиваю...</> : <><Play size={16} />Озвучить</>}
          </button>
        </div>
      )}

      {activeSection === 'music' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-discord-muted mb-1.5 block">Жанр</label>
            <div className="grid grid-cols-5 gap-1.5">
              {MUSIC_GENRES.map(g => (
                <button key={g.id} onClick={() => setSelectedGenre(g.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all ${
                    selectedGenre === g.id ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-discord-dark/50 border-discord-light/10 hover:border-purple-500/30 text-discord-white'
                  }`}>
                  <span className="text-lg">{g.icon}</span>
                  <span className="text-[10px] font-medium">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-discord-muted mb-1.5 block">
              Длительность: {musicDuration}с
              {!isPrivetPlus && <span className="text-yellow-400 ml-1">(Privet: макс. 30с)</span>}
            </label>
            <input type="range" min="5" max={isPrivetPlus ? 180 : 30} step="5"
              value={musicDuration} onChange={e => setMusicDuration(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-discord-light/20 accent-purple-500" />
            <div className="flex justify-between text-[10px] text-discord-muted mt-0.5">
              <span>5с</span>
              <span>{isPrivetPlus ? '3 мин' : '30с'}</span>
            </div>
          </div>
          <button onClick={() => handleGenerateMusic()} disabled={generating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Генерирую...</> : <><Music size={16} />Сгенерировать трек</>}
          </button>
        </div>
      )}

      {activeSection === 'describe' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-discord-muted mb-1.5 block">Опишите музыку которую хотите получить</label>
            <textarea value={musicDescription} onChange={e => setMusicDescription(e.target.value)} rows={4}
              placeholder="Тёмный трек в стиле дрилл с агрессивным басом и быстрыми хай-хатами...&#10;Или: весёлый ло-фай для учёбы с джазовыми аккордами...&#10;Или: эпическая оркестровая композиция для битвы"
              className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-amber-500/50 resize-none transition-colors" />
          </div>
          <div>
            <label className="text-xs text-discord-muted mb-1.5 block">
              Длительность: {musicDuration}с
              {!isPrivetPlus && <span className="text-yellow-400 ml-1">(Privet: макс. 30с)</span>}
            </label>
            <input type="range" min="5" max={isPrivetPlus ? 180 : 30} step="5"
              value={musicDuration} onChange={e => setMusicDuration(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-discord-light/20 accent-amber-500" />
            <div className="flex justify-between text-[10px] text-discord-muted mt-0.5">
              <span>5с</span>
              <span>{isPrivetPlus ? '3 мин' : '30с'}</span>
            </div>
          </div>
          <div className="bg-discord-dark/30 rounded-xl p-2.5 border border-discord-light/10">
            <p className="text-[10px] text-discord-muted">
              Нейросеть анализирует описание и подбирает BPM, тональность, инструменты и настроение. Примеры: «тёмный дрилл», «летний поп», «космический эмбиент», «эпичный оркестр»
            </p>
          </div>
          <button onClick={() => handleGenerateMusic(musicDescription)} disabled={generating || !musicDescription.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Генерирую...</> : <><Sparkles size={16} />Сгенерировать по описанию</>}
          </button>
        </div>
      )}

      {status && (
        <div className={`px-3 py-2 rounded-xl text-xs text-center font-medium ${
          status.includes('Ошибка') || status.includes('Макс') ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : status.includes('Готово') || status.includes('готов') ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
        }`}>{status}</div>
      )}

      {generatedTrack && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-discord-muted block">Сгенерированный трек</label>
            <button onClick={() => handleGenerateMusic(activeSection === 'describe' ? musicDescription : '')} disabled={generating}
              className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
              🔄 Другой вариант
            </button>
          </div>
          <TrackPlayer blob={generatedTrack} name={trackName} onDownload={handleDownload} />
        </div>
      )}

      {isPrivetPlus && (
        <div className="bg-discord-dark/30 rounded-xl p-3 border border-discord-light/10">
          <p className="text-[10px] text-discord-muted text-center">
            Privet Plus: генерация музыки до 3 минут, все жанры
          </p>
        </div>
      )}
      {!isPrivetPlus && isPrivet && (
        <div className="bg-discord-dark/30 rounded-xl p-3 border border-discord-light/10">
          <p className="text-[10px] text-discord-muted text-center">
            Privet: музыка до 30 сек. Купите Privet Plus для треков до 3 мин!
          </p>
        </div>
      )}
    </div>
  );
}

export default function GenerateTab({ user }) {
  const [activeTab, setActiveTab] = useState('image');
  const [showChat, setShowChat] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);

  useEffect(() => {
    apiGet('/api/ai-chats').then(list => {
      setChats(list.map(c => ({ ...c, messages: [] })));
      setChatsLoaded(true);
    }).catch(() => setChatsLoaded(true));
  }, []);

  const loadChatMessages = async (chatId) => {
    try {
      const msgs = await apiGet(`/api/ai-chats/${chatId}/messages`);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: msgs } : c));
    } catch (e) { console.error(e); }
  };

  const createChat = async () => {
    try {
      const res = await apiPost('/api/ai-chats', { title: 'Новый чат' });
      setChats(prev => [{ id: res.id, title: 'Новый чат', messages: [], created_at: res.created_at }, ...prev]);
      return res.id;
    } catch (e) { console.error(e); return null; }
  };

  const deleteChat = async (chatId) => {
    try {
      await apiDelete(`/api/ai-chats/${chatId}`);
      setChats(prev => prev.filter(c => c.id !== chatId));
    } catch (e) { console.error(e); }
  };

  const saveMessage = async (chatId, msg) => {
    try {
      await apiPost(`/api/ai-chats/${chatId}/messages`, msg);
    } catch (e) { console.error(e); }
  };

  const updateChatTitle = async (chatId, title) => {
    try {
      await apiPut(`/api/ai-chats/${chatId}`, { title });
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title } : c));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      {showChat && <FullScreenChat
        onClose={() => setShowChat(false)}
        chats={chats}
        setChats={setChats}
        loadChatMessages={loadChatMessages}
        createChat={createChat}
        deleteChat={deleteChat}
        saveMessage={saveMessage}
        updateChatTitle={updateChatTitle}
      />}
      <div className="flex gap-1 bg-discord-dark border border-discord-light/20 rounded-xl p-1">
        <button onClick={() => setActiveTab('image')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'image' ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20'}`}>
          <ImageIcon size={16} />Изображения
        </button>
        <button onClick={() => setActiveTab('text')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'text' ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20'}`}>
          <MessageSquareText size={16} />Текст
        </button>
        <button onClick={() => setActiveTab('sound')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'sound' ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20'}`}>
          <Music size={16} />Звук
        </button>
      </div>
      {activeTab === 'image' && <ImageGeneration />}
      {activeTab === 'text' && <TextGeneration onOpenChat={() => setShowChat(true)} />}
      {activeTab === 'sound' && <MusicGeneration user={user} />}
    </div>
  );
}
