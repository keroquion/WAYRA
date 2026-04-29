/**
 * modulo-2-reportes/agrupador-lotes.js
 * Totalización de lotes por tipo, marca, estado.
 */

const AgrupadorLotes = (() => {

  function agrupar(equipos) {
    if (!equipos?.length) return { total: 0, porTipo: {}, porMarca: {}, porEstado: {}, porSucursal: {} };

    const porTipo     = _count(equipos, 'TIP_EQUIP');
    const porMarca    = _count(equipos, 'MARCA');
    const porEstado   = _count(equipos, 'ESTADO');
    const porSucursal = _count(equipos, 'SUCURSAL');

    return { total: equipos.length, porTipo, porMarca, porEstado, porSucursal };
  }

  function _count(arr, key) {
    return arr.reduce((acc, item) => {
      const v = item[key] || '—';
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
  }

  function renderResumen(equipos) {
    const g = agrupar(equipos);
    return `
      <div class="grid-2" style="gap:12px;margin-bottom:14px">
        <div class="card">
          <div class="card-title">Por Tipo de Equipo</div>
          ${_renderCountList(g.porTipo, g.total)}
        </div>
        <div class="card">
          <div class="card-title">Por Estado</div>
          ${_renderCountList(g.porEstado, g.total, true)}
        </div>
      </div>
      <div class="grid-2" style="gap:12px">
        <div class="card">
          <div class="card-title">Por Marca</div>
          ${_renderCountList(g.porMarca, g.total)}
        </div>
        <div class="card">
          <div class="card-title">Por Sucursal</div>
          ${_renderCountList(g.porSucursal, g.total)}
        </div>
      </div>
    `;
  }

  function _renderCountList(obj, total, isEstado = false) {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return '<div style="color:var(--text-muted);font-size:0.8rem">Sin datos</div>';
    return sorted.map(([k, v]) => {
      const pct = Math.round((v / total) * 100);
      const cfg = isEstado ? (APP_CONFIG.estados[k] || {}) : {};
      return `
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:3px">
            <span>${isEstado ? (cfg.icon||'') + ' ' + (cfg.label||k) : k}</span>
            <span style="font-weight:700">${v} <span style="color:var(--text-muted);font-weight:400">(${pct}%)</span></span>
          </div>
          <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:2px;transition:width 0.5s ease"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  return { agrupar, renderResumen };
})();

window.AgrupadorLotes = AgrupadorLotes;
