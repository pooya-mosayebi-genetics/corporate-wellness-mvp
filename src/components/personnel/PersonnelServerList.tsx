import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { api } from '../../lib/api';
import Icon from '../ui/Icon';
import { maskNationalId, maskMobile, maskBirth } from '../../utils/pii';
import { faNum } from '../../utils/format';

const PAGE = 50;

interface PersonnelItem {
  id: string;
  nationalId: string;
  fullName: string;
  fullNamePrefixed?: string | null;
  mobile?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  position?: string | null;
  department?: string | null;
  organizationId?: string | null;
}

export default function PersonnelServerList() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);

  const [q, setQ] = useState('');
  const [items, setItems] = useState<PersonnelItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<PersonnelItem | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listPersonnel({ search: q.trim() || undefined, limit, offset: 0 });
      setItems(r.items as PersonnelItem[]);
      setTotal(r.total);
    } catch (e) {
      console.error('listPersonnel failed', e);
    } finally {
      setLoading(false);
    }
  }, [q, limit]);

  useEffect(() => {
    const t = setTimeout(() => fetch(), 300); // debounce
    return () => clearTimeout(t);
  }, [fetch]);

  /** expose refetch به بیرون (برای بعد از import) */
  useEffect(() => {
    (PersonnelServerList as any).__refetch = fetch;
  }, [fetch]);

  const toggleReveal = (id: string) => setRevealed((p) => ({ ...p, [id]: !p[id] }));

  const visible = useMemo(() => items.slice(0, limit), [items, limit]);

  const card = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  };

  return (
    <View style={{ marginTop: 8 }}>
      {/* نوار جستجو و شمارنده */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colors.surfaceAlt,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 10,
            paddingVertical: 8,
            fontSize: 11,
            color: colors.text,
          }}
          placeholder={isFa ? 'جست‌وجو: نام / کد ملی / موبایل' : 'Search name / ID / mobile'}
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={(t) => {
            setQ(t);
            setLimit(PAGE);
          }}
        />
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primarySoft }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{n(total)}</Text>
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : visible.length === 0 ? (
        <View style={[card, { alignItems: 'center', padding: 24 }]}>
          <Icon name="users" size={18} color={colors.textMuted} />
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 6 }}>
            {isFa ? 'رکوردی یافت نشد' : 'No records'}
          </Text>
        </View>
      ) : (
        visible.map((r) => {
          const rev = !!revealed[r.nationalId];
          return (
            <Pressable key={r.id} onPress={() => setSel(r)} style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                  <Icon name="profile" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                    {r.fullNamePrefixed || r.fullName}
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 1 }}>
                    {rev ? r.nationalId : maskNationalId(r.nationalId)}
                    {r.mobile ? ` · ${rev ? r.mobile : maskMobile(r.mobile)}` : ''}
                  </Text>
                  {r.department && (
                    <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 1 }}>
                      {r.position ? `${r.position} — ` : ''}
                      {r.department}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => toggleReveal(r.nationalId)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: rev ? colors.warningSoft : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: rev ? colors.warning : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 8, fontWeight: '700', color: rev ? colors.warning : colors.textSecondary }}>
                    {rev ? (isFa ? 'پنهان' : 'Mask') : isFa ? 'آشکار' : 'Reveal'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })
      )}

      {total > limit && (
        <Pressable
          onPress={() => setLimit((l) => l + PAGE)}
          style={{
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
            {isFa ? `بارگذاری بیشتر (${n(total - limit)} باقی‌مانده)` : `Load more (${total - limit} left)`}
          </Text>
        </Pressable>
      )}

      {/* Modal جزئیات */}
      <Modal visible={!!sel} transparent animationType="fade" onRequestClose={() => setSel(null)}>
        <Pressable
          onPress={() => setSel(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 16,
            }}
          >
            {sel && (() => {
              const rev = !!revealed[sel.nationalId];
              return (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 }}>
                    {sel.fullNamePrefixed || sel.fullName}
                  </Text>
                  {[
                    [isFa ? 'کد ملی' : 'National ID', rev ? sel.nationalId : maskNationalId(sel.nationalId)],
                    [isFa ? 'موبایل' : 'Mobile', sel.mobile ? (rev ? sel.mobile : maskMobile(sel.mobile)) : '—'],
                    [isFa ? 'تاریخ تولد' : 'Birth', sel.birthDate ? (rev ? sel.birthDate : maskBirth(sel.birthDate)) : '—'],
                    [isFa ? 'جنسیت' : 'Gender', sel.gender === 'Woman' ? (isFa ? 'زن' : 'Female') : isFa ? 'مرد' : 'Male'],
                    [isFa ? 'عنوان شغلی' : 'Position', sel.position || '—'],
                    [isFa ? 'واحد' : 'Department', sel.department || '—'],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{value}</Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => toggleReveal(sel.nationalId)}
                    style={{
                      marginTop: 10,
                      paddingVertical: 9,
                      borderRadius: 8,
                      backgroundColor: rev ? colors.warningSoft : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: rev ? colors.warning : colors.border,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: rev ? colors.warning : colors.textSecondary }}>
                      {rev ? (isFa ? 'پنهان‌سازی داده' : 'Mask data') : isFa ? 'آشکارسازی داده' : 'Reveal data'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSel(null)}
                    style={{ marginTop: 8, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? 'بستن' : 'Close'}</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function refetchPersonnelList() {
  const fn = (PersonnelServerList as any).__refetch;
  if (typeof fn === 'function') fn();
}