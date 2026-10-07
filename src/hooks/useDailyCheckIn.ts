import { useState } from 'react';

interface DailyCheckInState {
  stressLevel: number;
  sleepQuality: number;
  lastUpdated: string | null;
}

interface UseDailyCheckInReturn {
  stressLevel: number;
  sleepQuality: number;
  lastUpdated: string | null;
  isCompleted: boolean;
  updateStress: (level: number) => void;
  updateSleep: (quality: number) => void;
  resetCheckIn: () => void;
}

const INITIAL_STATE: DailyCheckInState = {
  stressLevel: 5,
  sleepQuality: 5,
  lastUpdated: null,
};

export function useDailyCheckIn(): UseDailyCheckInReturn {
  const [state, setState] = useState<DailyCheckInState>(INITIAL_STATE);

  const updateStress = (level: number) => {
    // محدود کردن مقدار بین 1 تا 10
    const clampedLevel = Math.min(Math.max(level, 1), 10);
    
    setState((prev) => ({
      ...prev,
      stressLevel: clampedLevel,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const updateSleep = (quality: number) => {
    // محدود کردن مقدار بین 1 تا 10
    const clampedQuality = Math.min(Math.max(quality, 1), 10);
    
    setState((prev) => ({
      ...prev,
      sleepQuality: clampedQuality,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const resetCheckIn = () => {
    setState(INITIAL_STATE);
  };

  // کاربر چک‌این را کامل کرده اگر هر دو مقدار تغییر کرده باشند
  const isCompleted = state.lastUpdated !== null;

  return {
    stressLevel: state.stressLevel,
    sleepQuality: state.sleepQuality,
    lastUpdated: state.lastUpdated,
    isCompleted,
    updateStress,
    updateSleep,
    resetCheckIn,
  };
}