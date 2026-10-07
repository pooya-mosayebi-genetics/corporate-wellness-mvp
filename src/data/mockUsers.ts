import type { CoachUser } from '../types/coach';
import { calculateRiskLevel } from '../utils/risk';

// داده‌های خام کارمندان
const rawUsers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    department: 'Marketing',
    stressLevel: 8,
    sleepQuality: 4,
    trackingConsistency: 45,
    daysInactive: 5,
    lastCheckIn: '2 days ago',
  },
  {
    id: '2',
    name: 'Michael Chen',
    department: 'Engineering',
    stressLevel: 3,
    sleepQuality: 8,
    trackingConsistency: 92,
    daysInactive: 0,
    lastCheckIn: 'Today',
  },
  {
    id: '3',
    name: 'Emily Davis',
    department: 'Sales',
    stressLevel: 6,
    sleepQuality: 6,
    trackingConsistency: 70,
    daysInactive: 1,
    lastCheckIn: 'Yesterday',
  },
  {
    id: '4',
    name: 'Robert Wilson',
    department: 'Finance',
    stressLevel: 9,
    sleepQuality: 3,
    trackingConsistency: 20,
    daysInactive: 8,
    lastCheckIn: '1 week ago',
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    department: 'HR',
    stressLevel: 5,
    sleepQuality: 7,
    trackingConsistency: 85,
    daysInactive: 0,
    lastCheckIn: 'Today',
  },
  {
    id: '6',
    name: 'James Martinez',
    department: 'Operations',
    stressLevel: 7,
    sleepQuality: 5,
    trackingConsistency: 55,
    daysInactive: 3,
    lastCheckIn: '3 days ago',
  },
  {
    id: '7',
    name: 'Anna Thompson',
    department: 'Design',
    stressLevel: 4,
    sleepQuality: 9,
    trackingConsistency: 95,
    daysInactive: 0,
    lastCheckIn: 'Today',
  },
  {
    id: '8',
    name: 'David Brown',
    department: 'Engineering',
    stressLevel: 8,
    sleepQuality: 4,
    trackingConsistency: 35,
    daysInactive: 6,
    lastCheckIn: '4 days ago',
  },
];

// محاسبه ریسک لول برای هر کاربر
export const mockUsers: CoachUser[] = rawUsers.map((user) => ({
  ...user,
  riskLevel: calculateRiskLevel({
    stressLevel: user.stressLevel,
    sleepQuality: user.sleepQuality,
    trackingConsistency: user.trackingConsistency,
    daysInactive: user.daysInactive,
  }),
}));

// آمار کلی برای نمایش در بالای داشبورد
export const coachStats = {
  totalUsers: mockUsers.length,
  highRiskCount: mockUsers.filter((u) => u.riskLevel === 'high').length,
  mediumRiskCount: mockUsers.filter((u) => u.riskLevel === 'medium').length,
  lowRiskCount: mockUsers.filter((u) => u.riskLevel === 'low').length,
  inactiveCount: mockUsers.filter((u) => u.daysInactive >= 3).length,
};