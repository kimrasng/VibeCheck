export interface VibeSettings {
  focusMode: boolean;
  whiteListUsers: string[];
  blockedTags: string[];
}

export interface ExposureStats {
  totalScanned: number;
  negativeCount: number;
  lastReset: string;
  dailyTrend: { [date: string]: number };
}

export const defaultStats: ExposureStats = {
  totalScanned: 0,
  negativeCount: 0,
  lastReset: new Date().toISOString(),
  dailyTrend: {},
};

export const defaultSettings: VibeSettings = {
  focusMode: false,
  whiteListUsers: [],
  blockedTags: ['suicide', 'hate', 'toxic']
};

export const STORAGE_KEYS = {
  SETTINGS: 'vibe_settings',
  STATS: 'vibe_stats'
};
