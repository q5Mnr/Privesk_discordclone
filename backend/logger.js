const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, 'logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function ts() {
  return new Date().toISOString();
}

function info(event, details) {
  console.log(`[${ts()}] [INFO]  ${event} | ${details || ''}`);
}

function warn(event, details) {
  console.log(`[${ts()}] [WARN]  ${event} | ${details || ''}`);
}

function error(event, details, meta) {
  const line = `[${ts()}] [ERROR] ${event} | ${details || ''}`;
  console.error(line);
  if (meta?.stack) console.error(meta.stack);

  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `errors_${today}.txt`);
    const fileLine = `[${ts()}] ERROR | ${event} | ${details || ''}` +
      (meta?.user ? ` | user:${meta.user}` : '') +
      (meta?.stack ? `\n  Stack: ${meta.stack}` : '') + '\n';
    fs.appendFileSync(logFile, fileLine, 'utf8');
  } catch (e) {
    console.error(`[Logger] Failed to write error log: ${e.message}`);
  }
}

module.exports = { info, warn, error };
