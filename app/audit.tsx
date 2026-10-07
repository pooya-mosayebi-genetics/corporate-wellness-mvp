import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAudit } from '../src/store/AuditContext';
import type { AuditEntry, Severity } from '../src/store/AuditContext';
import { usePersonnel } from '../src/store/PersonnelContext';
import { faNum } from '../src/utils/format';
import Icon from '../src/components/ui/Icon';
import { router } from 'expo-router';

const SEV_FA: Record<Severity, string> = { info: 'عادی', warn: 'هشدار', critical: 'بحرانی' };

export default function AuditScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { entries, log, clear, alerts, unseenAlerts, markAlertsSeen, securityTickets, closeTicket } = useAudit();
  const { getByNationalId } = usePersonnel();
  const [filter, setFilter] = useState<'all' | 'security' | 'info'>('all');

  const sevColor = (s: Severity) => (s === 'critical' ? colors.danger : s === 'warn' ? colors.warning : colors.textMuted);
  const actorName = (id: string) => {
    if (id === 'system') return isFa ? 'سیستم' : 'System';
    const rec = getByNationalId(id);
    return rec ? (rec.fullNamePrefixed || rec.fullName) : id;
  };
  const fmtTime = (iso: string) => new Date(iso).toLocaleString(isFa ? 'fa-IR' : 'en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const filtered = useMemo(() => {
    if (filter === 'security') return entries.filter((e) => e.severity !== 'info');
    if (filter === 'info') return entries.filter((e) => e.severity === 'info');
    return entries;
  }, [entries, filter]);

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };

  const EntryRow = ({ e }: { e: AuditEntry }) => (
    <View style={[card, { marginBottom: 6, padding: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: sevColor(e.severity) + '22', marginRight: 6 }}>
          <Text style={{ fontSize: 8, fontWeight: '800', color: sevColor(e.severity) }}>{SEV_FA[e.severity]}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.text }}>{e.messageFa}</Text>
        <Text style={{ fontSize: 8, color: colors.textMuted }}>{fmtTime(e.at)}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 4 }}>
        {isFa ? 'انجام‌دهنده' : 'Actor'}: {actorName(e.actorId)}
      </Text>
      {e.changes && e.changes.length > 0 && (
        <View style={{ marginTop: 6, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
          {e.changes.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: colors.textSecondary, width: 110 }}>{c.field}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, textDecorationLine: 'line-through' }}>{c.old}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginHorizontal: 4 }}>←</Text>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text }}>{c.new}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 10, paddingBottom: 30 }}>
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginRight: 8 }}>
            <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'لاگ ممیزی و آلرت‌های امنیتی' : 'Audit Log & Security Alerts'}</Text>
        </View>
        <Pressable onPress={() => { log({ action: 'audit:clear', entity: 'audit' }); clear(); }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.dangerSoft }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.danger }}>{isFa ? 'پاک‌کردن لاگ' : 'Clear'}</Text>
        </Pressable>
      </View>

      {/* ✅ آلرت‌های دیده‌نشده */}
      {unseenAlerts.length > 0 && (
        <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + '55', padding: 10, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="shield" size={14} color={colors.danger} />
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: colors.danger, marginLeft: 6, marginRight: 6 }}>
              {isFa ? `${n(unseenAlerts.length)} آلرت امنیتی دیده‌نشده` : `${unseenAlerts.length} unseen security alerts`}
            </Text>
            <Pressable onPress={markAlertsSeen} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.surface }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text }}>{isFa ? 'علامت‌گذاری به‌عنوان دیده‌شده' : 'Mark seen'}</Text>
            </Pressable>
          </View>
          {unseenAlerts.slice(0, 3).map((e) => (
            <Text key={e.id} style={{ fontSize: 9, color: colors.danger, marginTop: 4 }}>• {e.messageFa} — {actorName(e.actorId)}</Text>
          ))}
        </View>
      )}

      {/* ✅ تیکت‌های امنیتی */}
      {securityTickets.length > 0 && (
        <View style={[card, { marginBottom: 8 }]}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: 6 }}>{isFa ? 'تیکت‌های امنیتی' : 'Security Tickets'}</Text>
          {securityTickets.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: e.ticketClosed ? colors.textMuted : colors.danger, marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 9, color: e.ticketClosed ? colors.textMuted : colors.text }}>{e.messageFa}</Text>
              {!e.ticketClosed ? (
                <Pressable onPress={() => closeTicket(e.id)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'بستن تیکت' : 'Close'}</Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'بسته‌شده' : 'Closed'}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* فیلتر */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
        {(['all', 'security', 'info'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: filter === f ? colors.primary : colors.surface, borderWidth: 1, borderColor: filter === f ? colors.primary : colors.cardBorder }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: filter === f ? '#FFFFFF' : colors.textSecondary }}>
              {f === 'all' ? (isFa ? 'همه' : 'All') : f === 'security' ? (isFa ? 'امنیتی' : 'Security') : isFa ? 'عادی' : 'Info'}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 && (
        <View style={[card, { alignItems: 'center', padding: 24 }]}>
          <Icon name="shield" size={18} color={colors.textMuted} />
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 6 }}>{isFa ? 'رکوردی نیست' : 'No entries'}</Text>
        </View>
      )}
      {filtered.map((e) => <EntryRow key={e.id} e={e} />)}
    </ScrollView>
  );
}