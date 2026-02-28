import { STORAGE_KEYS, ExposureStats, VibeSettings, defaultSettings, defaultStats } from '../core/storage';

const INITIAL_STATS: ExposureStats = defaultStats;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ [STORAGE_KEYS.STATS]: INITIAL_STATS });
  chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
    if (!result[STORAGE_KEYS.SETTINGS]) {
      chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: defaultSettings });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REPORT_SCAN") {
    chrome.storage.local.get([STORAGE_KEYS.STATS], (result) => {
      const stats: ExposureStats = result[STORAGE_KEYS.STATS] || { ...INITIAL_STATS };
      stats.totalScanned++;
      chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
    });
  } else if (message.type === "REPORT_FILTER") {
    chrome.storage.local.get([STORAGE_KEYS.STATS], (result) => {
      const stats: ExposureStats = result[STORAGE_KEYS.STATS] || { ...INITIAL_STATS };
      stats.negativeCount++;

      const today = new Date().toISOString().split('T')[0];
      stats.dailyTrend[today] = (stats.dailyTrend[today] || 0) + 1;
      
      chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
    });
  }
});
