/**
 * core-theme/theme.js — v2.0.0 (sin cambios respecto v1)
 */
const THEMES = {
  dark: {
    '--bg-primary':    '#0f1117','--bg-secondary':  '#1a1d27','--bg-card':       '#1e2232',
    '--bg-sidebar':    '#12151f','--bg-hover':      '#252a3a','--bg-input':      '#1e2232',
    '--border':        '#2a2f45','--border-focus':  '#4f6ef7',
    '--text-primary':  '#e8eaf6','--text-secondary':'#8892b0','--text-muted':    '#4a5568',
    '--accent':        '#4f6ef7','--accent-hover':  '#3d5cf5','--accent-glow':   'rgba(79,110,247,0.25)',
    '--success':       '#22c55e','--warning':       '#f59e0b','--danger':        '#ef4444',
    '--info':          '#06b6d4','--purple':        '#a855f7',
    '--shadow-sm':     '0 1px 3px rgba(0,0,0,0.4)','--shadow-md': '0 4px 16px rgba(0,0,0,0.5)','--shadow-lg': '0 8px 32px rgba(0,0,0,0.6)',
    '--radius-sm':'6px','--radius-md':'10px','--radius-lg':'16px','--transition':'0.2s ease',
  },
  light: {
    '--bg-primary':    '#f0f2f8','--bg-secondary':  '#ffffff','--bg-card':       '#ffffff',
    '--bg-sidebar':    '#1e2232','--bg-hover':      '#e8edf8','--bg-input':      '#f5f7ff',
    '--border':        '#dde2f0','--border-focus':  '#4f6ef7',
    '--text-primary':  '#1a1d27','--text-secondary':'#4a5568','--text-muted':    '#8892b0',
    '--accent':        '#4f6ef7','--accent-hover':  '#3d5cf5','--accent-glow':   'rgba(79,110,247,0.15)',
    '--success':       '#16a34a','--warning':       '#d97706','--danger':        '#dc2626',
    '--info':          '#0891b2','--purple':        '#9333ea',
    '--shadow-sm':     '0 1px 3px rgba(0,0,0,0.08)','--shadow-md':'0 4px 16px rgba(0,0,0,0.1)','--shadow-lg':'0 8px 32px rgba(0,0,0,0.15)',
    '--radius-sm':'6px','--radius-md':'10px','--radius-lg':'16px','--transition':'0.2s ease',
  },
};

const ThemeManager = (() => {
  const KEY = 'inv-pro-theme';
  let current = localStorage.getItem(KEY) || 'dark';
  function apply(t) {
    const tokens = THEMES[t]; if (!tokens) return;
    Object.entries(tokens).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
    document.body.setAttribute('data-theme', t);
    current = t; localStorage.setItem(KEY, t);
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
  }
  return { init: () => apply(current), toggle: () => apply(current==='dark'?'light':'dark'), apply, getCurrent: () => current };
})();
window.ThemeManager = ThemeManager;
