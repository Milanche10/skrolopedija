import { useState, useRef } from 'react';
import { categoryGlow } from './hexUtil.js';
import ActionRail from './ActionRail.jsx';
import QuizCard from './QuizCard.jsx';

const SWIPE_THRESHOLD = 90;

export default function CardView({ card, saved, onSave, onUnsave, onQuizAnswer, onSignal, onToast }) {
  const [burst, setBurst] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lastTap = useRef(0);
  const touch = useRef(null);
  const swiped = useRef(false);
  const color = card.category?.color || '#8b5cf6';

  function toggleSave() {
    if (saved) onUnsave(card.id);
    else {
      onSave(card.id);
      showBurst();
    }
  }

  function showBurst() {
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  }

  function signal(kind) {
    onSignal?.(kind);
    onToast(kind === 'know' ? '✓ Znaš — manje ovakvih' : '🤔 Zapamćeno — više ovakvih', 1600);
  }

  function onDoubleTapArea() {
    if (swiped.current) return; // swipe nije dupli-tap
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!saved) onSave(card.id);
      showBurst();
    }
    lastTap.current = now;
  }

  // horizontalni swipe: desno = "znam", levo = "ne razumem"
  function onTouchStart(e) {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swiped.current = false;
  }
  function onTouchMove(e) {
    if (!touch.current) return;
    const dx = e.touches[0].clientX - touch.current.x;
    const dy = e.touches[0].clientY - touch.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setDragging(true);
      setDragX(Math.max(-160, Math.min(160, dx)));
    }
  }
  function onTouchEnd() {
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      swiped.current = true;
      signal(dragX > 0 ? 'know' : 'dont_know');
    }
    setDragging(false);
    setDragX(0);
    touch.current = null;
  }

  const hint = dragX > 40 ? 'know' : dragX < -40 ? 'dont_know' : null;

  return (
    <article
      className="card"
      onClick={onDoubleTapArea}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: dragX ? `translateX(${dragX}px) rotate(${dragX * 0.02}deg)` : undefined, transition: dragging ? 'none' : 'transform 0.3s var(--ease-out)' }}
    >
      <div className="bg-glow" style={categoryGlow(color)} />
      <div className="spine" style={{ background: `linear-gradient(180deg, ${color}, ${color}99)` }} />

      {hint && <div className={`swipe-hint ${hint}`}>{hint === 'know' ? '✓ Znam' : '🤔 Ne razumem'}</div>}

      {card.type === 'quiz' ? (
        <QuizCard card={card} onAnswer={(ok) => onQuizAnswer(card.id, ok)} />
      ) : (
        <>
          <span className="kicker">
            {card.category?.icon} {card.category?.label}
            {card.type === 'fact' && ' · Zanimljivost'}
            {card.book && ' · 📖'}
          </span>
          <h1>{card.title}</h1>
          <p className="body">{card.text}</p>
          {(card.sourceRef || card.book) && (
            <div className="source">
              {card.book ? `📖 ${card.book.title}` : card.source === 'web' ? '🌐 Wikipedia' : ''}
              {card.sourceRef ? ` · ${card.sourceRef}` : ''}
            </div>
          )}
        </>
      )}

      {/* Znam / Ne razumem — radi i na desktopu (klik), na telefonu i swipe */}
      {card.type !== 'quiz' && onSignal && (
        <div className="know-bar" onClick={(e) => e.stopPropagation()}>
          <button className="know-btn dont" onClick={() => signal('dont_know')}>
            🤔 Ne razumem
          </button>
          <button className="know-btn know" onClick={() => signal('know')}>
            Znam ✓
          </button>
        </div>
      )}

      <ActionRail card={card} saved={saved} onSave={toggleSave} onShare={share} onSource={showSource} />
      {burst && (
        <div className="heart-burst">
          <span>❤️</span>
        </div>
      )}
    </article>
  );

  async function share() {
    const shareText = card.type === 'quiz' ? card.quiz?.q : `${card.title}\n\n${card.text}`;
    const payload = { title: card.title, text: `${shareText}\n\n— Skrolopedija` };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(payload.text);
        onToast('Tekst kartice kopiran 📋');
      }
    } catch {
      /* korisnik otkazao deljenje */
    }
  }

  function showSource() {
    const ref = card.sourceRef || (card.book ? card.book.title : '');
    const bookName = card.book?.title ? `Knjiga: ${card.book.title}${card.book.author ? `, ${card.book.author}` : ''}\n` : '';
    onToast(`${bookName}${ref}`, 4000);
  }
}
