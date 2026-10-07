import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';

export type IconName =
  | 'home' | 'analysis' | 'diet' | 'meal' | 'tips' | 'reports' | 'calendar'
  | 'users' | 'coach' | 'org' | 'import' | 'food' | 'studio' | 'shield'
  | 'ticket' | 'profile' | 'water' | 'flame' | 'protein' | 'sleep' | 'stress'
  | 'back' | 'close' | 'plus' | 'trash' | 'edit' | 'share' | 'like' | 'dislike'
  | 'download' | 'upload' | 'search' | 'settings' | 'logout' | 'chart'
  | 'trend' | 'heart' | 'check' | 'alert' | 'lock' | 'eye' | 'eyeOff'
  | 'chevronBack' | 'chevronForward' | 'menu' | 'sunny' | 'moon';

const MAP: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  analysis: 'body',
  diet: 'restaurant',
  meal: 'nutrition',
  tips: 'bulb',
  reports: 'stats-chart',
  calendar: 'calendar',
  users: 'people',
  coach: 'flag',
  org: 'business',
  import: 'download',
  food: 'nutrition',
  studio: 'color-palette',
  shield: 'shield-checkmark',
  ticket: 'ticket',
  profile: 'person',
  water: 'water',
  flame: 'flame',
  protein: 'fish',
  sleep: 'moon',
  stress: 'pulse',
  back: 'arrow-back',
  close: 'close',
  plus: 'add',
  trash: 'trash',
  edit: 'create',
  share: 'share-social',
  like: 'thumbs-up',
  dislike: 'thumbs-down',
  download: 'download',
  upload: 'upload',
  search: 'search',
  settings: 'settings',
  logout: 'log-out',
  chart: 'bar-chart',
  trend: 'trending-up',
  heart: 'heart',
  check: 'checkmark',
  alert: 'alert-circle',
  lock: 'lock-closed',
  eye: 'eye',
  eyeOff: 'eye-off',
  chevronBack: 'chevron-back',
  chevronForward: 'chevron-forward',
  menu: 'menu',
  sunny: 'sunny',
  moon: 'moon',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 18, color }: IconProps) {
  const { colors } = useTheme();
  return <Ionicons name={MAP[name]} size={size} color={color ?? colors.textSecondary} />;
}