import { useState } from 'react';

const PRESETS = [
  { key: 'all', label: 'Sve' },
  { key: 'saved', label: 'Sačuvano' },
  { key: 'books', label: 'Samo knjige' },
  { key: 'quizzes', label: 'Samo kvizovi' },
];

export default function FilterSheet({ categories, initial, onApply, onClose }) {
  const [selected, setSelected] = useState(new Set(initial.categories));
  const [filter, setFilter] = useState(initial.filter || 'all');

  function toggleCat(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <h3>Prikaži</h3>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button key={p.key} className={`preset${filter === p.key ? ' on' : ''}`} onClick={() => setFilter(p.key)}>
              {p.label}
            </button>
          ))}
        </div>

        <h3>Kategorije (izaberi jednu ili više)</h3>
        {categories.map((cat) => (
          <label key={cat.id} className="cat-check">
            <span className="dot" style={{ background: cat.color }} />
            <span className="cc-label">
              {cat.icon} {cat.label}
            </span>
            <span className="count">{cat.cardCount ?? 0}</span>
            <input type="checkbox" checked={selected.has(cat.id)} onChange={() => toggleCat(cat.id)} />
          </label>
        ))}

        <button
          className="sheet-apply"
          onClick={() => onApply({ categories: [...selected], filter })}
        >
          Primeni
        </button>
      </div>
    </div>
  );
}
