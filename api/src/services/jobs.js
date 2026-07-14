/**
 * Jednostavan in-process red pozadinskih poslova (obrada knjiga ide jedna po jedna
 * da ne probije rate-limit API-ja). Status posla se čita iz Book reda u bazi.
 */
const queue = [];
let running = false;
const active = new Set(); // bookId-jevi u redu ili obradi

export function enqueueBookJob(bookId, fn) {
  if (active.has(bookId)) return false;
  active.add(bookId);
  queue.push({ bookId, fn });
  drain();
  return true;
}

export function isQueued(bookId) {
  return active.has(bookId);
}

async function drain() {
  if (running) return;
  running = true;
  while (queue.length) {
    const { bookId, fn } = queue.shift();
    try {
      await fn();
    } catch (err) {
      console.error(`Posao za knjigu ${bookId} pao:`, err);
    } finally {
      active.delete(bookId);
    }
  }
  running = false;
}
