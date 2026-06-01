/**
 * utils-helpers/dom-helpers.js — Inventario Pro v3
 * Helpers de DOM para reducir HTML inline repetitivo.
 * Genera strings HTML reutilizables para patrones que se repiten 3+ veces.
 */

const DOM = (() => {

  /** Escapa HTML para prevenir XSS */
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Card con título opcional */
  function card(content, opts = {}) {
    const { title, borderColor, bgColor, style } = opts;
    const borderStyle = borderColor ? `border-left:4px solid ${borderColor};` : '';
    const bgStyle = bgColor ? `background:${bgColor};` : '';
    const extraStyle = style || '';
    return `<div class="card" style="${borderStyle}${bgStyle}${extraStyle}">
      ${title ? `<div class="card-title">${title}</div>` : ''}
      ${content}
    </div>`;
  }

  /** Stat card para las grids de estadísticas */
  function statCard(label, value, icon, color) {
    return `<div class="stat-card" style="--stat-color:${color}">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-icon">${icon}</div>
    </div>`;
  }

  /** Badge con color */
  function badge(text, color, opts = {}) {
    const bg = opts.bg || `${color}18`;
    const border = opts.border || `${color}55`;
    const extraStyle = opts.style || '';
    return `<span style="font-size:0.72rem;font-weight:700;color:${color};background:${bg};border:1px solid ${border};border-radius:10px;padding:3px 10px;${extraStyle}">${esc(text)}</span>`;
  }

  /** Fila clave-valor para fichas de detalle */
  function dataRow(label, value, opts = {}) {
    const borderBottom = opts.noBorder ? '' : 'border-bottom:1px solid var(--border);padding-bottom:4px;';
    return `<div style="display:flex;justify-content:space-between;${borderBottom}">
      <span style="color:var(--text-muted)">${esc(label)}:</span>
      <${opts.strong ? 'strong' : 'span'} ${opts.mono ? 'style="font-family:monospace;font-size:1.05rem;"' : ''}>${esc(value) || '—'}</${opts.strong ? 'strong' : 'span'}>
    </div>`;
  }

  /** Grid de datos clave-valor dentro de una card con fondo hover */
  function dataGrid(rows) {
    const html = rows.map((r, i) =>
      dataRow(r[0], r[1], { noBorder: i === rows.length - 1, strong: r[2], mono: r[3] })
    ).join('');
    return `<div style="display:grid;grid-template-columns:1fr;gap:8px;font-size:0.95rem;background:var(--bg-hover);padding:10px;border-radius:6px">${html}</div>`;
  }

  /** Form group con label */
  function formGroup(label, inputHtml, opts = {}) {
    return `<div class="form-group" ${opts.style ? `style="${opts.style}"` : ''}>
      <label class="form-label">${label}</label>
      ${inputHtml}
    </div>`;
  }

  /** Barra de progreso visual */
  function progressBar(percent, color, opts = {}) {
    const height = opts.height || '8px';
    const bgColor = opts.bgColor || 'var(--bg-hover)';
    const label = opts.label || '';
    const clampedPercent = Math.max(0, Math.min(100, percent));
    return `<div style="position:relative;width:100%">
      <div style="width:100%;height:${height};background:${bgColor};border-radius:4px;overflow:hidden">
        <div style="width:${clampedPercent}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s"></div>
      </div>
      ${label ? `<span style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;display:block">${label}</span>` : ''}
    </div>`;
  }

  /** Sección con título uppercase */
  function sectionTitle(text) {
    return `<div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${esc(text)}</div>`;
  }

  /** Empty state (sin datos) */
  function emptyState(icon, title, subtitle) {
    return `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <div style="font-size:2.5rem;margin-bottom:10px">${icon}</div>
      <div style="font-size:1.1rem;font-weight:500;color:var(--text-color)">${esc(title)}</div>
      ${subtitle ? `<div style="margin-top:5px;font-size:0.85rem">${subtitle}</div>` : ''}
    </div>`;
  }

  return { esc, card, statCard, badge, dataRow, dataGrid, formGroup, progressBar, sectionTitle, emptyState };
})();

window.DOM = DOM;
