/**
 * utils-helpers/toast.js
 */
const Toast = (() => {
  function show(msg, type='info', dur=3500) {
    const c = document.getElementById('toast-container'); if(!c) return;
    const icons={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};
    const el = document.createElement('div');
    el.className=`toast toast-${type}`;
    el.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(()=>{ el.style.animation='fadeOut 0.3s ease forwards'; setTimeout(()=>el.remove(),300); },dur);
  }
  return {
    success:(m,d)=>show(m,'success',d), error:(m,d)=>show(m,'error',d),
    warning:(m,d)=>show(m,'warning',d), info:(m,d)=>show(m,'info',d),
  };
})();
window.Toast = Toast;
