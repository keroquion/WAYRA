/**
 * modulo-2-reportes/tab-orden-compra.js — Inventario Pro v3
 * Tab de Orden de Compra: tabla de repuestos, columnas configurables, PDF, Excel.
 * Extraído de reportes.view.js L730-L1040.
 */

const TabOrdenCompra = (() => {

  // Columnas disponibles para Orden de Compra
  const COMPRAS_COLS = [
    { key: 'num',     label: '#',                 default: true },
    { key: 'lote',    label: 'Lote',               default: true },
    { key: 'codigo',  label: 'Código',             default: true },
    { key: 'marca',   label: 'Marca',              default: true },
    { key: 'modelo',  label: 'Modelo',             default: true },
    { key: 'serie',   label: 'Serie',              default: true },
    { key: 'repuesto',label: 'Repuesto a comprar', default: true },
    { key: 'pn',      label: 'PN / Código',        default: true },
    { key: 'fecha',   label: 'Fecha solicitud',    default: true },
    { key: 'llego',   label: '\u25a1 Llegó',            default: true },
    { key: 'fecha_col', label: 'Fecha colocación', default: true },
    { key: 'tecnico', label: 'Técnico instalación', default: true },
  ];

  function _getComprasCols() {
    try {
      const saved = JSON.parse(localStorage.getItem('compras-col-vis') || 'null');
      if (saved) return saved;
    } catch {}
    const def = {};
    COMPRAS_COLS.forEach(c => { def[c.key] = c.default; });
    return def;
  }

  function _saveComprasCols(vis) {
    localStorage.setItem('compras-col-vis', JSON.stringify(vis));
  }

  function toggleColPanel() {
    const panel = document.getElementById('compras-col-panel');
    const btn   = document.getElementById('btn-compras-cols');
    if (!panel) return;
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : '';
    if (btn) { btn.style.background = visible ? '' : 'var(--accent)'; btn.style.color = visible ? '' : '#fff'; }
  }

  function _renderColPanel() {
    const vis = _getComprasCols();
    return `<div id="compras-col-panel" style="display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:12px">
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        Columnas visibles
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" style="font-size:0.68rem" onclick="TabOrdenCompra.resetCols()">Restaurar</button>
          <button class="btn btn-primary btn-sm" style="font-size:0.68rem" onclick="TabOrdenCompra.toggleColPanel()">Cerrar</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${COMPRAS_COLS.map(c => `
          <label style="display:flex;align-items:center;gap:5px;font-size:0.75rem;cursor:pointer;background:var(--bg-hover);padding:4px 10px;border-radius:var(--radius-sm);border:1px solid var(--border)">
            <input type="checkbox" id="cc-${c.key}" ${vis[c.key]!==false?'checked':''}
              onchange="TabOrdenCompra.onColChange()" style="accent-color:var(--accent)">
            ${c.label}
          </label>`).join('')}
      </div>
    </div>`;
  }

  function onColChange() {
    const vis = {};
    COMPRAS_COLS.forEach(c => { vis[c.key] = document.getElementById('cc-' + c.key)?.checked !== false; });
    _saveComprasCols(vis);
    renderTabla();
  }

  function resetCols() {
    const def = {};
    COMPRAS_COLS.forEach(c => { def[c.key] = c.default; });
    _saveComprasCols(def);
    COMPRAS_COLS.forEach(c => { const el = document.getElementById('cc-' + c.key); if (el) el.checked = true; });
    renderTabla();
    Toast.info('Columnas restauradas');
  }

  // ── Recolectar filas de repuestos ───────────────────────────────

  async function _getFilas() {
    const loteId = document.getElementById('compras-filter-lote')?.value || '';
    const lotes  = await LocalCache.getLotes();
    const filas = [];
    for (const lote of lotes) {
      if (loteId && lote.id !== loteId) continue;
      for (const eq of (lote.equipos || [])) {
        const repuestos = eq._repuestosUsados || [];
        if (!repuestos.length) continue;
        for (const rep of repuestos) {
          filas.push({
            lote, eq,
            repuesto: rep.repuesto || rep.nombre || '—',
            pn:       rep.pn || '—',
            fecha:    rep.timestamp ? new Date(rep.timestamp).toLocaleDateString('es-PE') : new Date(lote.fechaCreacion).toLocaleDateString('es-PE'),
            tecnico:  lote.tecnico || eq._tecnico || '—',
          });
        }
      }
    }
    return filas;
  }

  // ── Render tabla ────────────────────────────────────────────────

  async function renderTabla() {
    const wrapper = document.getElementById('compras-tabla-wrapper');
    if (!wrapper) return;
    const vis   = _getComprasCols();
    const filas = await _getFilas();

    if (!filas.length) {
      wrapper.innerHTML = DOM.emptyState('📭', 'Sin repuestos registrados', 'Añade repuestos desde Ingreso → Modo Soporte.');
      return;
    }

    const cols = COMPRAS_COLS.filter(c => vis[c.key] !== false);
    const thCells = cols.map(c => `<th style="border:1px solid #ccc;padding:6px 8px">${c.label}</th>`).join('');

    const tdRow = (f, i) => cols.map(c => {
      switch(c.key) {
        case 'num':      return `<td style="border:1px solid #ccc;padding:5px 8px;text-align:center;color:var(--text-muted);font-size:0.7rem">${i+1}</td>`;
        case 'lote':     return `<td style="border:1px solid #ccc;padding:5px 8px;font-size:0.72rem">${f.lote.titulo}</td>`;
        case 'codigo':   return `<td style="border:1px solid #ccc;padding:5px 8px;font-weight:600">${f.eq.CODIGO||'—'}</td>`;
        case 'marca':    return `<td style="border:1px solid #ccc;padding:5px 8px">${f.eq.MARCA||'—'}</td>`;
        case 'modelo':   return `<td style="border:1px solid #ccc;padding:5px 8px">${f.eq.MODELO||'—'}</td>`;
        case 'serie':    return `<td style="border:1px solid #ccc;padding:5px 8px;font-size:0.72rem">${f.eq.SERIE||'—'}</td>`;
        case 'repuesto': return `<td style="border:1px solid #ccc;padding:5px 8px;font-weight:600;color:var(--accent)">${f.repuesto}</td>`;
        case 'pn':       return `<td style="border:1px solid #ccc;padding:5px 8px;font-family:monospace">${f.pn}</td>`;
        case 'fecha':    return `<td style="border:1px solid #ccc;padding:5px 8px;white-space:nowrap">${f.fecha}</td>`;
        case 'llego':    return `<td style="border:1px solid #ccc;padding:5px 8px;text-align:center;font-size:1.1rem">□</td>`;
        case 'fecha_col':return `<td style="border:1px solid #ccc;padding:5px 8px">&nbsp;</td>`;
        case 'tecnico':  return `<td style="border:1px solid #ccc;padding:5px 8px">&nbsp;</td>`;
        default:         return `<td style="border:1px solid #ccc;padding:5px 8px">—</td>`;
      }
    }).join('');

    wrapper.innerHTML = `
      ${_renderColPanel()}
      <div id="compras-printable" style="overflow-x:auto">
        <table class="data-table" style="border-collapse:collapse;width:100%;font-size:0.8rem">
          <thead>
            <tr style="background:var(--accent);color:#fff">${thCells}</tr>
          </thead>
          <tbody>
            ${filas.map((f, i) => `<tr style="background:${i%2===0?'var(--bg-card)':'var(--bg-hover)'}">${tdRow(f, i)}</tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:12px;font-size:0.7rem;color:var(--text-muted)">
          Total de repuestos: <strong>${filas.length}</strong> ·
          Generado: ${new Date().toLocaleString('es-PE')}
        </div>
      </div>
    `;
  }

  // ── Exports ─────────────────────────────────────────────────────

  async function exportPDF() {
    const loteId = document.getElementById('compras-filter-lote')?.value || '';
    const lotes  = await LocalCache.getLotes();
    const empresa = APP_CONFIG.empresa?.nombre || 'Empresa';
    const filas = await _getFilas();

    if (!filas.length) { Toast.warning('No hay repuestos para imprimir'); return; }

    const loteTitulo = loteId ? lotes.find(l=>l.id===loteId)?.titulo : 'Todos los lotes';
    const win = window.open('', '_blank', 'width=1000,height=750');
    const loteObj = lotes.find(l=>l.id===loteId) || lotes.find(l=>l.activo) || lotes[0];
    const loteFecha = loteObj?.fechaCreacion ? new Date(loteObj.fechaCreacion).toLocaleDateString('es-PE') : '—';
    const loteTecnico = loteObj?.tecnico || '';

    win.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>Orden de Compra — ${loteTitulo}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:Arial,sans-serif; font-size:11px; padding:20px; color:#111; }
        .header { margin-bottom:16px; border-bottom:2px solid #1a1aff; padding-bottom:10px; }
        .header h1 { font-size:16px; color:#1a1aff; }
        .header p  { font-size:11px; color:#555; margin-top:3px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th { background:#1a1aff; color:#fff; padding:6px 8px; border:1px solid #aaa; font-size:10px; text-align:left; }
        td { padding:5px 8px; border:1px solid #ccc; font-size:10px; }
        tr:nth-child(even) td { background:#f5f5ff; }
        .empty-cell { min-width:90px; }
        .checkbox-cell { text-align:center; font-size:14px; }
        @media print { .no-print { display:none !important; } @page { margin: 0; } body { padding: 15mm; } }
      </style>
    </head><body>
      <div class="no-print" style="background:#1a1aff;color:#fff;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;margin:-20px -20px 16px;position:sticky;top:0;z-index:99">
        <span style="font-weight:700;font-size:14px">🛒 Orden de Compra — ${loteTitulo}</span>
        <div style="display:flex;gap:8px">
          <button onclick="window.print()" style="background:#fff;color:#1a1aff;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-weight:700">🖨️ Imprimir / Guardar PDF</button>
          <button onclick="window.close()" style="background:rgba(255,255,255,0.2);color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer">✕ Cerrar</button>
        </div>
      </div>
      <div class="header">
        <h1>🛒 ORDEN DE COMPRA DE REPUESTOS</h1>
        <p><strong>${empresa}</strong> · Lote: <strong>${loteTitulo}</strong> · Fecha: <strong>${loteFecha}</strong> · Técnico: <strong contenteditable="true" style="padding:2px 8px;border-bottom:1px dashed #1a1aff;min-width:80px;display:inline-block;outline:none;background:#fffadc;">${loteTecnico}</strong></p>
        <p style="margin-top:3px;color:#777">Generado: ${new Date().toLocaleString('es-PE')}</p>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Código</th><th>Marca</th><th>Modelo</th><th>Serie</th>
          <th>Repuesto a comprar</th><th>PN / Código</th><th>Fecha solicitud</th>
          <th class="checkbox-cell" style="min-width:45px">□ Llegó</th>
          <th class="empty-cell">Fecha colocación</th><th class="empty-cell">Técnico instalación</th>
        </tr></thead>
        <tbody>
          ${filas.map((f, i) => `<tr>
            <td style="text-align:center;color:#888">${i+1}</td>
            <td><strong>${f.eq.CODIGO||'—'}</strong></td>
            <td>${f.eq.MARCA||'—'}</td>
            <td>${f.eq.MODELO||'—'}</td>
            <td style="font-size:9px">${f.eq.SERIE||'—'}</td>
            <td style="font-weight:700;color:#1a1aff">${f.repuesto}</td>
            <td style="font-family:monospace">${f.pn}</td>
            <td style="white-space:nowrap">${f.fecha}</td>
            <td class="checkbox-cell" style="font-size:14px">□</td>
            <td class="empty-cell">&nbsp;</td>
            <td class="empty-cell">&nbsp;</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p style="margin-top:14px;font-size:10px;color:#888">Total repuestos: <strong>${filas.length}</strong></p>
    </body></html>`);
    win.document.close();
    Toast.success('Ventana de impresión abierta');
  }

  async function exportExcel() {
    const loteId = document.getElementById('compras-filter-lote')?.value || '';
    const lotes  = await LocalCache.getLotes();
    const filas = await _getFilas();

    if (!filas.length) { Toast.warning('No hay repuestos para exportar'); return; }

    const headers = ['Lote','Código','Marca','Modelo','Serie','Repuesto a comprar','PN/Código','Fecha solicitud','□ Llegó','Fecha colocación','Técnico instalación'];
    const rows = filas.map(f => [
      f.lote.titulo, f.eq.CODIGO||'', f.eq.MARCA||'', f.eq.MODELO||'', f.eq.SERIE||'',
      f.repuesto, f.pn, f.fecha, '', '', '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [14,10,10,18,16,20,16,14,8,14,18].map(w=>({wch:w}));
    headers.forEach((_, c) => {
      const cell = XLSX.utils.encode_cell({r:0, c});
      if (!ws[cell]) return;
      ws[cell].s = { font:{bold:true}, fill:{fgColor:{rgb:'1a1aff'}}, font2:{color:{rgb:'FFFFFF'}} };
    });

    const wb = XLSX.utils.book_new();
    const loteTitulo = loteId ? lotes.find(l=>l.id===loteId)?.titulo || 'Todos' : 'Todos';
    XLSX.utils.book_append_sheet(wb, ws, 'Orden de Compra');
    XLSX.writeFile(wb, `OrdenCompra_${loteTitulo.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
    Toast.success('Excel descargado');
  }

  return { renderTabla, toggleColPanel, onColChange, resetCols, exportPDF, exportExcel };
})();

window.TabOrdenCompra = TabOrdenCompra;
