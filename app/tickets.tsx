import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useAuth } from '../src/store/AuthContext';
import { SectionTitle, IconTile } from '../src/components/ui/Card';
import Icon from '../src/components/ui/Icon';
import { faNum } from '../src/utils/format';
import { maskNationalId } from '../src/utils/nationalId';
import { router } from 'expo-router';

type Status = 'open' | 'answered' | 'closed';

export default function TicketsScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const { state, addTicket, addTicketMessage, setTicketStatus } = useWellness();
  const { session } = useAuth();
  const isStaff = session?.role === 'coach' || session?.role === 'admin';
  const myId = session?.nationalId ?? '';

  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState('');

  const base = useMemo(() => (isStaff ? state.tickets : state.tickets.filter((t) => t.clientNationalId === myId)), [state.tickets, isStaff, myId]);
  const tickets = useMemo(() => {
    let l = base;
    if (filter !== 'all') l = l.filter((t) => t.status === filter);
    return [...l].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [base, filter]);
  const counts = useMemo(() => ({ open: base.filter((t) => t.status === 'open').length, answered: base.filter((t) => t.status === 'answered').length, closed: base.filter((t) => t.status === 'closed').length }), [base]);
  const selected = state.tickets.find((t) => t.id === selectedId) || null;

  const statusColor = (s: Status) => (s === 'open' ? colors.warning : s === 'answered' ? colors.success : colors.textMuted);
  const statusLabel = (s: Status) => (s === 'open' ? (isFa ? 'باز' : 'Open') : s === 'answered' ? (isFa ? 'پاسخ‌داده' : 'Answered') : isFa ? 'بسته' : 'Closed');
  const fmtTime = (iso: string) => n(new Date(iso).toLocaleTimeString(isFa ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { day: 'numeric', month: 'short' });

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const inp = { backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 8, fontSize: 11, color: colors.text };

  const create = () => {
    if (!subject.trim() || !body.trim()) return;
    const now = new Date().toISOString();
    addTicket({ id: `tk-${Date.now()}`, clientNationalId: myId, subject: subject.trim(), status: 'open', createdAt: now, updatedAt: now, messages: [{ id: `msg-${Date.now()}`, authorRole: 'user', authorId: myId, text: body.trim(), at: now }] } as any);
    setSubject(''); setBody(''); setShowCreate(false);
  };
  const sendReply = () => {
    if (!reply.trim() || !selected) return;
    addTicketMessage(selected.id, { id: `msg-${Date.now()}`, authorRole: isStaff ? 'coach' : 'user', authorId: myId, text: reply.trim(), at: new Date().toISOString() } as any);
    setReply('');
  };

  // نمای رشتهٔ گفتگو
  if (selected) {
    return (
      <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => setSelectedId(null)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 8, marginRight: 8 }}>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{selected.subject}</Text>
            <Text style={{ fontSize: 8, color: colors.textMuted }}>{isStaff ? maskNationalId(selected.clientNationalId) : fmtDate(selected.createdAt)}</Text>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: statusColor(selected.status) + '22' }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: statusColor(selected.status) }}>{statusLabel(selected.status)}</Text>
          </View>
        </View>

        {selected.messages.map((m) => {
          const isCoach = m.authorRole === 'coach';
          return (
            <View key={m.id} style={{ alignSelf: isCoach ? 'flex-start' : 'flex-end', maxWidth: '85%', backgroundColor: isCoach ? colors.primarySoft : colors.surfaceAlt, borderRadius: 10, padding: 8, marginBottom: 5, borderWidth: 1, borderColor: colors.cardBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <IconTile icon={isCoach ? 'coach' : 'profile'} tone={isCoach ? colors.primary : colors.chart[2]} size={16} />
                <Text style={{ fontSize: 8, fontWeight: '700', color: isCoach ? colors.primary : colors.textSecondary }}>{isCoach ? (isFa ? 'کارشناس' : 'Coach') : isFa ? 'کاربر' : 'User'}</Text>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{fmtTime(m.at)}</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.text, lineHeight: 16 }}>{m.text}</Text>
            </View>
          );
        })}

        {isStaff && selected.status !== 'closed' && (
          <Pressable onPress={() => setTicketStatus(selected.id, 'closed')} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? '🔒 بستن تیکت' : ' Close'}</Text>
          </Pressable>
        )}
        {isStaff && selected.status === 'closed' && (
          <Pressable onPress={() => setTicketStatus(selected.id, 'open')} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? '🔓 بازگشایی' : ' Reopen'}</Text>
          </Pressable>
        )}

        {(selected.status !== 'closed' || !isStaff) && (
          <View style={card}>
            <TextInput style={[inp, { minHeight: 50, marginBottom: 5 }]} multiline placeholder={isFa ? 'پاسخ...' : 'Reply...'} placeholderTextColor={colors.textMuted} value={reply} onChangeText={setReply} />
            <Pressable onPress={sendReply} disabled={!reply.trim()} style={{ backgroundColor: reply.trim() ? colors.primary : colors.border, borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '📤 ارسال' : ' Send'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  }

  // نمای لیست
  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 80 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'تیکت‌ها' : 'Tickets'}</Text>
        {!isStaff && (
          <Pressable onPress={() => setShowCreate((v) => !v)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.primary }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{showCreate ? (isFa ? 'بستن' : 'Close') : isFa ? '+ تیکت جدید' : '+ New'}</Text>
          </Pressable>
        )}
      </View>

      {showCreate && !isStaff && (
        <View style={[card, { marginBottom: 6 }]}>
          <SectionTitle>{isFa ? 'تیکت جدید' : 'New Ticket'}</SectionTitle>
          <TextInput style={[inp, { marginBottom: 5 }]} placeholder={isFa ? 'موضوع *' : 'Subject *'} placeholderTextColor={colors.textMuted} value={subject} onChangeText={setSubject} />
          <TextInput style={[inp, { minHeight: 50, marginBottom: 5 }]} multiline placeholder={isFa ? 'شرح *' : 'Description *'} placeholderTextColor={colors.textMuted} value={body} onChangeText={setBody} />
          <Pressable onPress={create} disabled={!subject.trim() || !body.trim()} style={{ backgroundColor: subject.trim() && body.trim() ? colors.primary : colors.border, borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '✓ ثبت' : ' Submit'}</Text>
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: 'row', marginHorizontal: -3, marginBottom: 6 }}>
        {([
          { key: 'all', label: isFa ? 'همه' : 'All', value: counts.open + counts.answered + counts.closed, tone: colors.primary },
          { key: 'open', label: isFa ? 'باز' : 'Open', value: counts.open, tone: colors.warning },
          { key: 'answered', label: isFa ? 'پاسخ' : 'Answered', value: counts.answered, tone: colors.success },
          { key: 'closed', label: isFa ? 'بسته' : 'Closed', value: counts.closed, tone: colors.textMuted },
        ] as const).map((t) => (
          <Pressable key={t.key} onPress={() => setFilter(t.key as any)} style={{ flex: 1, padding: 3 }}>
            <View style={[card, { backgroundColor: filter === t.key ? t.tone : colors.surface, alignItems: 'center' }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: filter === t.key ? '#FFFFFF' : t.tone }}>{n(t.value)}</Text>
              <Text style={{ fontSize: 8, color: filter === t.key ? '#FFFFFFCC' : colors.textMuted }}>{t.label}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={card}>
        <SectionTitle>{isFa ? `نتایج (${n(tickets.length)})` : `Results (${tickets.length})`}</SectionTitle>
        {tickets.length === 0 ? (
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 14, alignItems: 'center' }}>
            <Icon name="ticket" size={18} color={colors.textMuted} />
            <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 3 }}>{isFa ? 'تیکتی نیست' : 'No tickets'}</Text>
          </View>
        ) : (
          tickets.map((t, i, arr) => (
            <Pressable key={t.id} onPress={() => setSelectedId(t.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <IconTile icon="ticket" tone={statusColor(t.status)} size={26} />
              <View style={{ flex: 1, marginLeft: 7 }}>
                <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{t.subject}</Text>
                <Text numberOfLines={1} style={{ fontSize: 8, color: colors.textSecondary }}>
                  {isStaff ? `${maskNationalId(t.clientNationalId)} · ` : ''}{t.messages[t.messages.length - 1]?.text ?? ''}
                </Text>
              </View>
              <Text style={{ fontSize: 8, color: colors.textMuted, marginLeft: 6 }}>{fmtDate(t.updatedAt)}</Text>
              <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: statusColor(t.status) + '22' }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: statusColor(t.status) }}>{statusLabel(t.status)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}