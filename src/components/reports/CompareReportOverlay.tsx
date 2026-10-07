import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useAuth } from '../../store/AuthContext';
import { usePersonnel } from '../../store/PersonnelContext';
import type { BodyAnalysisRecord } from '../../data/bodyAnalysisTypes';
import { faNum } from '../../utils/format';
import FixedOverlay from '../ui/FixedOverlay';
import { BRAND } from '../../config/brand';
import { usePermissions } from '../../hooks/usePermissions';

const FONT = Platform.select({ web: 'Vazirmatn, Vazir, Tahoma, sans-serif', default: 'Vazirmatn' }) as string;

const C = {
  ink: '#0f172a', sub: '#475569', mute: '#94a3b8', line: '#e2e8f0',
  beforeBg: '#f1f5f9', beforeHead: '#64748b',
  afterBg: '#ecfdf5', afterHead: '#10b981',
  ok: '#16a34a', bad: '#dc2626', warn: '#d97706', primary: '#2563eb',
  muscle: '#3b82f6', fat: '#f59e0b', water: '#14b8a6',
};

const num = (v: any): number => {
  if (v === null || v === undefined || v === '') return NaN;
  const x = Number(v);
  return isFinite(x) ? x : NaN;
};

const isNumericName = (v: any) => !v || /^\d+$/.test(String(v).trim());

let createPortalWeb: any = null;
if (Platform.OS === 'web') {
  try { createPortalWeb = require('react-dom').createPortal; } catch { createPortalWeb = null; }
}

// 🆕 FIX: استفاده از div در وب برای پشتیبانی کامل از SVG و HTML
const RawHtml = ({ html, style }: any) => {
  if (Platform.OS === 'web') {
    // @ts-ignore
    return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 8, color: C.mute }}>SVG</Text>
    </View>
  );
};

const segColor = (lean: number, fat: number) => {
  const t = lean + fat;
  const p = t > 0 ? (fat / t) * 100 : 0;
  return p <= 30 ? '#34d399' : p <= 38 ? '#60a5fa' : '#fbbf24';
};

const silhouetteHtml = (r: BodyAnalysisRecord) => {
  const torso = segColor(num(r.torsoLean) || 0, num(r.torsoFat) || 0);
  const armL = segColor(num(r.leftArmLean) || 0, num(r.leftArmFat) || 0);
  const armR = segColor(num(r.rightArmLean) || 0, num(r.rightArmFat) || 0);
  const legL = segColor(num(r.leftLegLean) || 0, num(r.leftLegFat) || 0);
  const legR = segColor(num(r.rightLegLean) || 0, num(r.rightLegFat) || 0);
  return `<svg width="86" height="164" viewBox="0 0 100 190" style="display:block;margin:0 auto;">
    <circle cx="50" cy="15" r="11" fill="${torso}"/>
    <rect x="34" y="29" width="32" height="54" rx="10" fill="${torso}"/>
    <rect x="20" y="31" width="11" height="52" rx="5.5" fill="${armL}"/>
    <rect x="69" y="31" width="11" height="52" rx="5.5" fill="${armR}"/>
    <rect x="35" y="87" width="13" height="92" rx="6.5" fill="${legL}"/>
    <rect x="52" y="87" width="13" height="92" rx="6.5" fill="${legR}"/>
  </svg>`;
};

const donutHtml = (parts: { c: string; f: number }[], centerTop: string, centerVal: string) => {
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  let off = 0;
  const circles = parts
    .map((p) => {
      const el = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${p.c}" stroke-width="24" stroke-dasharray="${(p.f * CIRC).toFixed(2)} ${CIRC.toFixed(2)}" stroke-dashoffset="${(-off * CIRC).toFixed(2)}"/>`;
      off += p.f;
      return el;
    })
    .join('');
  return `<svg width="148" height="148" viewBox="0 0 140 140" style="display:block;margin:0 auto;">
    <g transform="rotate(-90 70 70)">${circles}</g>
    <text x="70" y="63" text-anchor="middle" font-size="9" fill="#64748b" font-family="Vazirmatn,Vazir,Tahoma">${centerTop}</text>
    <text x="70" y="79" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a" font-family="Vazirmatn,Vazir,Tahoma">${centerVal}</text>
  </svg>`;
};

export default function CompareReportOverlay({
  visible, onClose, records,
}: { visible: boolean; onClose: () => void; records: BodyAnalysisRecord[] }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { session } = useAuth();
  const { getByNationalId } = usePersonnel();

  const [lang, setLang] = useState<'fa' | 'en'>(language === 'fa' ? 'fa' : 'en');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [bIdx, setBIdx] = useState(0);
  const [aIdx, setAIdx] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const asc = useMemo(() => [...records].sort((a, b) => +new Date(a.analyzeTime) - +new Date(b.analyzeTime)), [records]);

  useEffect(() => {
    if (visible && asc.length) { setBIdx(0); setAIdx(asc.length - 1); setErr(''); }
  }, [visible, asc.length]);

  const { can } = usePermissions();
  const allowed = can('reports.view');
  const canExport = can('reports.export_pdf');
  const isFa = lang === 'fa';
  const land = orientation === 'landscape';
  const n = (v: any, d = 1) => { const x = num(v); return isFinite(x) ? faNum(x.toFixed(d), isFa) : '—'; };
  const pd = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const id = 'zr-compare-print-css';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = `
      #zr-print-wrap { display: none; }
      @page { size: A4 ${land ? 'landscape' : 'portrait'}; margin: 6mm; }
      @media print {
        body * { visibility: hidden !important; }
        #zr-print-wrap, #zr-print-wrap * { visibility: visible !important; }
        #zr-print-wrap { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; direction: ${isFa ? 'rtl' : 'ltr'} !important; }
        #zr-print-sheet { width: 100% !important; min-height: 0 !important; box-shadow: none !important; padding: 4mm !important; box-sizing: border-box !important; }
      }
    `;
  }, [land, visible, isFa]);

  const T = isFa ? {
    title: 'گزارش مقایسه‌ای ترکیب بدن و شاخص‌های سلامتی', subtitle: 'نمایش تغییرات شما در مسیر سلامتی، پس از اجرای برنامهٔ تغذیه و سبک زندگی',
    name: 'نام', code: 'شناسه', gender: 'جنسیت', age: 'سن', period: 'بازهٔ مقایسه', male: 'مرد', female: 'زن', years: 'سال',
    before: 'قبل از برنامه (Before)', after: 'بعد از برنامه (After)', pickBefore: 'آنالیز پایه (قبل)', pickAfter: 'آنالیز مقایسه (بعد)',
    weight: 'وزن', bmi: 'BMI', fatPct: 'درصد چربی بدن', vfa: 'چربی احشایی (VFL)', comp: 'ترکیب بدن', muscle: 'عضله', fat: 'چربی', water: 'آب بدن',
    supp: 'شاخص‌های تکمیلی', smm: 'مقدار عضله اسکلتی', bmr: 'BMR', bio: 'سن بیولوژیک', score: 'امتیاز ترکیب بدن', norm: 'مقایسه با محدودهٔ نرمال',
    compPct: 'درصد ترکیب بدن', donutCenter: 'وزن کل', change: 'تغییرات کلیدی در بازهٔ زمانی', ind: 'شاخص', bef: 'قبل', aft: 'بعد', chg: 'تغییر',
    conclusion: 'نتیجه‌گیری کلی', cBase: 'با اجرای برنامهٔ تغذیه و سبک زندگی در این بازه،', cWd: 'کاهش وزن مشاهده شد', cWu: 'افزایش وزن مشاهده شد',
    cFd: 'درصد چربی بدن کاهش یافت', cFu: 'درصد چربی بدن افزایش یافت', cMu: 'تودهٔ عضلانی افزایش یافت', cMd: 'تودهٔ عضلانی کاهش یافت',
    cV: 'چربی احشایی به محدودهٔ امن نزدیک‌تر شد', cEnd: 'این تغییرات نشان‌دهندهٔ پیشرفت قابل توجه شما در مسیر سلامتی و تناسب اندام است.',
    b1: 'کاهش ریسک بیماری‌های متابولیک', b2: 'افزایش توان و انرژی', b3: 'بهبود کیفیت زندگی', b4: 'دستیابی به اهداف سلامتی',
    noteT: 'یادداشت کارشناس', noteBy: 'ثبت‌شده توسط', notePh: 'یادداشت یا توصیهٔ کارشناس برای درج در گزارش…', langT: 'زبان', orientT: 'جهت صفحه',
    portrait: 'عمودی', landscape: 'افقی', printBtn: '🖨 چاپ / ذخیرهٔ PDF وکتوری', printHint: 'پنجرهٔ چاپ باز می‌شود؛ Save as PDF بزنید. متن برداری و قابل جستجو می‌ماند.',
    dlBtn: '⬇ دانلود PDF تصویری', dlHint: 'یک کلیک = فایل آماده؛ کل صفحه با کیفیت بالا تصویر می‌شود (متن غیرقابل جستجو).', same: 'دو آنالیز متفاوت انتخاب کنید.',
    need2: 'برای گزارش مقایسه‌ای حداقل دو آنالیز لازم است.', footer: 'این گزارش بر اساس دادهٔ دستگاه آنالیز ترکیب بدنی تولید شده و جایگزین مشاورهٔ پزشکی نیست.',
    gen: 'تاریخ تهیهٔ گزارش', close: 'بستن',
  } : {
    title: 'Comparative Body Composition & Health Metrics Report', subtitle: 'Your progress on the health journey after following the nutrition & lifestyle program',
    name: 'Name', code: 'ID', gender: 'Gender', age: 'Age', period: 'Comparison period', male: 'Male', female: 'Female', years: 'y',
    before: 'Before Program', after: 'After Program', pickBefore: 'Baseline analysis (before)', pickAfter: 'Comparison analysis (after)',
    weight: 'Weight', bmi: 'BMI', fatPct: 'Body Fat %', vfa: 'Visceral Fat (VFL)', comp: 'Composition', muscle: 'Muscle', fat: 'Fat', water: 'Body Water',
    supp: 'Complementary Indices', smm: 'Skeletal Muscle Mass', bmr: 'BMR', bio: 'Biological Age', score: 'Composition Score', norm: 'Vs. Normal Range',
    compPct: 'Composition %', donutCenter: 'Total weight', change: 'Key Changes Over Period', ind: 'Metric', bef: 'Before', aft: 'After', chg: 'Change',
    conclusion: 'Overall Conclusion', cBase: 'Following the nutrition & lifestyle program over this period,', cWd: 'weight decreased', cWu: 'weight increased',
    cFd: 'body fat percentage decreased', cFu: 'body fat percentage increased', cMu: 'muscle mass increased', cMd: 'muscle mass decreased',
    cV: 'visceral fat moved closer to the safe range', cEnd: 'These changes indicate meaningful progress on your health & fitness journey.',
    b1: 'Lower metabolic disease risk', b2: 'More strength & energy', b3: 'Better quality of life', b4: 'Achieving health goals', noteT: 'Expert Note',
    noteBy: 'Recorded by', notePh: 'Expert note or recommendation to include in the report…', langT: 'Language', orientT: 'Page orientation',
    portrait: 'Portrait', landscape: 'Landscape', printBtn: '🖨 Print / Vector PDF', printHint: 'Opens the print dialog; choose Save as PDF. Text stays vector & searchable.',
    dlBtn: '⬇ Download Image PDF', dlHint: 'One click = ready file; the page is rasterized at high quality (non-searchable text).', same: 'Select two different analyses.',
    need2: 'At least two analyses are required for a comparison report.', footer: 'This report is generated from body-composition device data and does not replace medical advice.',
    gen: 'Report generated on', close: 'Close',
  };

  if (!visible || !allowed) return null;

  if (asc.length < 2) {
    return (
      <FixedOverlay visible={visible} onClose={onClose}>
        <View style={{ width: 320, backgroundColor: colors.surface, borderRadius: 16, padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.text, fontFamily: FONT, textAlign: 'center' }}>{T.need2}</Text>
          <Pressable onPress={onClose} style={{ marginTop: 14, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: FONT }}>{T.close}</Text>
          </Pressable>
        </View>
      </FixedOverlay>
    );
  }

  const bi = Math.min(bIdx, aIdx);
  const ai = Math.max(bIdx, aIdx);
  const before = asc[bi];
  const after = asc[ai];
  const sameSel = bi === ai;

  const personId = (after as any).nationalId || (after as any).mobileNumber || '—';
  const personnelRec: any = getByNationalId(personId) || getByNationalId((after as any).mobileNumber || '') || getByNationalId((after as any).nationalId || '');
  const recordName = asc.map((r: any) => r.fullName).find((v: any) => !isNumericName(v));
  const displayName =
    (personnelRec?.fullNamePrefixed && !isNumericName(personnelRec.fullNamePrefixed) ? personnelRec.fullNamePrefixed : '') ||
    (personnelRec?.fullName && !isNumericName(personnelRec.fullName) ? personnelRec.fullName : '') ||
    recordName || (!isNumericName((after as any).fullName) ? (after as any).fullName : personId);

  const calc = (x: BodyAnalysisRecord) => {
    const w = num(x.weight), h = num(x.height);
    return {
      w, h, bmi: h ? w / Math.pow(h / 100, 2) : 0, fatPct: w ? (num(x.bfm) / w) * 100 : 0,
      vfa: num(x.vfa), smm: num(x.smm), bfm: num(x.bfm), tbw: num(x.tbw), bmr: num(x.bmr),
      bio: num((x as any).biologicalAge), score: num((x as any).aneaScore),
      smmL: num(x.smmLower), smmU: num(x.smmUpper), bfmL: num(x.bfmLower), bfmU: num(x.bfmUpper),
    };
  };
  const B = calc(before);
  const A = calc(after);

  const fatRange = (m: ReturnType<typeof calc>, rec: BodyAnalysisRecord): [number, number] => {
    if (m.w > 0 && isFinite(m.bfmL) && isFinite(m.bfmU) && m.bfmU > m.bfmL) {
      return [(m.bfmL / m.w) * 100, (m.bfmU / m.w) * 100];
    }
    const isF = String(rec.gender || '').toLowerCase().includes('woman') || String(rec.gender || '').toLowerCase().includes('female');
    return isF ? [18, 28] : [10, 20];
  };

  const dW = A.w - B.w, dF = A.fatPct - B.fatPct, dS = A.smm - B.smm, dV = A.vfa - B.vfa, dB = A.bmi - B.bmi, dBio = A.bio - B.bio;

  const conclParts = [
    T.cBase, Math.abs(dW) >= 0.3 ? (dW < 0 ? T.cWd : T.cWu) : '', Math.abs(dF) >= 0.3 ? (dF < 0 ? T.cFd : T.cFu) : '',
    Math.abs(dS) >= 0.3 ? (dS > 0 ? T.cMu : T.cMd) : '', B.vfa > 100 && A.vfa <= 100 ? T.cV : '', T.cEnd,
  ].filter(Boolean);
  const concl = isFa ? conclParts.join('، ') : conclParts.join(' ');

  const expertRec = session ? getByNationalId((session as any).nationalId) : null;
  const expertName = (expertRec as any)?.fullName || (isFa ? 'کارشناس مجموعه' : 'Staff Expert');
  const genDate = new Date().toLocaleDateString(isFa ? 'fa-IR' : 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const isFemaleRec = String((after as any).gender || '').toLowerCase().includes('woman') || String((after as any).gender || '').toLowerCase().includes('female');

  const Kpi = ({ label, value, unit, tone }: any) => (
    <View style={{ flex: 1, backgroundColor: tone === 'after' ? '#f0fdf4' : '#f8fafc', borderWidth: 1, borderColor: tone === 'after' ? '#a7f3d0' : C.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', margin: 3 }}>
      <Text style={{ fontSize: 8, color: C.sub, fontFamily: FONT, textAlign: 'center' }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: tone === 'after' ? '#047857' : '#334155', marginTop: 2, fontFamily: FONT, direction: 'ltr', textAlign: 'center' } as any}>{value}</Text>
      <Text style={{ fontSize: 7, color: C.mute, fontFamily: FONT, textAlign: 'center' }}>{unit}</Text>
    </View>
  );

  const Row = ({ icon, label, value, unit }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', direction: isFa ? 'rtl' : 'ltr' } as any}>
      <Text style={{ fontSize: 11, marginLeft: isFa ? 6 : 0, marginRight: isFa ? 0 : 6 }}>{icon}</Text>
      <Text style={{ flex: 1, fontSize: 9, color: C.sub, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{label}</Text>
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.ink, fontFamily: FONT, direction: 'ltr', textAlign: isFa ? 'left' : 'right' } as any}>{value}{unit ? ` ${unit}` : ''}</Text>
    </View>
  );

  const RangeBar = ({ label, value, lo, hi, unit }: any) => {
    const isValid = isFinite(value);
    const span = hi - lo || 1;
    let axMin = Math.min(lo, isValid ? value : lo) - span * 0.3; 
    let axMax = Math.max(hi, isValid ? value : hi) + span * 0.3;
    if (lo === 0) axMin = Math.max(0, axMin); if (axMax <= axMin) axMax = axMin + 1;
    const pct = (x: number) => Math.max(0, Math.min(100, ((x - axMin) / (axMax - axMin)) * 100));
    const st = !isValid ? 'ok' : value < lo ? 'low' : value > hi ? 'high' : 'ok';
    const dotC = st === 'low' ? C.warn : st === 'high' ? C.bad : C.ok;
    const bL = pct(lo); const bW = Math.max(2, pct(hi) - pct(lo));
    return (
      <View style={{ marginBottom: 10, direction: 'ltr' } as any}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 8.5, color: C.sub, fontFamily: FONT, textAlign: 'left' }}>{label}</Text>
          <Text style={{ fontSize: 8.5, fontWeight: '800', color: dotC, fontFamily: FONT, direction: 'ltr', textAlign: 'right' } as any}>{n(value, 1)} {unit}</Text>
        </View>
        <View style={{ height: 7, borderRadius: 4, backgroundColor: '#e2e8f0' }}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${bL}%`, width: `${bW}%`, backgroundColor: '#bbf7d0', borderRadius: 4, borderWidth: 1, borderColor: C.ok }} />
          {isValid && <View style={{ position: 'absolute', top: -2.5, left: `${pct(value)}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: dotC, borderWidth: 2, borderColor: '#fff' }} />}
        </View>
        <View style={{ height: 11, marginTop: 2 }}>
          <Text style={{ position: 'absolute', top: 0, left: `${bL}%`, marginLeft: -20, width: 40, textAlign: 'center', fontSize: 7.5, color: C.mute, fontFamily: FONT }}>{n(lo, 1)}</Text>
          <Text style={{ position: 'absolute', top: 0, left: `${bL + bW}%`, marginLeft: -20, width: 40, textAlign: 'center', fontSize: 7.5, color: C.mute, fontFamily: FONT }}>{n(hi, 1)}</Text>
        </View>
      </View>
    );
  };

  const Column = ({ rec, m, tone }: { rec: BodyAnalysisRecord; m: ReturnType<typeof calc>; tone: 'before' | 'after' }) => {
    const fr = fatRange(m, rec); 
    const parts = [ { c: C.muscle, v: m.smm, l: T.muscle }, { c: C.fat, v: m.bfm, l: T.fat }, { c: C.water, v: m.tbw, l: T.water } ];
    const total = m.smm + m.bfm + m.tbw || 1;
    return (
      <View style={{ flex: 1, backgroundColor: tone === 'after' ? C.afterBg : C.beforeBg, borderRadius: 12, borderWidth: 1, borderColor: tone === 'after' ? '#a7f3d0' : C.line, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: tone === 'after' ? C.afterHead : C.beforeHead, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ fontSize: 9, color: '#fff', fontFamily: FONT }}>{pd(rec.analyzeTime)}</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', fontFamily: FONT }}>{tone === 'after' ? T.after : T.before}</Text>
        </View>
        <View style={{ padding: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Kpi tone={tone} label={T.weight} value={n(m.w, 1)} unit="kg" />
            <Kpi tone={tone} label={T.bmi} value={n(m.bmi, 1)} unit="kg/m²" />
            <Kpi tone={tone} label={T.fatPct} value={n(m.fatPct, 1)} unit="%" />
            <Kpi tone={tone} label={T.vfa} value={n(m.vfa, 0)} unit="level" />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6, gap: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: C.ink, marginBottom: 2, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.comp}</Text>
              <Row icon="🥩" label={T.muscle} value={n(m.smm, 1)} unit="kg" />
              <Row icon="🧈" label={T.fat} value={n(m.bfm, 1)} unit="kg" />
              <Row icon="💧" label={T.water} value={n(m.tbw, 1)} unit="L" />
            </View>
            <View style={{ width: 92, justifyContent: 'center' }}><RawHtml html={silhouetteHtml(rec)} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: C.ink, marginBottom: 2, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.supp}</Text>
              <Row icon="💪" label={T.smm} value={n(m.smm, 1)} unit="kg" />
              <Row icon="🔥" label={T.bmr} value={n(m.bmr, 0)} unit="kcal" />
              <Row icon="🧬" label={T.bio} value={n(m.bio, 0)} unit={T.years} />
              <Row icon="⭐" label={T.score} value={`${n(m.score, 0)} / ${faNum('100', isFa)}`} unit="" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
            <View style={{ flex: 1.2 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: C.ink, marginBottom: 6, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.norm}</Text>
              <RangeBar label={T.fatPct} value={m.fatPct} lo={fr[0]} hi={fr[1]} unit="%" />
              <RangeBar label={T.bmi} value={m.bmi} lo={18.5} hi={25} unit="kg/m²" />
              <RangeBar label={T.vfa} value={m.vfa} lo={0} hi={100} unit="" />
              <RangeBar label={T.muscle} value={m.smm} lo={isFinite(m.smmL) ? m.smmL : m.smm * 0.9} hi={isFinite(m.smmU) ? m.smmU : m.smm * 1.1} unit="kg" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: C.ink, marginBottom: 6, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.compPct}</Text>
              <RawHtml html={donutHtml(parts.map((p) => ({ c: p.c, f: p.v / total })), T.donutCenter, `${n(m.w, 1)} kg`)} />
              <View style={{ marginTop: 6, gap: 3 }}>
                {parts.map((p, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, direction: isFa ? 'rtl' : 'ltr' } as any}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.c }} />
                    <Text style={{ flex: 1, fontSize: 7.5, color: C.sub, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{p.l}</Text>
                    <Text style={{ fontSize: 7.5, fontWeight: '700', color: C.ink, fontFamily: FONT, direction: 'ltr', textAlign: isFa ? 'left' : 'right' } as any}>{n(m.w ? (p.v / m.w) * 100 : 0, 1)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const changeRows: { l: string; b: number; a: number; d: number; good: 'up' | 'down' }[] = [
    { l: `${T.weight} (kg)`, b: B.w, a: A.w, d: dW, good: 'down' }, { l: `${T.fatPct} (%)`, b: B.fatPct, a: A.fatPct, d: dF, good: 'down' },
    { l: `${T.smm} (kg)`, b: B.smm, a: A.smm, d: dS, good: 'up' }, { l: `${T.vfa} (level)`, b: B.vfa, a: A.vfa, d: dV, good: 'down' },
    { l: `BMI (kg/m²)`, b: B.bmi, a: A.bmi, d: dB, good: 'down' }, { l: `${T.bio} (${T.years})`, b: B.bio, a: A.bio, d: dBio, good: 'down' },
  ];

  const renderSheet = (sheetId: string, forPrint: boolean) => {
    const content = (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: C.primary, paddingBottom: 10, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{BRAND.title} · {T.title}</Text>
            <Text style={{ fontSize: 8.5, color: C.sub, marginTop: 2, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.subtitle}</Text>
          </View>
          <View style={{ alignItems: isFa ? 'flex-start' : 'flex-end', gap: 2 }}>
            <Text style={{ fontSize: 9, color: C.ink, fontWeight: '700', fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.name}: {displayName}</Text>
            <Text style={{ fontSize: 8, color: C.sub, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.code}: {personId} · {T.gender}: {isFemaleRec ? T.female : T.male} · {T.age}: {n((after as any).age, 0)} {T.years}</Text>
            <Text style={{ fontSize: 8, color: C.sub, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.period}: {pd(before.analyzeTime)} → {pd(after.analyzeTime)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Column rec={before} m={B} tone="before" />
          <Column rec={after} m={A} tone="after" />
        </View>
        <View style={{ marginTop: 12, borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#f8fafc', flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ flex: 2, fontSize: 9, fontWeight: '800', color: C.ink, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.change}</Text>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f1f5f9' }}>
            <Text style={{ flex: 2, fontSize: 8, fontWeight: '700', color: C.sub, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.ind}</Text>
            <Text style={{ flex: 1, fontSize: 8, fontWeight: '700', color: C.sub, fontFamily: FONT, textAlign: 'center' }}>{T.bef}</Text>
            <Text style={{ flex: 1, fontSize: 8, fontWeight: '700', color: C.sub, fontFamily: FONT, textAlign: 'center' }}>{T.aft}</Text>
            <Text style={{ flex: 1, fontSize: 8, fontWeight: '700', color: C.sub, fontFamily: FONT, textAlign: 'center' }}>{T.chg}</Text>
          </View>
          {changeRows.map((r, i) => {
            const flat = Math.abs(r.d) < 0.05; const goodDir = r.good === 'down' ? r.d < 0 : r.d > 0;
            const col = flat ? C.mute : goodDir ? C.ok : C.bad; const arrow = flat ? '＝' : r.d < 0 ? '↓' : '↑';
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                <Text style={{ flex: 2, fontSize: 8.5, color: C.ink, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{r.l}</Text>
                <Text style={{ flex: 1, fontSize: 8.5, color: C.sub, fontFamily: FONT, direction: 'ltr', textAlign: 'center' } as any}>{n(r.b, 1)}</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: '700', color: C.ink, fontFamily: FONT, direction: 'ltr', textAlign: 'center' } as any}>{n(r.a, 1)}</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: '800', color: col, fontFamily: FONT, direction: 'ltr', textAlign: 'center' } as any}>{arrow} {n(Math.abs(r.d), 1)}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1.4, backgroundColor: C.afterBg, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0', padding: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857', marginBottom: 5, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>🏆 {T.conclusion}</Text>
            <Text style={{ fontSize: 8.5, color: C.sub, lineHeight: 16, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{concl}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
              {[{ i: '❤️', t: T.b1 }, { i: '💪', t: T.b2 }, { i: '😊', t: T.b3 }, { i: '🎯', t: T.b4 }].map((b, k) => (
                <View key={k} style={{ flexBasis: '46%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 9, borderWidth: 1, borderColor: '#a7f3d0', padding: 7, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13 }}>{b.i}</Text>
                  <Text style={{ fontSize: 7.5, fontWeight: '700', color: '#047857', marginTop: 3, fontFamily: FONT, textAlign: 'center' }}>{b.t}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: note.trim() ? '#bfdbfe' : C.line, borderStyle: note.trim() ? 'solid' : 'dashed', backgroundColor: note.trim() ? '#eff6ff' : '#fafafa', padding: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: note.trim() ? '#1d4ed8' : C.mute, marginBottom: 5, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>✍️ {T.noteT}</Text>
            <Text style={{ fontSize: 8.5, color: note.trim() ? C.ink : C.mute, lineHeight: 16, minHeight: 60, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{note.trim() || '—'}</Text>
            {note.trim() !== '' && <Text style={{ fontSize: 7.5, color: C.sub, marginTop: 6, fontFamily: FONT, textAlign: isFa ? 'right' : 'left' }}>{T.noteBy}: {expertName} · {genDate}</Text>}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
          <Text style={{ fontSize: 8.5, fontWeight: '800', color: C.ink, fontFamily: FONT, flex: 1, textAlign: isFa ? 'right' : 'left' }}>{BRAND.title}</Text>
          <Text style={{ fontSize: 7, color: C.mute, flex: 2, fontFamily: FONT, textAlign: 'center' }}>{T.footer}</Text>
          <Text style={{ fontSize: 7, color: C.mute, flex: 1, fontFamily: FONT, textAlign: isFa ? 'left' : 'right' }}>{T.gen}: {genDate}</Text>
        </View>
      </>
    );

    // 🆕 FIX: استفاده از div در وب برای پشتیبانی کامل از mm، boxShadow و direction
    if (Platform.OS === 'web') {
      // @ts-ignore
      return (
        <div 
          id={sheetId}
          style={{
            width: forPrint ? '100%' : (land ? '296mm' : '210mm'),
            minHeight: forPrint ? '0' : (land ? '210mm' : '296mm'),
            padding: forPrint ? '4mm' : '10mm',
            backgroundColor: '#ffffff',
            fontFamily: FONT,
            direction: isFa ? 'rtl' : 'ltr',
            boxSizing: 'border-box',
            boxShadow: forPrint ? 'none' : '0 8px 30px rgba(15,23,42,.18)',
          }}
        >
          {content}
        </div>
      );
    }

    return (
      <View nativeID={sheetId} style={{ width: '100%', backgroundColor: '#ffffff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.line }}>
        {content}
      </View>
    );
  };

  const doPrint = () => { if (Platform.OS !== 'web') return; window.print(); };
  const doDownload = async () => {
    if (Platform.OS !== 'web') return;
    setBusy(true); setErr('');
    try {
      const hiLib = await import('html-to-image'); const { jsPDF } = await import('jspdf');
      const node = document.getElementById('zr-compare-sheet') as HTMLElement;
      if (!node) throw new Error('sheet not found');
      const dataUrl = await hiLib.toJpeg(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      const ratio = await new Promise<number>((resolve) => { const img = new Image(); img.onload = () => resolve(img.height / img.width); img.onerror = () => resolve(1.414); img.src = dataUrl; });
      const pdf = new jsPDF({ orientation: land ? 'l' : 'p', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      const imgH = pw * ratio; let left = imgH; let pos = 0;
      pdf.addImage(dataUrl, 'JPEG', 0, pos, pw, imgH); left -= ph;
      while (left > 0) { pos -= ph; pdf.addPage(); pdf.addImage(dataUrl, 'JPEG', 0, pos, pw, imgH); left -= ph; }
      pdf.save(`compare-report-${personId}.pdf`);
    } catch (e: any) { setErr(isFa ? 'برای دانلود فایل نصب کنید: npm i html-to-image jspdf' : 'Install first: npm i html-to-image jspdf'); } finally { setBusy(false); }
  };

  const Chip = ({ on, label, onPress }: any) => (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: on ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: on ? colors.primary : colors.border, marginRight: 4, marginLeft: 4 }}>
      <Text style={{ fontSize: 9, fontWeight: '700', color: on ? '#fff' : colors.textSecondary, fontFamily: FONT }}>{label}</Text>
    </Pressable>
  );

  return (
    <FixedOverlay visible={visible} onClose={onClose}>
      <ScrollView style={{ maxHeight: '92%' }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 1250, alignItems: 'center', padding: 10 }}>
          <View style={{ width: '100%', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, fontFamily: FONT, flex: 1 }}>📊 {T.title}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: FONT }}>{T.langT}:</Text>
              <Chip on={lang === 'fa'} label="فارسی" onPress={() => setLang('fa')} />
              <Chip on={lang === 'en'} label="English" onPress={() => setLang('en')} />
              <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: FONT, marginLeft: 6 }}>{T.orientT}:</Text>
              <Chip on={!land} label={T.portrait} onPress={() => setOrientation('portrait')} />
              <Chip on={land} label={T.landscape} onPress={() => setOrientation('landscape')} />
              <Pressable onPress={onClose} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, marginLeft: 6 }}>
                <Text style={{ color: colors.textMuted, fontFamily: FONT }}>✕</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, marginBottom: 4, fontFamily: FONT }}>{T.pickBefore}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {asc.map((x, i) => (
                <Pressable key={i} onPress={() => setBIdx(i)} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: i === bi ? '#64748b' : colors.surfaceAlt, marginRight: 4, marginLeft: 4 }}>
                  <Text style={{ fontSize: 8, color: i === bi ? '#fff' : colors.textMuted, fontFamily: FONT }}>{pd(x.analyzeTime)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, marginBottom: 4, fontFamily: FONT }}>{T.pickAfter}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {asc.map((x, i) => (
                <Pressable key={i} onPress={() => setAIdx(i)} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: i === ai ? '#10b981' : colors.surfaceAlt, marginRight: 4, marginLeft: 4 }}>
                  <Text style={{ fontSize: 8, color: i === ai ? '#fff' : colors.textMuted, fontFamily: FONT }}>{pd(x.analyzeTime)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput value={note} onChangeText={setNote} multiline placeholder={T.notePh} placeholderTextColor={colors.textMuted} style={{ width: '100%', minHeight: 62, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 8, fontSize: 10, color: colors.text, fontFamily: FONT, textAlign: isFa ? 'right' : 'left', marginBottom: 10 }} />
            {sameSel && <Text style={{ fontSize: 9, color: C.bad, marginBottom: 6, fontFamily: FONT }}>{T.same}</Text>}
            {err !== '' && <Text style={{ fontSize: 9, color: C.bad, marginBottom: 6, fontFamily: FONT }}>{err}</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Pressable
                  onPress={doPrint}
                  disabled={sameSel || !canExport}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                    paddingVertical: 11,
                    alignItems: 'center',
                    opacity: sameSel || !canExport ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: FONT }}>{T.printBtn}</Text>
                </Pressable>
                <Text style={{ fontSize: 7.5, color: colors.textMuted, marginTop: 4, fontFamily: FONT }}>{T.printHint}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Pressable
                  onPress={doDownload}
                  disabled={sameSel || busy || !canExport}
                  style={{
                    backgroundColor: '#0f172a',
                    borderRadius: 10,
                    paddingVertical: 11,
                    alignItems: 'center',
                    opacity: sameSel || busy || !canExport ? 0.5 : 1,
                  }}
                >
                  {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: FONT }}>{T.dlBtn}</Text>}
                </Pressable>
                <Text style={{ fontSize: 7.5, color: colors.textMuted, marginTop: 4, fontFamily: FONT }}>{T.dlHint}</Text>
              </View>
            </View>
          </View>
          {renderSheet('zr-compare-sheet', false)}
        </View>
      </ScrollView>
      {Platform.OS === 'web' && createPortalWeb && typeof document !== 'undefined' ? createPortalWeb(
        // @ts-ignore
        <View nativeID="zr-print-wrap" style={{ display: 'none' } as any}>{renderSheet('zr-print-sheet', true)}</View>, document.body
      ) : null}
    </FixedOverlay>
  );
}