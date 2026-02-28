import { Chart, registerables } from 'chart.js';
import { STORAGE_KEYS, ExposureStats, VibeSettings, defaultSettings, defaultStats } from '../core/storage';

Chart.register(...registerables);

let statsChart: Chart | null = null;

const updateStats = () => {
  chrome.storage.local.get([STORAGE_KEYS.STATS], (result) => {
    const stats: ExposureStats = result[STORAGE_KEYS.STATS] || defaultStats;
    
    document.getElementById('totalScanned')!.textContent = stats.totalScanned.toString();
    const negPercent = stats.totalScanned > 0 ? Math.round((stats.negativeCount / stats.totalScanned) * 100) : 0;
    document.getElementById('negativeExposure')!.textContent = `${negPercent}%`;
    
    const loadScore = Math.min(Math.round(negPercent * 1.5), 100);
    document.getElementById('loadScore')!.textContent = loadScore.toString();

    renderChart(stats);
  });
};

const renderChart = (stats: ExposureStats) => {
  const ctx = (document.getElementById('emotionChart') as HTMLCanvasElement).getContext('2d');
  if (!ctx) return;

  if (statsChart) statsChart.destroy();

  const filtered = stats.negativeCount;
  const clean = Math.max(0, stats.totalScanned - filtered);

  statsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Filtered', 'Visible'],
      datasets: [{
        data: [filtered, clean],
        backgroundColor: ['#ef4444', '#10b981'],
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
      }
    }
  });
};

const setupFocusMode = () => {
  const btn = document.getElementById('focusModeBtn') as HTMLButtonElement;
  chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
    const settings: VibeSettings = result[STORAGE_KEYS.SETTINGS] || defaultSettings;
    updateFocusBtn(btn, settings.focusMode);
  });

  btn.addEventListener('click', () => {
    chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
      const settings: VibeSettings = result[STORAGE_KEYS.SETTINGS] || defaultSettings;
      settings.focusMode = !settings.focusMode;
      chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
        updateFocusBtn(btn, settings.focusMode);
      });
    });
  });
};

const updateFocusBtn = (btn: HTMLButtonElement, isActive: boolean) => {
  if (isActive) {
    btn.textContent = "Disable Focus Mode";
    btn.className = "btn danger";
  } else {
    btn.textContent = "Enable Focus Mode";
    btn.className = "btn primary";
  }
};

document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  setupFocusMode();
});
