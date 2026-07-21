/**
 * Jedinstveni AI sloj sa izborom provajdera:
 *   AI_PROVIDER=ollama    → lokalni Ollama (besplatno, bez ključa)   [podrazumevano za dev]
 *   AI_PROVIDER=openai    → bilo koji OpenAI-kompatibilan API (Groq, OpenRouter…) — za free hosting
 *   AI_PROVIDER=anthropic → Anthropic API (traži ANTHROPIC_API_KEY)
 *
 * Svi putevi izlažu isti interfejs: callLLM(), hasAI(), extractJson(), GEN_MODEL, BULK_MODEL.
 */
import Anthropic from '@anthropic-ai/sdk';

const PROVIDER = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

// --- Ollama podešavanja ---
const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
// CPU inferencija je spora (~5 tok/s), pa je timeout velik i podesiv.
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 900000; // 15 min

// --- OpenAI-kompatibilan API (Groq free tier je podrazumevani cilj) ---
const OPENAI_BASE = (process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'llama-3.1-8b-instant';

// --- Anthropic podešavanja ---
const ANTHROPIC_GEN = process.env.GEN_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_BULK = process.env.BULK_MODEL || 'claude-haiku-4-5';

// Nazivi modela koje ostatak koda koristi kao "podrazumevani" i "jeftini".
export const GEN_MODEL =
  PROVIDER === 'anthropic' ? ANTHROPIC_GEN : PROVIDER === 'openai' ? OPENAI_MODEL : OLLAMA_MODEL;
export const BULK_MODEL =
  PROVIDER === 'anthropic' ? ANTHROPIC_BULK : PROVIDER === 'openai' ? OPENAI_MODEL : OLLAMA_MODEL;

let anthropicClient = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Da li je AI uopšte upotrebljiv sa trenutnom konfiguracijom. */
export function hasAI() {
  if (PROVIDER === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  if (PROVIDER === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return true; // ollama je lokalno dostupan; stvarnu dostupnost proverava aiStatus()
}

export function providerName() {
  return PROVIDER;
}

/** Provera da li AI zaista odgovara (koristi /health i admin). */
export async function aiStatus() {
  if (PROVIDER === 'anthropic') {
    return { provider: 'anthropic', ready: Boolean(process.env.ANTHROPIC_API_KEY), model: GEN_MODEL };
  }
  if (PROVIDER === 'openai') {
    const ready = Boolean(process.env.OPENAI_API_KEY);
    return {
      provider: 'openai',
      ready,
      model: OPENAI_MODEL,
      baseUrl: OPENAI_BASE,
      note: ready ? undefined : 'OPENAI_API_KEY nije podešen (za Groq: besplatan ključ na console.groq.com).',
    };
  }
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    const has = models.includes(OLLAMA_MODEL) || models.some((m) => m.startsWith(OLLAMA_MODEL.split(':')[0]));
    return {
      provider: 'ollama',
      ready: has,
      model: OLLAMA_MODEL,
      baseUrl: OLLAMA_BASE,
      models,
      note: has ? undefined : `Model ${OLLAMA_MODEL} nije preuzet. Pokreni: ollama pull ${OLLAMA_MODEL}`,
    };
  } catch (err) {
    return { provider: 'ollama', ready: false, model: OLLAMA_MODEL, baseUrl: OLLAMA_BASE, error: String(err.message || err) };
  }
}

function anthropicUnavailable() {
  const err = new Error('ANTHROPIC_API_KEY nije podešen. Upiši ključ u .env i restartuj, ili koristi AI_PROVIDER=ollama.');
  err.status = 503;
  return err;
}

function ollamaUnavailable(detail) {
  const err = new Error(
    `Ollama nije dostupna (${OLLAMA_BASE}). Pokreni "ollama serve" i "ollama pull ${OLLAMA_MODEL}". Detalji: ${detail}`
  );
  err.status = 503;
  return err;
}

/**
 * Glavni poziv modela. `json:true` traži strogo JSON izlaz (Ollama format:json).
 */
export async function callLLM({ system, user, model, maxTokens = 4096, retries = 4, json = true }) {
  if (PROVIDER === 'anthropic') return callAnthropic({ system, user, model: model || ANTHROPIC_GEN, maxTokens, retries });
  if (PROVIDER === 'openai') return callOpenAI({ system, user, model: model || OPENAI_MODEL, maxTokens, retries, json });
  return callOllama({ system, user, model: model || OLLAMA_MODEL, maxTokens, retries, json });
}

async function callOpenAI({ system, user, model, maxTokens, retries, json }) {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY nije podešen (za Groq: besplatan ključ na console.groq.com).');
    err.status = 503;
    throw err;
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.7,
          response_format: json ? { type: 'json_object' } : undefined,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) {
        const body = await res.text();
        const e = new Error(`${PROVIDER} API ${res.status}: ${body.slice(0, 200)}`);
        e.status = res.status;
        throw e;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      lastErr = err;
      const status = err.status ?? 0;
      const retryable =
        status === 429 || status >= 500 || err.name === 'TimeoutError' || /fetch failed/i.test(String(err.message));
      if (!retryable || attempt === retries) throw err;
      const wait = Math.min(60000, 2000 * 2 ** attempt) + Math.random() * 1000;
      console.warn(`OpenAI-kompat. API ${status || err.name}, pokušaj ${attempt + 1}/${retries}, čekam ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function callAnthropic({ system, user, model, maxTokens, retries }) {
  if (!process.env.ANTHROPIC_API_KEY) throw anthropicUnavailable();
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const msg = await anthropicClient.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      });
      return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    } catch (err) {
      lastErr = err;
      const status = err.status ?? 0;
      const retryable = status === 429 || status === 529 || status >= 500 || err.name === 'APIConnectionError';
      if (!retryable || attempt === retries) throw err;
      const wait = Math.min(60000, 2000 * 2 ** attempt) + Math.random() * 1000;
      console.warn(`Anthropic ${status || err.name}, pokušaj ${attempt + 1}/${retries}, čekam ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function callOllama({ system, user, model, maxTokens, retries, json }) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          format: json ? 'json' : undefined,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          options: { temperature: 0.7, num_predict: maxTokens },
        }),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 404) {
          const e = new Error(`Model "${model}" nije preuzet. Pokreni: ollama pull ${model}`);
          e.status = 503;
          throw e;
        }
        throw new Error(`Ollama ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.message?.content || '';
    } catch (err) {
      lastErr = err;
      if (err.status === 503) throw err; // model ne postoji — nema smisla ponavljati
      const retryable = err.name === 'TimeoutError' || err.name === 'AbortError' || /fetch failed|ECONNREFUSED|network/i.test(String(err.message));
      if (!retryable || attempt === retries) {
        if (/fetch failed|ECONNREFUSED/i.test(String(err.message))) throw ollamaUnavailable(err.message);
        throw err;
      }
      const wait = Math.min(30000, 1500 * 2 ** attempt) + Math.random() * 500;
      console.warn(`Ollama ${err.name}, pokušaj ${attempt + 1}/${retries}, čekam ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

/** Izvuci JSON iz odgovora modela (toleriše ```json ograde i tekst okolo). */
export function extractJson(text) {
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const candidates = ['[', '{'].map((c) => t.indexOf(c)).filter((i) => i >= 0);
  if (!candidates.length) throw new Error('Model nije vratio JSON');
  const start = Math.min(...candidates);
  const open = t[start];
  const close = open === '[' ? ']' : '}';
  const end = t.lastIndexOf(close);
  if (end <= start) throw new Error('Nepotpun JSON u odgovoru modela');
  return JSON.parse(t.slice(start, end + 1));
}
