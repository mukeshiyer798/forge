import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { JSON_TEMPLATE } from '@/lib/data';

function syntaxHighlight(json: string): string {
  return json
    .replace(/("[\w_]+")\s*:/g, '<span class="text-blue-400">$1</span>:')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="text-green-400">$1</span>')
    .replace(/:\s*(\d+)/g, ': <span class="text-orange-400">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400">$1</span>');
}

export default function JSONTemplate() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = JSON.stringify(JSON_TEMPLATE, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const raw = JSON.stringify(JSON_TEMPLATE, null, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-forge-surface border border-forge-border overflow-hidden"
    >
      {/* Header */}
      <div className="bg-forge-surface2 px-6 py-4 border-b border-forge-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-condensed font-black text-lg uppercase tracking-wider text-forge-text">
            {'{ }'} Learning Plan Template
          </span>
          <span className="bg-forge-amber text-forge-bg font-mono text-[11px] uppercase tracking-widest px-2 py-0.5">
            Paste into any AI assistant
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-all duration-200 ${
            copied
              ? 'border-green-500 text-green-400'
              : 'border-forge-border text-forge-dim hover:border-forge-amber hover:text-forge-amber'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy template'}
        </button>
      </div>

      {/* Instructions banner */}
      <div className="px-6 py-3 bg-amber-950/20 border-b border-amber-900/20">
        <p className="font-mono text-[11px] text-amber-400/80 leading-relaxed">
          📋 Copy this → Paste into your AI assistant → Say:{' '}
          <span className="text-amber-400 font-semibold">
            "Fill this learning plan for [YOUR TOPIC] replacing all placeholders with detailed, actionable content."
          </span>
        </p>
      </div>

      {/* Code block */}
      <div className="relative">
        <div className="flex gap-0">
          {/* Line numbers */}
          <div className="px-4 py-5 bg-forge-bg/50 border-r border-forge-border select-none">
            {raw.split('\n').map((_, i) => (
              <div key={i} className="font-mono text-[11px] text-forge-muted leading-[1.7] text-right min-w-[28px]">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code */}
          <pre
            className="flex-1 px-5 py-5 font-mono text-[11px] leading-[1.7] text-forge-dim overflow-x-auto max-h-[420px] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(raw) }}
          />
        </div>
      </div>
    </motion.div>
  );
}
