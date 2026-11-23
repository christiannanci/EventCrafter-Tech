import React from 'react';

// Markdown minimal des articles : **gras**, *italique*, puces « - » (2 espaces = sous-niveau),
// et une ligne uniquement en **gras** = petit intertitre. Aucun HTML brut n'est injecté.

function renderInline(text, keyPrefix = 'i') {
  const out = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={`${keyPrefix}${k++}`}>{m[1]}</strong>);
    else out.push(<em key={`${keyPrefix}${k++}`}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parse(src) {
  const blocks = [];
  let list = null;
  for (const raw of src.split('\n')) {
    if (!raw.trim()) continue;
    const b = raw.match(/^(\s*)- (.*)$/);
    if (b) {
      const level = Math.floor(b[1].length / 2);
      if (!list) { list = { type: 'list', items: [] }; blocks.push(list); }
      list.items.push({ level, text: b[2] });
      continue;
    }
    list = null;
    const sh = raw.trim().match(/^\*\*([^*]+)\*\*$/);
    blocks.push(sh ? { type: 'h', text: sh[1] } : { type: 'p', text: raw.trim() });
  }
  return blocks;
}

// Transforme une liste plate (niveaux) en arbre de <ul> imbriqués.
function renderList(items, key) {
  const build = (start, level) => {
    const nodes = [];
    let i = start;
    while (i < items.length && items[i].level >= level) {
      if (items[i].level === level) {
        const li = { text: items[i].text, children: null };
        i++;
        if (i < items.length && items[i].level > level) {
          const sub = build(i, level + 1);
          li.children = sub.nodes;
          i = sub.next;
        }
        nodes.push(li);
      } else {
        // niveau sauté : on le traite comme un enfant direct
        const sub = build(i, items[i].level);
        nodes.push({ text: '', children: sub.nodes });
        i = sub.next;
      }
    }
    return { nodes, next: i };
  };
  const toEl = (nodes, k, depth) => (
    <ul key={k} className={`list-disc pl-6 space-y-1.5 ${depth ? 'mt-1.5' : 'my-3'}`}>
      {nodes.map((n, idx) => (
        <li key={idx}>
          {renderInline(n.text, `${k}-${idx}-`)}
          {n.children && toEl(n.children, `${k}-${idx}`, depth + 1)}
        </li>
      ))}
    </ul>
  );
  const base = items.length ? Math.min(...items.map((x) => x.level)) : 0;
  return toEl(build(0, base).nodes, key, 0);
}

export default function ArticleMarkdown({ src = '' }) {
  return (
    <>
      {parse(src).map((b, i) => {
        if (b.type === 'h') return <h3 key={i} className="font-semibold text-lg mt-5 mb-1" style={{ fontFamily: 'Lora, serif' }}>{b.text}</h3>;
        if (b.type === 'list') return renderList(b.items, `l${i}`);
        return <p key={i} className="my-3 leading-relaxed">{renderInline(b.text, `p${i}-`)}</p>;
      })}
    </>
  );
}

export { renderInline };
