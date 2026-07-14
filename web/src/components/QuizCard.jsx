import { useState } from 'react';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizCard({ card, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const quiz = card.quiz || {};
  const answered = picked !== null;

  function choose(i) {
    if (answered) return;
    setPicked(i);
    onAnswer?.(i === quiz.ok);
  }

  return (
    <>
      <span className="kicker">🧠 Kviz · {card.category?.label}</span>
      <h1>{quiz.q || card.title}</h1>
      <div className="quiz-opts">
        {(quiz.opts || []).map((opt, i) => {
          let cls = 'quiz-opt';
          if (answered && i === quiz.ok) cls += ' correct';
          else if (answered && i === picked) cls += ' wrong';
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={answered}>
              <span className="qletter">{LETTERS[i] || i + 1}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {answered && quiz.expl && (
        <div className="quiz-expl">
          {picked === quiz.ok ? '✅ Tačno! ' : '❌ '}
          {quiz.expl}
        </div>
      )}
    </>
  );
}
