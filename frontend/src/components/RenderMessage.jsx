import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lang = (language || '').trim() || 'text';

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-discord-light/20">
      <div className="flex items-center justify-between px-3 py-1.5 bg-discord-dark border-b border-discord-light/20">
        <span className="text-xs text-discord-muted font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-discord-muted hover:text-discord-white transition-colors"
        >
          {copied ? <><Check size={12} /> Скопировано</> : <><Copy size={12} /> Копировать</>}
        </button>
      </div>
      <pre className="p-3 bg-[#11111b] overflow-x-auto text-sm">
        <code className="text-[#cdd6f4] font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

export default function RenderMessage({ text }) {
  if (!text) return null;

  const parts = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1], content: match[2].trimEnd() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return (
    <div className="space-y-0">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          return <CodeBlock key={i} language={part.language} code={part.content} />;
        }
        return <span key={i} className="whitespace-pre-wrap">{part.content}</span>;
      })}
    </div>
  );
}
