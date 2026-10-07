import { View, Text } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

interface ChartTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  containerWidth: number;
  title: string;
  rows: TooltipRow[];
}

const CARD_W = 190;

export default function ChartTooltip({
  visible,
  x,
  y,
  containerWidth,
  title,
  rows,
}: ChartTooltipProps) {
  const { colors } = useTheme();
  if (!visible) return null;

  const estHeight = 34 + rows.length * 17;
  const left = Math.min(Math.max(x - CARD_W / 2, 4), Math.max(containerWidth - CARD_W - 4, 4));
  const top = Math.max(y - estHeight - 6, 4);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: CARD_W,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 10,
        shadowColor: '#000000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
        zIndex: 20,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
        {title}
      </Text>
      {rows.map((r, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {r.color ? (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: r.color,
                  marginRight: 5,
                }}
              />
            ) : null}
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>{r.label}</Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}