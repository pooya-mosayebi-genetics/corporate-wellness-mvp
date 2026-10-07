import AsyncStorage from '@react-native-async-storage/async-storage';
import { iranianFoods } from '../data/iranianFoods';

export type AiProvider = 'auto' | 'pollinations' | 'openrouter' | 'ollama' | 'custom' | 'offline';

export interface AiConfig { provider: AiProvider; baseUrl: string; apiKey: string; model: string; }

const CFG_KEY = 'ai_config_v5';
const DEFAULTS: AiConfig = { provider: 'auto', baseUrl: '', apiKey: '', model: 'openai' };

const POLL_URL = 'https://text.pollinations.ai/openai';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODELS = ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-exp:free'];

interface Endpoint { name: string; url: string; key: string; models: string[]; poll?: boolean; }

const EP = {
  poll: (key: string): Endpoint => ({ name: 'Pollinations', url: key ? `${POLL_URL}?token=${encodeURIComponent(key)}` : POLL_URL, key, models: ['openai'], poll: true }),
  groq: (key: string): Endpoint => ({ name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', key, models: ['llama-3.1-8b-instant'] }),
  cerebras: (key: string): Endpoint => ({ name: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key, models: ['llama3.1-8b'] }),
  mistral: (key: string): Endpoint => ({ name: 'Mistral', url: 'https://api.mistral.ai/v1/chat/completions', key, models: ['mistral-small-latest'] }),
  github: (key: string): Endpoint => ({ name: 'GitHub Models', url: 'https://models.inference.ai.azure.com/chat/completions', key, models: ['gpt-4o-mini'] }),
};

export async function getAiConfig(): Promise<AiConfig> {
  let stored: Partial<AiConfig> = {};
  try { const raw = await AsyncStorage.getItem(CFG_KEY); if (raw) stored = JSON.parse(raw); } catch {}
  const envKey = (process.env.EXPO_PUBLIC_AI_KEY ?? '') || (process.env.EXPO_PUBLIC_OPENROUTER_KEY ?? '');
  return { ...DEFAULTS, ...stored, apiKey: stored.apiKey || envKey };
}
export async function setAiConfig(c: Partial<AiConfig>) {
  const cur = await getAiConfig();
  try { await AsyncStorage.setItem(CFG_KEY, JSON.stringify({ ...cur, ...c })); } catch {}
}

export interface AiMsg { role: 'system' | 'user' | 'assistant'; content: string; }
export function cleanJson(s: string) { return s.replace(/```json/gi, '').replace(/```/g, '').trim(); }

/** زنجیرهٔ ارائه‌دهنده‌ها بر اساس حالت انتخابی */
async function buildChain(cfg: AiConfig): Promise<Endpoint[]> {
  const k = cfg.apiKey;
  if (cfg.provider === 'auto') {
    const c: Endpoint[] = [];
    if (k) c.push(EP.poll(k), EP.groq(k), EP.cerebras(k), EP.mistral(k), EP.github(k));
    c.push(EP.poll(''));
    return c;
  }
  if (cfg.provider === 'pollinations') return [EP.poll(k), EP.poll('')];
  if (cfg.provider === 'openrouter') return [{ name: 'OpenRouter', url: OR_URL, key: k, models: OPENROUTER_MODELS }, EP.poll('')];
  if (cfg.provider === 'ollama') return [{ name: 'Ollama', url: `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, key: '', models: [cfg.model || 'qwen2.5:7b'] }, EP.poll('')];
  if (cfg.provider === 'custom') return [{ name: 'Custom', url: cfg.baseUrl, key: k, models: [cfg.model || 'gpt-4o-mini'] }, EP.poll('')];
  return [];
}

async function tryEndpoint(ep: Endpoint, messages: AiMsg[], json: boolean): Promise<string | null> {
  for (const model of ep.models) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ep.key) headers.Authorization = `Bearer ${ep.key}`;
      const body: any = ep.poll ? { model, messages } : { model, messages, temperature: 0.4, ...(json ? { response_format: { type: 'json_object' } } : {}) };
      const res = await fetch(ep.url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? (typeof data === 'string' ? data : null);
      if (content) return content;
    } catch {}
  }
  return null;
}

export async function callAI(messages: AiMsg[], opts: { json?: boolean } = {}): Promise<string> {
  const cfg = await getAiConfig();
  if (cfg.provider === 'offline') throw new Error('OFFLINE');
  const chain = await buildChain(cfg);
  for (const ep of chain) {
    const out = await tryEndpoint(ep, messages, !!opts.json);
    if (out) return out;
  }
  throw new Error('AI_FAILED');
}

export async function askAI(system: string, msgs: AiMsg[], opts: { json?: boolean } = {}) {
  return callAI([{ role: 'system', content: system }, ...msgs], opts);
}

/** 🩺 تشخیص: وضعیت تک‌تک سرویس‌ها را برمی‌گرداند */
export async function diagnoseAi(): Promise<string[]> {
  const cfg = await getAiConfig();
  const k = cfg.apiKey;
  const probes: Endpoint[] = k
    ? [EP.poll(k), EP.groq(k), EP.cerebras(k), EP.mistral(k), EP.github(k), EP.poll('')]
    : [EP.poll('')];
  const lines: string[] = [];
  if (!k) lines.push('(کلیدی تنظیم نشده؛ فقط Pollinations بدون کلید تست می‌شود)');
  for (const ep of probes) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ep.key) headers.Authorization = `Bearer ${ep.key}`;
      const res = await fetch(ep.url, { method: 'POST', headers, body: JSON.stringify({ model: ep.models[0], messages: [{ role: 'user', content: 'ping' }] }) });
      if (res.ok) lines.push(`${ep.name}: ✅ OK`);
      else lines.push(`${ep.name}: ❌ HTTP ${res.status} ${res.statusText}`);
    } catch (e: any) {
      lines.push(`${ep.name}: ❌ network/CORS (${e?.message ?? 'error'})`);
    }
  }
  return lines;
}

export function coachSystem(ctx: string) {
  return `You are "The Min" corporate wellness coach AI. Concise, friendly, practical. Answer in user's language. Use kcal/g. USER CONTEXT:\n${ctx}\nHelp with meal logging, calorie/macro counting, nutrition advice, weight goals.`;
}

export async function parseMeal(text: string) {
  const sys = 'You are a nutrition data extractor. Convert the meal description into STRICT JSON only: {"slot":"breakfast|snack1|lunch|snack2|dinner|snack3","items":[{"name":"<fa>","qty":<n>,"kcal":<n>,"protein":<n>,"carbs":<n>,"fat":<n>}]}. Use realistic Iranian food values. Respond ONLY with the JSON object.';
  const out = await askAI(sys, [{ role: 'user', content: text }], { json: true });
  return JSON.parse(cleanJson(out));
}

// ---------- آفلاین ضدخطا ----------
const faToEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseMealLocal(text: string) {
  const t = faToEn(text).toLowerCase();
  let slot = 'lunch';
  if (/صبحانه|breakfast/.test(t)) slot = 'breakfast';
  else if (/شام|dinner/.test(t)) slot = 'dinner';
  else if (/میان|اسنک|snack/.test(t)) slot = 'snack1';
  const items: any[] = [];
  for (const f of iranianFoods) {
    const name = f.nameFa.toLowerCase();
    if (name.length >= 3 && t.includes(name)) {
      let qty = 1;
      const m1 = t.match(new RegExp(`(\\d+)\\s*(عدد|کف|پرس|لیوان|قاشق|گرم)?\\s*${esc(name)}`));
      const m2 = t.match(new RegExp(`${esc(name)}\\s*(\\d+)`));
      if (m1) qty = parseInt(m1[1], 10) || 1; else if (m2) qty = parseInt(m2[1], 10) || 1;
      items.push({ name: f.nameFa, qty, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat });
    }
  }
  return { slot, items };
}

export function localAnswer(text: string, d: { targetsCal?: number; todayCal?: number; todayWater?: number; proteinTarget?: number; proteinToday?: number }) {
  const t = faToEn(text);
  const fa = /[\u0600-\u06FF]/.test(text);
  if (/کالری|calorie/.test(t) && /مجاز|باقی|left|remaining|چقدر/.test(t)) {
    const left = (d.targetsCal ?? 2000) - (d.todayCal ?? 0);
    return fa ? `حدود ${left} کالری برای امروز باقی مانده (هدف ${d.targetsCal ?? 2000}، مصرف ${d.todayCal ?? 0}).` : `About ${left} kcal left today.`;
  }
  if (/آب|water/.test(t)) return fa ? `امروز ${d.todayWater ?? 0} میلی‌لیتر آب ثبت شده؛ هدف ۲۵۰۰ است.` : `${d.todayWater ?? 0} ml water logged; target 2500 ml.`;
  if (/پروتئین|protein/.test(t)) return fa ? `هدف پروتئین ${d.proteinTarget ?? 100}g؛ تاکنون ${d.proteinToday ?? 0}g.` : `Protein target ${d.proteinTarget ?? 100}g.`;
  if (/میان|اسنک|snack/.test(t)) return fa ? 'پیشنهاد: یک مشت بادام + میوهٔ فصل، یا ماست یونانی با خرما.' : 'Idea: almonds + fruit, or Greek yogurt with dates.';
  return fa ? 'حالت آفلاین؛ وعده را از متن تشخیص می‌دهم و به پرسش‌های کالری/آب/پروتئین پاسخ می‌دهم.' : 'Offline mode; I parse meals and answer calorie/water/protein questions.';
}