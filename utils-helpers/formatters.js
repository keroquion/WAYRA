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

  /** Fecha corta: "15/01/2026" */
  function fechaCorta(raw) {
    if (!raw || raw === '.' || raw === '--') return '—';
    const d = GarantiaCalculator.parseFecha(raw);
    if (!d) return String(raw);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** Badge visual de estado de cobertura (garantía/soporte) */
  function garantiaBadge(cobertura) {
    if (!cobertura || cobertura.status === 'SIN_FECHA') {
      return `<span class="badge badge-info" style="gap:4px">❓ Sin fecha de compra</span>`;
    }
    const { statusIcon, statusLabel, statusColor } = cobertura;
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:0.78rem;font-weight:700;color:${statusColor};background:${statusColor}15;border:1px solid ${statusColor}40;border-radius:8px;padding:4px 12px">${statusIcon} ${statusLabel}</span>`;
  }

  /**
   * Renderiza la sección completa de cobertura (garantía + soporte) para una ficha de equipo.
   * Incluye barras de progreso y fechas de vencimiento.
   * @param {Object} cobertura — resultado de GarantiaCalculator.calcular()
   * @returns {string} HTML
   */
  function coberturaSection(cobertura) {
    if (!cobertura || cobertura.status === 'SIN_FECHA') {
      return `<div style="padding:12px;background:var(--bg-hover);border-radius:8px;font-size:0.85rem;color:var(--text-muted);text-align:center">
        ❓ Sin fecha de compra registrada — no se puede calcular cobertura
      </div>`;
    }

    const { garantia, soporte, fechaCompra } = cobertura;
    const fechaCompraStr = fechaCompra ? fechaCompra.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    // Colores para barras
    const colorGarantia = garantia.vigente ? 'var(--success)' : 'var(--danger)';
    const colorSoporte  = soporte.vigente  ? 'var(--warning)' : 'var(--danger)';

    const vencGarantiaStr = garantia.fechaVencimiento
      ? garantia.fechaVencimiento.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    const vencSoporteStr = soporte.fechaVencimiento
      ? soporte.fechaVencimiento.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    return `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${garantiaBadge(cobertura)}
          <span style="font-size:0.75rem;color:var(--text-muted)">Compra: <strong>${fechaCompraStr}</strong></span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <!-- Garantía -->
          <div style="background:${colorGarantia}10;border:1px solid ${colorGarantia}30;border-radius:8px;padding:10px 12px">
            <div style="font-size:0.7rem;font-weight:700;color:${colorGarantia};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
              🛡️ Garantía (${garantia.meses} meses)
            </div>
            <div style="width:100%;height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;margin-bottom:4px">
              <div style="width:${garantia.porcentaje}%;height:100%;background:${colorGarantia};border-radius:4px;transition:width 0.3s"></div>
            </div>
            <div style="font-size:0.72rem;color:var(--text-secondary)">
              ${garantia.vigente
                ? `<strong style="color:${colorGarantia}">${garantia.diasRestantes} días</strong> restantes · Vence ${vencGarantiaStr}`
                : `<strong style="color:var(--danger)">Vencida</strong> el ${vencGarantiaStr}`}
            </div>
          </div>

          <!-- Soporte -->
          <div style="background:${colorSoporte}10;border:1px solid ${colorSoporte}30;border-radius:8px;padding:10px 12px">
            <div style="font-size:0.7rem;font-weight:700;color:${colorSoporte};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
              🔧 Soporte Técnico (${soporte.anios} años)
            </div>
            <div style="width:100%;height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;margin-bottom:4px">
              <div style="width:${soporte.porcentaje}%;height:100%;background:${colorSoporte};border-radius:4px;transition:width 0.3s"></div>
            </div>
            <div style="font-size:0.72rem;color:var(--text-secondary)">
              ${soporte.vigente
                ? `<strong style="color:${colorSoporte}">${soporte.diasRestantes} días</strong> restantes · Vence ${vencSoporteStr}`
                : `<strong style="color:var(--danger)">Vencido</strong> el ${vencSoporteStr}`}
            </div>
          </div>
        </div>
      </div>`;
  }

  return { fecha, estadoBadge, safe, truncate, highlight, currency, fileSize, fechaCorta, garantiaBadge, coberturaSection };
})();
window.Formatters = Formatters;
