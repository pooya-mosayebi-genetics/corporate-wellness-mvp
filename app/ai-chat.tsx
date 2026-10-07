import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { Card, SectionTitle } from '../src/components/ui/Card';
import Icon from '../src/components/ui/Icon';
import { getAiConfig, setAiConfig, askAI, parseMeal, parseMealLocal, localAnswer, coachSystem, diagnoseAi } from '../src/services/ai';
import type { AiProvider, AiConfig } from '../src/services/ai';
import type { Meal, MealItem, MealSlot } from '../src/types/nutrition';
import { router } from 'expo-router';

interface Msg { id: string; role: 'user' | 'ai'; content: string; meal?: any; confirmed?: boolean; source?: 'ai' | 'offline'; }
let mid = 0;
const nid = () => `m-${Date.now()}-${++mid}`;
const nowStr = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const PROVIDERS: { key: AiProvider; fa: string; en: string }[] = [
  { key: 'auto', fa: 'خودکار (پیشنهادی)', en: 'Auto' },
  { key: 'pollinations', fa: 'Pollinations', en: 'Pollinations' },
  { key: 'openrouter', fa: 'OpenRouter', en: 'OpenRouter' },
  { key: 'custom', fa: 'سازمانی/سفارشی', en: 'Custom/Prod' },
  { key: 'ollama', fa: 'لوکال', en: 'Local' },
  { key: 'offline', fa: 'آفلاین', en: 'Offline' },
];

export default function AiChatScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { state, addMeal } = useWellness();
  const [mode, setMode] = useState<'chat' | 'log'>('chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCfg, setShowCfg] = useState(false);
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [diag, setDiag] = useState<string[] | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { targets, meals, waterEntries, bodyAnalyses, profile, checkIn } = state;
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter((m) => m.date === today);
  const todayCal = todayMeals.reduce((s, m) => s + m.calories, 0);
  const todayWater = waterEntries.filter((e) => e.loggedAt.slice(0, 10) === today).reduce((s, e) => s + e.ml, 0);
  const todayProtein = todayMeals.reduce((s, m) => s + m.protein, 0);
  const last = bodyAnalyses[bodyAnalyses.length - 1];

  // ✅ useEffect (نه useMemo) برای بارگذاری کانفیگ
  useEffect(() => { getAiConfig().then(setCfg); }, []);

  const ctx = useMemo(() => {
    const l: string[] = [];
    if (profile) l.push(`Profile: age ${profile.age}, ${profile.gender}, ${profile.heightCm}cm, ${profile.weightKg}kg, goal ${profile.goal}.`);
    if (targets) l.push(`Targets: ${targets.calories} kcal, P ${targets.macros.proteinGrams}g, C ${targets.macros.carbGrams}g, F ${targets.macros.fatGrams}g.`);
    l.push(`Today: ${todayCal} kcal, water ${todayWater}ml, meals ${todayMeals.length}.`);
    if (last) l.push(`Last analysis: weight ${last.weightKg}kg, fat ${last.bodyFatPercent}%, visceral ${last.visceralFatAreaCm2}.`);
    l.push(`Stress ${checkIn.stressLevel}/10, sleep ${checkIn.sleepQuality}/10.`);
    return l.join('\n');
  }, [profile, targets, todayCal, todayWater, todayMeals.length, last, checkIn]);

  const push = (m: Msg) => { setMessages((p) => [...p, m]); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); };
  const update = (patch: Partial<AiConfig>) => { if (!cfg) return; const next = { ...cfg, ...patch }; setCfg(next); setAiConfig(patch); };

  const runDiag = async () => { setDiagBusy(true); setDiag(null); const lines = await diagnoseAi(); setDiag(lines); setDiagBusy(false); };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput(''); setBusy(true);
    push({ id: nid(), role: 'user', content: text });
    try {
      if (mode === 'log') {
        let parsed: any = null; let source: 'ai' | 'offline' = 'ai';
        try { parsed = await parseMeal(text); } catch { parsed = parseMealLocal(text); source = 'offline'; }
        if (!parsed?.items?.length) push({ id: nid(), role: 'ai', content: isFa ? 'غذایی تشخیص داده نشد؛ نام غذاها را واضح‌تر بنویسید.' : 'No foods detected.', source });
        else push({ id: nid(), role: 'ai', content: isFa ? 'این وعده را تشخیص دادم؛ تأیید می‌کنی؟' : 'Parsed this meal — confirm to log:', meal: parsed, source });
      } else {
        let reply: string; let source: 'ai' | 'offline' = 'ai';
        try {
          const history = messages.slice(-6).map((m) => ({ role: m.role === 'ai' ? ('assistant' as const) : ('user' as const), content: m.content }));
          reply = await askAI(coachSystem(ctx), [...history, { role: 'user', content: text }]);
        } catch {
          reply = localAnswer(text, { targetsCal: targets?.calories, todayCal, todayWater, proteinTarget: targets?.macros.proteinGrams, proteinToday: todayProtein });
          source = 'offline';
        }
        push({ id: nid(), role: 'ai', content: reply, source });
      }
    } catch { push({ id: nid(), role: 'ai', content: isFa ? '❌ خطا در پردازش' : '❌ Error', source: 'offline' }); }
    setBusy(false);
  };

  const confirmMeal = (msg: Msg) => {
    const p = msg.meal; if (!p) return;
    const items: MealItem[] = (p.items || []).map((it: any, i: number) => ({ id: `ai-${Date.now()}-${i}`, foodId: `ai-${it.name}`, nameFa: it.name, nameEn: it.name, portionFa: '۱ پرس', portionEn: '1 serving', qty: it.qty || 1, kcal: it.kcal || 0, protein: it.protein || 0, carbs: it.carbs || 0, fat: it.fat || 0 }));
    const tot = items.reduce((a, it) => ({ kcal: a.kcal + it.kcal * it.qty, protein: a.protein + it.protein * it.qty, carbs: a.carbs + it.carbs * it.qty, fat: a.fat + it.fat * it.qty }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    addMeal({ id: `meal-${Date.now()}`, type: (p.slot as MealSlot) || 'lunch', date: today, time: nowStr(), name: items.map((i) => i.nameFa).join('، ').slice(0, 48), calories: Math.round(totals.kcal), protein: Math.round(totals.protein * 10) / 10, carbs: Math.round(totals.carbs * 10) / 10, fat: Math.round(totals.fat * 10) / 10, items, loggedAt: new Date().toISOString() } as Meal);
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, confirmed: true } : m)));
    push({ id: nid(), role: 'ai', content: isFa ? `✅ وعده با ${Math.round(totals.kcal)} کالری ثبت شد.` : `✅ Logged with ${Math.round(totals.kcal)} kcal.`, source: msg.source });
  };

  const quickChips = mode === 'chat'
    ? [isFa ? 'امروز چقدر کالری مجازم؟' : 'How many kcal left?', isFa ? 'یک میان‌وعدهٔ سالم پیشنهاد بده' : 'Suggest a snack', isFa ? 'وضعیت آب امروز؟' : 'Water status?']
    : [isFa ? 'صبحانه ۲ تخم‌مرغ و سنگک خوردم' : 'I ate 2 eggs + sangak', isFa ? 'ناهار عدس پلو با ماست' : 'Lunch: lentil rice + yogurt', isFa ? 'شام مرغ گریل و سالاد' : 'Dinner: chicken + salad'];

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const inp = { backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 7, fontSize: 10, color: colors.text };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8, marginRight: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{isFa ? 'دستیار هوشمند' : 'AI Coach'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 999, padding: 3 }}>
          {(['chat', 'log'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: mode === m ? colors.primary : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: mode === m ? '#FFFFFF' : colors.textSecondary }}>{m === 'chat' ? (isFa ? 'گفتگو' : 'Chat') : isFa ? 'ثبت وعده' : 'Log'}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setShowCfg((v) => !v)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 6, backgroundColor: colors.surfaceAlt }}>
          <Icon name="settings" size={13} color={cfg?.provider === 'offline' ? colors.warning : colors.success} />
        </Pressable>
      </View>

      {showCfg && cfg && (
        <View style={[card, { margin: 10, marginBottom: 0 }]}>
          <SectionTitle>{isFa ? 'ارائه‌دهندهٔ AI' : 'AI Provider'}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {PROVIDERS.map((p) => (
              <Pressable key={p.key} onPress={() => update({ provider: p.key })} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: cfg.provider === p.key ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: cfg.provider === p.key ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: cfg.provider === p.key ? '#FFFFFF' : colors.textSecondary }}>{isFa ? p.fa : p.en}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={[inp, { marginBottom: 5 }]} value={cfg.apiKey} onChangeText={(t) => update({ apiKey: t })} placeholder="API key (sk-...)" placeholderTextColor={colors.textMuted} />
          {cfg.provider === 'ollama' && (
            <TextInput style={[inp, { marginBottom: 5 }]} value={cfg.baseUrl || 'http://localhost:11434/v1'} onChangeText={(t) => update({ baseUrl: t })} placeholderTextColor={colors.textMuted} />
          )}
          {cfg.provider === 'custom' && (
            <>
              <TextInput style={[inp, { marginBottom: 5 }]} value={cfg.baseUrl} onChangeText={(t) => update({ baseUrl: t })} placeholder="https://api.vendor.com/v1/chat/completions" placeholderTextColor={colors.textMuted} />
              <TextInput style={[inp, { marginBottom: 5 }]} value={cfg.model} onChangeText={(t) => update({ model: t })} placeholder="gpt-4o-mini / claude-..." placeholderTextColor={colors.textMuted} />
            </>
          )}
          {cfg.provider === 'pollinations' && (
            <TextInput style={inp} value={cfg.model} onChangeText={(t) => update({ model: t })} placeholder="openai | mistral" placeholderTextColor={colors.textMuted} />
          )}
          <Pressable onPress={runDiag} disabled={diagBusy} style={{ backgroundColor: colors.chart[4], borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{diagBusy ? (isFa ? 'در حال تست...' : 'Testing...') : isFa ? '🩺 تست اتصال سرویس‌ها' : '🩺 Test connections'}</Text>
          </Pressable>
          {diag && (
            <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8, marginTop: 6 }}>
              {diag.map((l, i) => (<Text key={i} style={{ fontSize: 9, color: colors.textSecondary, marginBottom: 2 }}>{l}</Text>))}
            </View>
          )}
        </View>
      )}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 10 }}>
        {messages.length === 0 && (
          <View style={[card, { alignItems: 'center', padding: 20 }]}>
            <Icon name="tips" size={26} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 8 }}>{isFa ? 'دستیار هوشمند The Min' : 'The Min AI Coach'}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
              {isFa ? 'وعده‌ها را با زبان طبیعی ثبت کن یا سؤال تغذیه‌ای بپرس.' : 'Log meals naturally or ask nutrition questions.'}
            </Text>
          </View>
        )}
        {messages.map((m) => (
          <View key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: m.role === 'user' ? colors.primary : colors.surface, borderRadius: 12, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: m.role === 'user' ? colors.primary : colors.cardBorder }}>
            <Text style={{ fontSize: 11, color: m.role === 'user' ? '#FFFFFF' : colors.text, lineHeight: 17 }}>{m.content}</Text>
            {m.source === 'offline' && m.role === 'ai' && <Text style={{ fontSize: 8, color: colors.warning, marginTop: 4 }}>{isFa ? '⚡ حالت آفلاین' : ' offline mode'}</Text>}
            {m.meal && (
              <View style={{ marginTop: 8 }}>
                {(m.meal.items || []).map((it: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>{it.name} ×{it.qty}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{it.kcal} kcal</Text>
                  </View>
                ))}
                {!m.confirmed ? (
                  <Pressable onPress={() => confirmMeal(m)} style={{ backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '✅ تأیید و ثبت وعده' : '✅ Confirm & log'}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontSize: 9, color: colors.success, marginTop: 6 }}>{isFa ? '✓ ثبت شد' : '✓ Logged'}</Text>
                )}
              </View>
            )}
          </View>
        ))}
        {busy && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'در حال فکر کردن...' : 'Thinking...'}</Text>
          </View>
        )}
      </ScrollView>

      <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.cardBorder, padding: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }} contentContainerStyle={{ paddingRight: 6 }}>
          {quickChips.map((c, i) => (
            <Pressable key={i} onPress={() => setInput(c)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginRight: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 12, color: colors.text }}
            placeholder={mode === 'log' ? (isFa ? 'وعده‌ات را بنویس...' : 'Describe your meal...') : isFa ? 'سؤال تغذیه‌ای بپرس...' : 'Ask a question...'}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} disabled={busy || !input.trim()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: input.trim() && !busy ? colors.primary : colors.border }}>
            <Icon name="chevronForward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}