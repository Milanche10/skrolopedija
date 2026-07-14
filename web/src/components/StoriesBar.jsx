import { rgba } from './hexUtil.js';

export default function StoriesBar({ categories, selected, onToggle, onClear }) {
  const single = selected.length === 1 ? selected[0] : null;
  return (
    <div className="stories" role="tablist" aria-label="Kategorije">
      <button className={`story${selected.length === 0 ? ' active' : ''}`} onClick={onClear}>
        <span
          className="ring"
          style={{ background: 'conic-gradient(from 210deg, #8b5cf6, #ec4899, #f59e0b, #8b5cf6)' }}
        >
          <span className="inner">✨</span>
        </span>
        <span className="label">Sve</span>
      </button>
      {categories.map((cat) => {
        const active = single === cat.id;
        const dim = selected.length > 0 && !selected.includes(cat.id);
        const ring = active
          ? cat.color
          : `conic-gradient(from 210deg, ${cat.color}, ${rgba(cat.color, 0.35)}, ${cat.color})`;
        return (
          <button key={cat.id} className={`story${active ? ' active' : ''}`} onClick={() => onToggle(cat.id)}>
            <span className={`ring${dim ? ' dim' : ''}`} style={{ background: ring }}>
              <span className="inner">{cat.icon}</span>
            </span>
            <span className="label">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
