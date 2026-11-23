import React from 'react';
import { renderInline } from '@/components/articles/ArticleMarkdown';
import { ASSETS } from '@/config/recruitment';

// Section « Idées visuelles » : planche d'inspiration. Chaque puce devient une vignette légendée,
// sur le motif de la rubrique (tradition, food, decor, attire, ceremony).
// Une photo libre de droits pourra remplacer le motif plus tard ; la légende reste toujours.
export const isVisualSection = (s) => s.label === 'Visual Inspiration' || s.label === 'Idées visuelles';

export function visualItems(content = '') {
  return content.split('\n').filter((l) => l.trim().startsWith('- ')).map((l) => l.replace(/^\s*- /, ''));
}

export default function VisualBoard({ content, category, color }) {
  const items = visualItems(content);
  const pattern = `${ASSETS}/images/patterns/${String(category || 'tradition').toLowerCase()}.png`;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-4" data-testid="visual-board">
      {items.map((x, j) => (
        <div
          key={j}
          className={`relative overflow-hidden rounded-2xl p-4 flex flex-col justify-end text-white ${j === 0 ? 'col-span-2 min-h-[200px]' : 'min-h-[150px]'}`}
          style={{ background: j % 2 ? color : `color-mix(in srgb, ${color} 78%, #000)` }}
        >
          <div
            className="absolute inset-0 opacity-35"
            style={{ backgroundImage: `url(${pattern})`, backgroundSize: '300px 300px', opacity: 0.35 }}
            aria-hidden="true"
          />
          <span className="relative text-sm leading-snug font-medium" style={{ textShadow: '0 1px 8px rgba(0,0,0,.35)' }}>
            {renderInline(x, `v${j}-`)}
          </span>
        </div>
      ))}
    </div>
  );
}
