import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAuth } from '../src/store/AuthContext';
import { canAccess, homeRouteFor } from '../src/utils/access';
import { logger, type LogEntry, type LogLevel } from '../src/utils/logger';
import { maskNationalId } from '../src/utils/nationalId';

const Z_RADIUS = { card: 14, inner: 12, control: 10, chip: 999 };
const Z_SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: '#3b82f6',
  warn: '#eab308',
  error: '#ef4444',
};

export default function LogsScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { session } = useAuth();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState('');

  // ✅ PATCH: گیت بر اساس Permission جدید
  const allowed = canAccess(session?.role, 'logs');

  // ✅ PATCH: redirect فقط داخل useEffect
  useEffect(() => {
    if (session && !allowed) {
      router.replace(homeRouteFor(session.role));
    }
  }, [session, allowed]);

  useEffect(() => {
    if (!allowed) return;
    logger.getLogs().then(setLogs);
    const un = logger.subscribe(() => {
      logger.getLogs().then(setLogs);
    });
    return un;
  }, [allowed]);

  const filtered = useMemo(() => {
    let out = filter === 'all' ? logs : logs.filter((l) => l.level === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (l) =>
          (l.message || '').toLowerCase().includes(q) ||
          (l.userId || '').toLowerCase().includes(q) ||
          (l.screen || '').toLowerCase().includes(q) ||
          (l.role || '').toLowerCase().includes(q),
      );
    }
    return out;
  }, [logs, filter, search]);

  const download = async () => {
    const text = await logger.exportJson();
    if (typeof window !== 'undefined') {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zharfa-logs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  if (!allowed) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Z_SPACE.md, paddingBottom: 60 }}
    >
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: Z_RADIUS.control,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.text }}>{isFa ? '→' : '←'}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            📜 {isFa ? 'لاگ‌های سیستم' : 'System Logs'}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
            {isFa ? `${filtered.length} رکورد` : `${filtered.length} entries`}
          </Text>
        </View>
        <Pressable
          onPress={download}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: Z_RADIUS.control,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
            ⬇ {isFa ? 'خروجی' : 'Export'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => logger.clear()}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: Z_RADIUS.control,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.danger, fontSize: 10, fontWeight: '800' }}>
            🗑 {isFa ? 'پاک‌کردن' : 'Clear'}
          </Text>
        </Pressable>
      </View>

      {/* جستجو */}
      <TextInput
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: Z_RADIUS.control,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: Z_SPACE.sm,
          paddingVertical: 10,
          fontSize: 11,
          color: colors.text,
          marginBottom: Z_SPACE.sm,
        }}
        placeholder={isFa ? '🔍 جستجو بر اساس کاربر / صفحه / پیام...' : '🔍 Search user / screen / message...'}
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* فیلتر سطح */}
      <View style={{ flexDirection: 'row', gap: Z_SPACE.xs, marginBottom: Z_SPACE.md }}>
        {(['all', 'info', 'warn', 'error'] as (LogLevel | 'all')[]).map((lv) => (
          <Pressable
            key={lv}
            onPress={() => setFilter(lv)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: Z_RADIUS.chip,
              backgroundColor: filter === lv ? colors.primary : colors.surfaceAlt,
              borderWidth: 1,
              borderColor: filter === lv ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: filter === lv ? '#fff' : colors.textSecondary,
              }}
            >
              {lv === 'all' ? (isFa ? 'همه' : 'All') : lv}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* لیست */}
      {filtered.length === 0 ? (
        <View
          style={{
            padding: Z_SPACE.xl,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: Z_RADIUS.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}
        >
          <Text style={{ fontSize: 24 }}>📭</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: Z_SPACE.sm }}>
            {isFa ? 'لاگی مطابق فیلتر نیست' : 'No matching logs'}
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: Z_RADIUS.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: Z_SPACE.md,
          }}
        >
          {filtered.map((l) => (
            <View
              key={l.id}
              style={{
                paddingVertical: Z_SPACE.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: LEVEL_COLOR[l.level],
                    marginRight: Z_SPACE.sm,
                  }}
                />
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: colors.text }}>{l.message}</Text>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>
                  {new Date(l.at).toLocaleString(isFa ? 'fa-IR' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {/* ردیف کاربر/نقش/صفحه */}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: Z_SPACE.xs,
                  marginTop: Z_SPACE.xs,
                  marginLeft: 16,
                }}
              >
                {l.userId && (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: Z_RADIUS.chip,
                      backgroundColor: colors.primary + '18',
                    }}
                  >
                    <Text style={{ fontSize: 8, fontWeight: '700', color: colors.primary }}>
                      👤 {maskNationalId(l.userId)}
                    </Text>
                  </View>
                )}
                {l.role && (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: Z_RADIUS.chip,
                      backgroundColor: colors.accent + '18',
                    }}
                  >
                    <Text style={{ fontSize: 8, fontWeight: '700', color: colors.accent }}>{l.role}</Text>
                  </View>
                )}
                {l.screen && (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: Z_RADIUS.chip,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <Text style={{ fontSize: 8, color: colors.textSecondary }}>📍 {l.screen}</Text>
                  </View>
                )}
              </View>

              {!!l.meta && (
                <Text
                  style={{
                    fontSize: 8,
                    color: colors.textMuted,
                    marginTop: Z_SPACE.xs,
                    marginLeft: 16,
                  }}
                  numberOfLines={3}
                >
                  {l.meta}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}