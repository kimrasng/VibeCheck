import { Chart, registerables } from 'chart.js';
import { STORAGE_KEYS, VibeSettings, ExposureStats, defaultSettings, defaultStats } from '../core/storage';

Chart.register(...registerables);

const loadSettings = () => {
  chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
    const settings: VibeSettings = result[STORAGE_KEYS.SETTINGS] || defaultSettings;
    
    (document.getElementById('blockedTags') as HTMLTextAreaElement).value = (settings.blockedTags || []).join('\n');
    (document.getElementById('whitelist') as HTMLTextAreaElement).value = (settings.whiteListUsers || []).join('\n');
    (document.getElementById('focusMode') as HTMLInputElement).checked = settings.focusMode;
  });
};

const saveSettings = () => {
  const settings: VibeSettings = {
    focusMode: (document.getElementById('focusMode') as HTMLInputElement).checked,
    whiteListUsers: (document.getElementById('whitelist') as HTMLTextAreaElement).value.split('\n').filter(s => s.trim() !== ''),
    blockedTags: (document.getElementById('blockedTags') as HTMLTextAreaElement).value.split('\n').filter(s => s.trim() !== '')
  };

  chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
    const btn = document.getElementById('saveBtn')!;
    const originalText = btn.textContent;
    btn.textContent = "Saved!";
    setTimeout(() => btn.textContent = originalText, 2000);
  });
};

const renderTrendChart = () => {
  chrome.storage.local.get([STORAGE_KEYS.STATS], (result) => {
    const stats: ExposureStats = result[STORAGE_KEYS.STATS] || defaultStats;
    const ctx = (document.getElementById('trendChart') as HTMLCanvasElement).getContext('2d');
    if (!ctx) return;

    const dates = Object.keys(stats.dailyTrend).sort();
    const values = dates.map(d => stats.dailyTrend[d]);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates.length ? dates : ['No Data'],
        datasets: [{
          label: 'Filtered Posts',
          data: values.length ? values : [0],
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { display: false } } }
      }
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  renderTrendChart();

  document.getElementById('saveBtn')!.addEventListener('click', saveSettings);
  document.getElementById('resetStats')!.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all data?")) {
      chrome.storage.local.set({ [STORAGE_KEYS.STATS]: defaultStats }, () => location.reload());
    }
  });
});
