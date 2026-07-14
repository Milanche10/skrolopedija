export default function ActionRail({ card, saved, onSave, onShare, onSource }) {
  return (
    <div className="rail">
      <button onClick={onSave} aria-label="Sačuvaj">
        <span className={`icon${saved ? ' on' : ''}`}>{saved ? '❤️' : '🤍'}</span>
        <span>{saved ? 'Sačuvano' : 'Sačuvaj'}</span>
      </button>
      <button onClick={onShare} aria-label="Podeli">
        <span className="icon">📤</span>
        <span>Podeli</span>
      </button>
      {(card.sourceRef || card.book) && (
        <button onClick={onSource} aria-label="Izvor">
          <span className="icon">ℹ️</span>
          <span>Izvor</span>
        </button>
      )}
    </div>
  );
}
