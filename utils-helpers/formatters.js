/**
 * utils-helpers/formatters.js
 */
const Formatters = (() => {
  function fecha(raw) {
    if (!raw||raw==='.'||raw==='--') return '—';
    const d=new Date(raw); if(isNaN(d)) return raw;
    return d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
  }
  function estadoBadge(code) {
    const cfg=window.APP_CONFIG?.estados||{};
    const e=cfg[code]||{label:code||'?'};
    const cls={C:'badge-success',P:'badge-warning',M:'badge-danger',V:'badge-purple',G:'badge-info',S:'badge-accent'};
    return `<span class="badge ${cls[code]||'badge-info'}">${e.icon||''} ${e.label}</span>`;
  }
  function safe(v) { return(!v||v==='.'||v==='*'||String(v).trim()==='')? '—':v; }
  function truncate(s,max=30){ if(!s)return '—'; return s.length>max?s.slice(0,max)+'…':s; }
  function highlight(text,q) {
    if(!q) return text;
    const re=new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return String(text).replace(re,'<mark style="background:var(--accent-glow);color:var(--accent)">$1</mark>');
  }
  function currency(n) { return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n||0); }
  function fileSize(bytes) {
    if(bytes<1024) return bytes+' B';
    if(bytes<1048576) return (bytes/1024).toFixed(1)+' KB';
    return (bytes/1048576).toFixed(1)+' MB';
  }
  return { fecha, estadoBadge, safe, truncate, highlight, currency, fileSize };
})();
window.Formatters = Formatters;
