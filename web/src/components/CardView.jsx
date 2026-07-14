import { useState, useRef } from 'react';
import { categoryGlow } from './hexUtil.js';
import ActionRail from './ActionRail.jsx';
import QuizCard from './QuizCard.jsx';

export default function CardView({ card, saved, onSave, onUnsave, onQuizAnswer, onToast }) {
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);
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

  function onDoubleTapArea() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!saved) onSave(card.id);
      showBurst();
    }
    lastTap.current = now;
  }

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

  return (
    <article className="card" onClick={onDoubleTapArea}>
      <div className="bg-glow" style={categoryGlow(color)} />
      <div className="spine" style={{ background: `linear-gradient(180deg, ${color}, ${color}99)` }} />

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

      <ActionRail card={card} saved={saved} onSave={toggleSave} onShare={share} onSource={showSource} />
      {burst && (
        <div className="heart-burst">
          <span>❤️</span>
        </div>
      )}
    </article>
  );
}
