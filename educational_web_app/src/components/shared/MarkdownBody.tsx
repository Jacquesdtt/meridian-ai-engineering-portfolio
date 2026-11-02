import type { ReactNode } from 'react';

/** Lightweight markdown renderer for bundled ADR text (headings, lists, code, emphasis). */
export function MarkdownBody({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  return <article className="prose-adr space-y-3 text-sm leading-relaxed text-slate-300">{blocks}</article>;
}

function parseMarkdown(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const fence = line;
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(
        <pre
          key={key++}
          className="bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-xs font-mono text-slate-400"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, '');
      const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
      const cls =
        level === 1
          ? 'text-lg font-bold text-slate-100 mt-4 first:mt-0'
          : level === 2
            ? 'text-base font-semibold text-slate-200 mt-3'
            : 'text-sm font-semibold text-slate-300 mt-2';
      out.push(
        <Tag key={key++} className={cls}>
          {inlineFormat(text)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && (/^[-*]\s/.test(lines[i]) || /^\d+\.\s/.test(lines[i]))) {
        const itemText = lines[i].replace(/^[-*]\s|^\d+\.\s/, '');
        items.push(
          <li key={items.length} className="ml-4 list-disc marker:text-slate-600">
            {inlineFormat(itemText)}
          </li>,
        );
        i += 1;
      }
      out.push(
        <ul key={key++} className="space-y-1">
          {items}
        </ul>,
      );
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const paraLines: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,3}\s/.test(lines[i]) && !/^[-*]\s/.test(lines[i]) && !lines[i].startsWith('```')) {
      paraLines.push(lines[i]);
      i += 1;
    }
    out.push(
      <p key={key++} className="text-slate-300">
        {inlineFormat(paraLines.join(' '))}
      </p>,
    );
  }

  return out;
}

function inlineFormat(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="font-mono text-emerald-300/90 bg-slate-800/60 px-1 rounded text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-200">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
