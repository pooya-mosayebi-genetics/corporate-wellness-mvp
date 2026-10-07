export type RiskLevel = 'low' | 'medium' | 'high';

export interface CoachUser {
  id: string;
  name: string;
  department: string;
  stressLevel: number; // 1-10
  sleepQuality: number; // 1-10
  trackingConsistency: number; // 0-100 درصد
  daysInactive: number;
  lastCheckIn: string | null;
  riskLevel: RiskLevel;
}

export interface NudgeMessage {
  userId: string;
  userName: string;
  message: string;
  sentAt: string;
}