import { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, TextInput, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { usePersonnel } from '../src/store/PersonnelContext';
import { useBodyAnalysis } from '../src/store/BodyAnalysisContext';
import { useAuth } from '../src/store/AuthContext';
import { usePermissions } from '../src/hooks/usePermissions';
import { useAssignments } from '../src/store/AssignmentsContext';
import { faNum, faDigits } from '../src/utils/format';
import Icon from '../src/components/ui/Icon'; // Added for icons

const ZDL = {
  radius: { card: 16, inner: 12, control: 10, chip: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  shadow: { shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
};
const PAGE = 30; // Smaller page size for smoother initial load on mobile

type Client = {
  key: string;
  nationalId: string;
  mobile: string;
  display: string;
  gender: 'Man' | 'Woman' | '';
  age: number;
  last: string;
  count: number;
};

const toEnDigits = (s: any) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۴۵۶۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٤٥٦٨٩'.indexOf(d)));
const isLatin = (s: any) => /[a-zA-Z]/.test(String(s ?? ''));
const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

// Helper to normalize gender strings from various sources
function normalizeGenderVal(g: any): 'Man' | 'Woman' | '' {
  const val = String(g || '').toLowerCase();
  if (val === 'man' || val === 'male') return 'Man';
  if (val === 'woman' || val === 'female') return 'Woman';
  return '';
}

// ✅ Optimized Row Component with Memoization
const ClientRow = memo(function ClientRow({ c, colors, isFa, n, onPress, isMobile }: any) {
  const initial = String(c.display || '?').trim().charAt(0);
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: isMobile ? ZDL.space.md : ZDL.space.sm,
          backgroundColor: colors.surface, 
          borderRadius: ZDL.radius.card,
          borderWidth: 1, 
          borderColor: pressed ? colors.primary + '44' : colors.cardBorder,
          padding: isMobile ? ZDL.space.lg : ZDL.space.md, // More padding on mobile
          marginBottom: ZDL.space.sm, 
          ...ZDL.shadow,
          opacity: pressed ? 0.9 : 1,
        }
      ]}
    >
      {/* Avatar Circle */}
      <View style={{ 
        width: isMobile ? 48 : 40, 
        height: isMobile ? 48 : 40, 
        borderRadius: ZDL.radius.inner, 
        backgroundColor: colors.primary + '18', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Text style={{ fontSize: isMobile ? 18 : 15, fontWeight: '800', color: colors.primary }}>{initial}</Text>
      </View>
      
      {/* Info Block */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 14 : 12, fontWeight: '800', color: colors.text }} numberOfLines={1}>
          {c.display}
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
           <Text style={{ fontSize: isMobile ? 10 : 8, color: colors.textMuted }}>
            {c.nationalId ? faDigits(c.nationalId, isFa) : '—'} • {faDigits(toEnDigits(c.mobile), isFa)}
          </Text>
        </View>

        {/* Tags Row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {c.gender ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: ZDL.radius.chip, backgroundColor: c.gender === 'Woman' ? '#ec489922' : colors.primary + '18' }}>
              <Text style={{ fontSize: isMobile ? 9 : 7, fontWeight: '600', color: c.gender === 'Woman' ? '#ec4899' : colors.primary }}>
                {c.gender === 'Woman' ? (isFa ? 'خانم' : 'Female') : isFa ? 'آقا' : 'Male'}
              </Text>
            </View>
          ) : null}
          
          {c.age ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: ZDL.radius.chip, backgroundColor: colors.surfaceAlt }}>
              <Text style={{ fontSize: isMobile ? 9 : 7, color: colors.textSecondary }}>{n(c.age)} {isFa ? 'سال' : 'y'}</Text>
            </View>
          ) : null}
          
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: ZDL.radius.chip, backgroundColor: colors.accentSoft }}>
            <Text style={{ fontSize: isMobile ? 9 : 7, fontWeight: '700', color: colors.accent }}>
              {n(c.count)} {isFa ? 'آنالیز' : 'analyses'}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Chevron Indicator */}
      <Icon name="chevronForward" size={isMobile ? 20 : 16} color={colors.textMuted} />
    </Pressable>
  );
});

export default function ClientsScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  
  // 🆕 Responsive Detection
  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  const { can, scope } = usePermissions();
  const { clientIdsFor } = useAssignments();
  const { session } = useAuth();

  const bodyCtx: any = useBodyAnalysis();
  const personnelCtx: any = usePersonnel();
  
  // Data Sources
  const allAnalyses: any[] = bodyCtx.analyses ?? bodyCtx.records ?? bodyCtx.list ?? [];
  const personnelList: any[] = personnelCtx.personnel ?? personnelCtx.list ?? personnelCtx.items ?? [];

  // Assigned IDs Logic
  const assignedIds = useMemo(() => {
    const ids = clientIdsFor(session?.nationalId ?? '');
    return new Set(ids.map((id: string) => String(id)));
  }, [clientIdsFor, session]);

  const clientScope = scope('client.record.view' as any);
  
  // Determine if current user is an admin who should see everyone regardless of assignment
  const isAdminRole = ['super_admin', 'admin', 'it_admin'].includes(String(session?.role || ''));

  // Map Personnel by National ID for quick lookup
  const personMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of personnelList) {
      const nid = String(p?.nationalId ?? p?.nationalCode ?? p?.code ?? '');
      if (nid) m.set(nid, p);
    }
    return m;
  }, [personnelList]);

  // Build Clients List: Merge Personnel + Analyses
  const clients = useMemo<Client[]>(() => {
    const map = new Map<string, Client>();

    // 1. Seed from Personnel (Ensure everyone appears, even without analysis)
    for (const p of personnelList) {
      const nid = String(p?.nationalId ?? '');
      if (!nid) continue;
      
      map.set(nid, {
        key: nid,
        nationalId: nid,
        mobile: String(p?.mobile ?? ''),
        display: String(p?.fullNamePrefixed || p?.fullName || 'بدون نام'),
        gender: normalizeGenderVal(p?.gender),
        age: Number(p?.age) || 0, // If birthDate exists, calculate age here if needed, otherwise 0
        last: '', // No analysis yet
        count: 0,
      });
    }

    // 2. Enrich with Analysis Data
    for (const r of allAnalyses) {
      const nid = String(r.nationalId || '');
      if (!nid) continue;

      const t = new Date(r.analyzeTime || r.createdAt || 0).getTime();
      const prev = map.get(nid);

      if (prev) {
        // Update existing entry
        prev.count += 1;
        if (t > new Date(prev.last || 0).getTime()) {
          prev.last = r.analyzeTime || r.createdAt;
          // Prefer gender/age from latest analysis if available and valid
          const gNorm = normalizeGenderVal(r.gender);
          if (gNorm) prev.gender = gNorm;
          const aNum = Number(r.age);
          if (aNum > 0) prev.age = aNum;
        }
      } else {
        // Create new entry if somehow not in personnel list (edge case)
        map.set(nid, {
          key: nid,
          nationalId: nid,
          mobile: String(r.mobile || ''),
          display: String(r.fullName || 'بدون نام'),
          gender: normalizeGenderVal(r.gender),
          age: Number(r.age) || 0,
          last: r.analyzeTime || r.createdAt,
          count: 1,
        });
      }
    }

    return [...map.values()];
  }, [allAnalyses, personnelList]);

  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<'all' | 'Man' | 'Woman'>('all');
  const [ageF, setAgeF] = useState<'all' | 'u30' | '30-40' | '40-50' | '50p'>('all');
  const [lastF, setLastF] = useState<'all' | '30' | '90' | 'older' | 'none'>('all');
  const [sortKey, setSortKey] = useState<'last' | 'name' | 'mobile' | 'age'>('last');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  
  // ✅ Collapsible Filters for Mobile
  const [showFilters, setShowFilters] = useState(!isMobile); // Open by default on Desktop, Closed on Mobile
  
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => { setLimit(PAGE); }, [search, gender, ageF, lastF, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const q = toEnDigits(search).trim().toLowerCase();
    
    let list = clients;

    // Apply Assignment Scope Filter ONLY IF NOT ADMIN
    // Admins always see everything. Non-admins respect the 'assigned' scope.
    if (!isAdminRole && clientScope === 'assigned') {
      list = list.filter((c) => c.nationalId && assignedIds.has(c.nationalId));
    }
    
    list = list.filter((c) => {
      if (gender !== 'all' && c.gender !== gender) return false;
      
      if (ageF !== 'all') {
        const a = c.age || 0;
        if (ageF === 'u30' && a >= 30) return false;
        if (ageF === '30-40' && (a < 30 || a >= 40)) return false;
        if (ageF === '40-50' && (a < 40 || a >= 50)) return false;
        if (ageF === '50p' && a < 50) return false;
      }
      
      if (lastF !== 'all') {
        const has = !!c.last;
        const d = has ? daysSince(c.last) : Infinity;
        if (lastF === 'none' && has) return false;
        if (lastF !== 'none' && !has) return false;
        if (lastF === '30' && d > 30) return false;
        if (lastF === '90' && d > 90) return false;
        if (lastF === 'older' && d <= 90) return false;
      }
      
      if (q) {
        const hay = toEnDigits([c.display, c.nationalId, c.mobile].join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'name') return String(a.display).localeCompare(String(b.display), 'fa') * dir;
      if (sortKey === 'mobile') return String(a.mobile).localeCompare(String(b.mobile)) * dir;
      if (sortKey === 'age') return ((a.age || 0) - (b.age || 0)) * dir;
      // Default sort by Last Analysis Date (newest first)
      return (new Date(a.last || 0).getTime() - new Date(b.last || 0).getTime()) * dir;
    });
    
    return list;
  }, [clients, assignedIds, clientScope, search, gender, ageF, lastF, sortKey, sortDir, isAdminRole]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const activeFilters = (gender !== 'all' ? 1 : 0) + (ageF !== 'all' ? 1 : 0) + (lastF !== 'all' ? 1 : 0);

  const FChip = ({ active, label, onPress }: any) => (
    <Pressable 
      onPress={onPress} 
      style={{ 
        paddingHorizontal: 12, 
        paddingVertical: 8, // Larger touch area
        borderRadius: ZDL.radius.chip, 
        backgroundColor: active ? colors.primary : colors.surfaceAlt, 
        borderWidth: 1, 
        borderColor: active ? colors.primary : colors.border,
        minWidth: 60,
        alignItems: 'center'
      }}
    >
      <Text style={{ fontSize: isMobile ? 11 : 9, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header Section */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: ZDL.space.md, 
        paddingTop: ZDL.space.md,
        paddingBottom: ZDL.space.sm
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: isMobile ? 20 : 16, fontWeight: '900', color: colors.text }}>
            {isFa ? 'مراجعه‌کنندگان' : 'Clients'}
          </Text>
          <Text style={{ fontSize: isMobile ? 11 : 8, color: colors.textMuted, marginTop: 2 }}>
            {n(filtered.length)} {isFa ? 'مراجع' : 'clients'}
            {!isAdminRole && clientScope === 'assigned' && (
              <Text style={{ color: colors.primary }}> • {isFa ? 'اختصاصی من' : 'My clients'}</Text>
            )}
          </Text>
        </View>
        
        {/* Filter Toggle Button */}
        <Pressable 
          onPress={() => setShowFilters((v) => !v)} 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 6, 
            paddingHorizontal: 14, 
            paddingVertical: 10, 
            borderRadius: ZDL.radius.control, 
            backgroundColor: showFilters ? colors.primary : colors.surface, 
            borderWidth: 1, 
            borderColor: showFilters ? colors.primary : colors.border,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2
          }}
        >
          <Icon name="filter" size={16} color={showFilters ? '#fff' : colors.textSecondary} />
          <Text style={{ fontSize: isMobile ? 12 : 10, fontWeight: '700', color: showFilters ? '#fff' : colors.textSecondary }}>
            {isFa ? 'فیلتر' : 'Filter'}
          </Text>
          {activeFilters > 0 && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: ZDL.radius.chip, backgroundColor: showFilters ? '#ffffff33' : colors.dangerSoft }}>
              <Text style={{ fontSize: 8, fontWeight: '800', color: showFilters ? '#fff' : colors.danger }}>{n(activeFilters)}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: colors.surface, 
        borderRadius: ZDL.radius.control, 
        borderWidth: 1, 
        borderColor: colors.border, 
        paddingHorizontal: 12, 
        marginHorizontal: ZDL.space.md,
        marginBottom: ZDL.space.md,
        height: isMobile ? 48 : 40 // Standard input height
      }}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={isFa ? 'جستجو: نام، کد ملی یا موبایل…' : 'Search name, ID, mobile…'}
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: isMobile ? 14 : 12, color: colors.text }}
          autoCorrect={false}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <Icon name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Filters Panel (Collapsible) */}
      {showFilters && (
        <View style={{ 
          backgroundColor: colors.surface, 
          borderRadius: ZDL.radius.card, 
          borderWidth: 1, 
          borderColor: colors.cardBorder, 
          padding: ZDL.space.md, 
          marginHorizontal: ZDL.space.md, 
          marginBottom: ZDL.space.md, 
          gap: ZDL.space.sm,
          ...ZDL.shadow
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 10, color: colors.textMuted, width: 60 }}>{isFa ? 'جنسیت' : 'Gender'}</Text>
            <FChip active={gender === 'all'} label={isFa ? 'همه' : 'All'} onPress={() => setGender('all')} />
            <FChip active={gender === 'Woman'} label={isFa ? 'خانم' : 'Female'} onPress={() => setGender('Woman')} />
            <FChip active={gender === 'Man'} label={isFa ? 'آقا' : 'Male'} onPress={() => setGender('Man')} />
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 10, color: colors.textMuted, width: 60 }}>{isFa ? 'سن' : 'Age'}</Text>
            <FChip active={ageF === 'all'} label={isFa ? 'همه' : 'All'} onPress={() => setAgeF('all')} />
            <FChip active={ageF === 'u30'} label="<30" onPress={() => setAgeF('u30')} />
            <FChip active={ageF === '30-40'} label="30-40" onPress={() => setAgeF('30-40')} />
            <FChip active={ageF === '40-50'} label="40-50" onPress={() => setAgeF('40-50')} />
            <FChip active={ageF === '50p'} label="50+" onPress={() => setAgeF('50p')} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
             <Text style={{ fontSize: 10, color: colors.textMuted, width: 60 }}>{isFa ? 'آخرین' : 'Last'}</Text>
             <FChip active={lastF === 'all'} label={isFa ? 'همه' : 'All'} onPress={() => setLastF('all')} />
             <FChip active={lastF === '30'} label="30d" onPress={() => setLastF('30')} />
             <FChip active={lastF === '90'} label="90d" onPress={() => setLastF('90')} />
             <FChip active={lastF === 'older'} label={isFa ? 'قدیمی' : 'Older'} onPress={() => setLastF('older')} />
          </View>
          
          {activeFilters > 0 && (
            <Pressable 
              onPress={() => { setGender('all'); setAgeF('all'); setLastF('all'); }} 
              style={{ 
                borderRadius: ZDL.radius.control, 
                borderWidth: 1, 
                borderColor: colors.border, 
                paddingVertical: 10, 
                alignItems: 'center',
                backgroundColor: colors.surfaceAlt,
                marginTop: 4
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                {isFa ? 'پاک کردن فیلترها' : 'Clear Filters'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* The List */}
      <FlatList
        data={visible}
        keyExtractor={(c: Client) => c.key}
        renderItem={({ item }: any) => (
          <ClientRow 
            c={item} 
            colors={colors} 
            isFa={isFa} 
            n={n} 
            isMobile={isMobile}
            onPress={() => router.push(`/client-detail?nationalId=${encodeURIComponent(item.nationalId || item.key)}`)} 
          />
        )}
        contentContainerStyle={{ 
          paddingHorizontal: ZDL.space.md, 
          paddingBottom: ZDL.space.xl,
          paddingTop: 4
        }}
        // ✅ Performance Tuning
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        // Infinite Scroll Logic
        onEndReached={() => setLimit((l) => l + PAGE)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={{ 
            backgroundColor: colors.surface, 
            borderRadius: ZDL.radius.card, 
            borderWidth: 1, 
            borderColor: colors.cardBorder, 
            padding: 40, 
            alignItems: 'center', 
            marginTop: ZDL.space.lg 
          }}>
            <Icon name="users" size={40} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 12, textAlign: 'center' }}>
              {isFa ? 'موردی با این مشخصات یافت نشد.' : 'No matches found.'}
            </Text>
            {(search || activeFilters > 0) && (
              <Pressable 
                onPress={() => { setSearch(''); setGender('all'); setAgeF('all'); setLastF('all'); }} 
                style={{ 
                  marginTop: 16, 
                  paddingHorizontal: 16, 
                  paddingVertical: 10, 
                  borderRadius: ZDL.radius.control, 
                  backgroundColor: colors.primary 
                }}
              >
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>
                  {isFa ? 'حذف فیلترها' : 'Clear filters'}
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListFooterComponent={() =>
          filtered.length === 0 ? null : (
            <View style={{ paddingVertical: ZDL.space.md, alignItems: 'center' }}>
              {limit < filtered.length ? (
                <Pressable 
                  onPress={() => setLimit((l) => l + PAGE)} 
                  style={{ 
                    borderRadius: ZDL.radius.control, 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    backgroundColor: colors.surface, 
                    paddingVertical: 12, 
                    paddingHorizontal: 24,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    {isFa ? `نمایش ${n(PAGE)} مورد دیگر` : `Load ${PAGE} more`}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                    ({n(visible.length)} / {n(filtered.length)})
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center' }}>
                  {isFa ? `پایان لیست — ${n(filtered.length)} مورد` : `End of list — ${filtered.length}`}
                </Text>
              )}
            </View>
          )
        }
      />
    </View>
  );
}