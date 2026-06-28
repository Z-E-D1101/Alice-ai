import React from 'react';

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
}

export function highlight(code: string, language: string = 'javascript'): string {
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  if (!code) return '';

  const lang = language.toLowerCase();

  // For JSON
  if (lang === 'json') {
    const escaped = escapeHtml(code);
    return escaped
      .replace(/&quot;(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\&quot;])*&quot;(\s*:)?/g, (match) => {
        if (match.endsWith(':')) {
          return `<span class="text-amber-400 font-semibold font-mono">${match.slice(0, -1)}</span><span class="text-stone-500 font-mono">:</span>`;
        }
        return `<span class="text-orange-300 font-mono">${match}</span>`;
      })
      .replace(/\b(true|false|null)\b/g, '<span class="text-amber-600 font-bold font-mono">$1</span>')
      .replace(/\b(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)\b/g, '<span class="text-yellow-500 font-mono">$1</span>');
  }

  // Keywords
  const keywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'import', 'export', 'from',
    'class', 'extends', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
    'default', 'try', 'catch', 'finally', 'async', 'await', 'true', 'false',
    'null', 'undefined', 'this', 'new', 'typeof', 'instanceof', 'in', 'of',
    'interface', 'type', 'as', 'any', 'string', 'number', 'boolean', 'void',
    'package', 'public', 'private', 'protected', 'static', 'def', 'self',
    'and', 'or', 'not', 'elif'
  ]);

  const cssKeywords = new Set([
    '@import', '@media', '@keyframes', '@theme', 'font-sans', 'font-mono'
  ]);

  let i = 0;
  const tokens: { type: string; value: string }[] = [];
  const len = code.length;

  while (i < len) {
    // 1. Line comment or Multi-line comment or Bash comment
    if (code[i] === '/' && code[i + 1] === '/') {
      let val = '';
      while (i < len && code[i] !== '\n') {
        val += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: val });
      continue;
    }

    if (code[i] === '/' && code[i + 1] === '*') {
      let val = '/*';
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        val += code[i];
        i++;
      }
      if (i < len) {
        val += '*/';
        i += 2;
      }
      tokens.push({ type: 'comment', value: val });
      continue;
    }

    if (code[i] === '#' && (lang === 'bash' || lang === 'shell' || lang === 'python' || lang === 'yaml' || lang === 'yml')) {
      let val = '';
      while (i < len && code[i] !== '\n') {
        val += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: val });
      continue;
    }

    // 2. Strings: '...', "...", `...`
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      let val = quote;
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < len) {
          val += '\\' + code[i + 1];
          i += 2;
        } else {
          val += code[i];
          i++;
        }
      }
      if (i < len) {
        val += quote;
        i++;
      }
      tokens.push({ type: 'string', value: val });
      continue;
    }

    // 3. Numbers
    if (/\d/.test(code[i])) {
      let val = '';
      while (i < len && /[\d.]/.test(code[i])) {
        val += code[i];
        i++;
      }
      tokens.push({ type: 'number', value: val });
      continue;
    }

    // 4. Identifiers, functions, keywords
    if (/[a-zA-Z_$]/.test(code[i])) {
      let val = '';
      while (i < len && /[a-zA-Z0-9_$]/.test(code[i])) {
        val += code[i];
        i++;
      }
      
      if (keywords.has(val) || (lang === 'css' && cssKeywords.has(val))) {
        tokens.push({ type: 'keyword', value: val });
      } else if (code[i] === '(') {
        tokens.push({ type: 'function', value: val });
      } else if (val[0] === val[0].toUpperCase() && val[0] !== '_') {
        tokens.push({ type: 'class', value: val });
      } else {
        tokens.push({ type: 'text', value: val });
      }
      continue;
    }

    // 5. Operators
    if (/[-+*/%=<>!&|^~]/.test(code[i])) {
      tokens.push({ type: 'operator', value: code[i] });
      i++;
      continue;
    }

    // 6. Punctuation
    if (/[{}()[\].,:;]/.test(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }

    // 7. Anything else
    tokens.push({ type: 'text', value: code[i] });
    i++;
  }

  return tokens.map(token => {
    const escaped = escapeHtml(token.value);
    switch (token.type) {
      case 'comment':
        return `<span class="text-stone-500 italic font-normal font-mono">${escaped}</span>`;
      case 'string':
        return `<span class="text-orange-300 font-normal font-mono">${escaped}</span>`;
      case 'keyword':
        return `<span class="text-[#ea580c] font-bold font-mono">${escaped}</span>`;
      case 'number':
        return `<span class="text-amber-500 font-medium font-mono">${escaped}</span>`;
      case 'function':
        return `<span class="text-yellow-400 font-semibold font-mono">${escaped}</span>`;
      case 'class':
        return `<span class="text-amber-300 font-semibold font-mono">${escaped}</span>`;
      case 'operator':
        return `<span class="text-amber-500/80 font-semibold font-mono">${escaped}</span>`;
      case 'punctuation':
        return `<span class="text-stone-400 font-mono">${escaped}</span>`;
      default:
        return `<span class="font-mono text-amber-100">${escaped}</span>`;
    }
  }).join('');
}

export function SyntaxHighlighter({ code, language = 'javascript' }: SyntaxHighlighterProps) {
  const highlightedHtml = highlight(code, language);

  return (
    <pre className="p-3.5 bg-[#100b08] rounded-xl border border-[#2d231d] overflow-x-auto text-xs font-mono max-w-full custom-scrollbar my-3">
      <code 
        className="font-mono"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }} 
      />
    </pre>
  );
}
