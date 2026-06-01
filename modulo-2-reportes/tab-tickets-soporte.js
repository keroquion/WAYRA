/**
 * modulo-2-reportes/tab-tickets-soporte.js — Inventario Pro v3
 * Tab de Tickets de Soporte: renderizado, filtros, exports.
 * Extraído de reportes.view.js L8-L631 (config PDF + tickets + filtros + CSV).
 */

const TabTicketsSoporte = (() => {

  // Config PDF (persiste en localStorage)
  let _opcConfig = null;
  try { const r = localStorage.getItem('sop-pdf-opciones'); _opcConfig = r ? JSON.parse(r) : null; } catch {}

  function _saveOpcConfig(opc) {
    _opcConfig = opc;
    try { localStorage.setItem('sop-pdf-opciones', JSON.stringify(opc)); } catch {}
  }

  function getOpciones() {
    const panel = document.getElementById('sop-config-panel');
    if (!panel || panel.style.display === 'none') return _opcConfig || undefined;
    const get = id => document.getElementById(id)?.checked !== false;
    return {
      mostrarEncabezado:   get('opc-encabezado'),
      mostrarDatosEquipo:  get('opc-datos-equipo'),
      mostrarCamposEquipo: {
        CODIGO: get('opc-campo-CODIGO'), MARCA: get('opc-campo-MARCA'),
        MODELO: get('opc-campo-MODELO'), SERIE: get('opc-campo-SERIE'),
        TIP_EQUIP: get('opc-campo-TIP_EQUIP'), PROCESADOR: get('opc-campo-PROCESADOR'),
        RAM: get('opc-campo-RAM'), HD_SSD: get('opc-campo-HD_SSD'), TECNICO: get('opc-campo-TECNICO'),
      },
      mostrarFalla: get('opc-falla'), mostrarObservacion: get('opc-observacion'),
      mostrarDiagnostico: get('opc-diagnostico'), mostrarGemini: get('opc-gemini'),
      mostrarRepuestos: get('opc-repuestos'), mostrarFotos: get('opc-fotos'),
      mostrarLote: get('opc-lote'), mostrarFecha: get('opc-fecha'),
    };
  }

  function toggleConfigPanel() {
    const panel = document.getElementById('sop-config-panel');
    const btn   = document.getElementById('btn-sop-config');
    if (!panel) return;
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : '';
    if (btn) { btn.style.background = visible ? '' : 'var(--accent)'; btn.style.color = visible ? '' : '#fff'; }
  }

  function onConfigChange() { _saveOpcConfig(getOpciones()); }

  function resetConfig() {
    _saveOpcConfig(null);
    const panel = document.getElementById('sop-config-panel');
    if (panel) panel.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
    Toast.info('Configuracion restaurada al estado por defecto');
  }

  function guardarConfig() { _saveOpcConfig(getOpciones()); Toast.success('Preferencias de reporte guardadas'); }

  function renderConfigPanel() {
    const opc    = _opcConfig || {};
    const campos = opc.mostrarCamposEquipo || {};
    const chk = (id, label, checked) => {
      const isOn = checked !== false ? 'checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer;padding:3px 0">' +
        '<input type="checkbox" id="' + id + '" ' + isOn + ' onchange="TabTicketsSoporte.onConfigChange()" style="accent-color:var(--accent)">' +
        label + '</label>';
    };
    return '<div id="sop-config-panel" style="display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:14px">' +
      '<div style="font-size:0.78rem;font-weight:700;color:var(--text-primary);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">' +
        'Configurar Reporte PDF' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-secondary btn-sm" style="font-size:0.68rem" onclick="TabTicketsSoporte.resetConfig()">Restaurar</button>' +
          '<button class="btn btn-primary btn-sm" style="font-size:0.68rem" onclick="TabTicketsSoporte.guardarConfig()">Guardar</button>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">' +
        '<div>' +
          '<div style="font-size:0.68rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Estructura</div>' +
          chk('opc-encabezado',  'Encabezado del ticket',     opc.mostrarEncabezado   !== false) +
          chk('opc-lote',        'Nombre del lote',           opc.mostrarLote         !== false) +
          chk('opc-fecha',       'Fecha de generacion',       opc.mostrarFecha        !== false) +
        '</div>' +
        '<div>' +
          '<div style="font-size:0.68rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Datos del Equipo</div>' +
          chk('opc-datos-equipo','Seccion datos equipo',      opc.mostrarDatosEquipo  !== false) +
          '<div style="margin-top:4px;padding-left:10px;border-left:2px solid var(--border)">' +
            chk('opc-campo-CODIGO',     'Codigo',        campos.CODIGO     !== false) +
            chk('opc-campo-MARCA',      'Marca',         campos.MARCA      !== false) +
            chk('opc-campo-MODELO',     'Modelo',        campos.MODELO     !== false) +
            chk('opc-campo-SERIE',      'Serie',         campos.SERIE      !== false) +
            chk('opc-campo-TIP_EQUIP',  'Tipo',          campos.TIP_EQUIP  !== false) +
            chk('opc-campo-PROCESADOR', 'Procesador',    campos.PROCESADOR !== false) +
            chk('opc-campo-RAM',        'RAM',           campos.RAM        !== false) +
            chk('opc-campo-HD_SSD',     'Almacenamiento',campos.HD_SSD     !== false) +
            chk('opc-campo-TECNICO',    'Tecnico',       campos.TECNICO    !== false) +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:0.68rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Diagnostico</div>' +
          chk('opc-falla',        'Falla reportada',          opc.mostrarFalla        !== false) +
          chk('opc-observacion',  'Observacion final',        opc.mostrarObservacion  !== false) +
          chk('opc-diagnostico',  'Diagnostico IA/Tecnico',   opc.mostrarDiagnostico  !== false) +
          chk('opc-gemini',       'Datos Gemini IA',          opc.mostrarGemini       !== false) +
        '</div>' +
        '<div>' +
          '<div style="font-size:0.68rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Adicionales</div>' +
          chk('opc-repuestos',    'Repuestos utilizados',     opc.mostrarRepuestos    !== false) +
          chk('opc-fotos',        'Evidencia fotografica',    opc.mostrarFotos        !== false) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── RENDER TICKETS ──────────────────────────────────────────────────

  async function renderTickets(lotes) {
    const listEl  = document.getElementById('sop-tickets-list');
    const statsEl = document.getElementById('sop-stats-row');
    if (!listEl) return;

    let allTickets = [];
    for (const lote of lotes) {
      for (const eq of (lote.equipos || [])) {
        if (eq._estadoSoporte || eq._diagnostico || eq._fallaReportada || (eq._repuestosUsados?.length)) {
          allTickets.push({ eq, lote });
        }
      }
    }

    // Stats
    if (statsEl) {
      const conteo = {};
      allTickets.forEach(({ eq }) => {
        const s = eq._estadoSoporte || 'Pendiente';
        conteo[s] = (conteo[s] || 0) + 1;
      });
      const estadoColors = {
        'Listo para entrega': '#22c55e', 'En diagnóstico': '#f59e0b',
        'En reparación': '#3b82f6', 'Esperando repuesto': '#8b5cf6',
        'Sin solución': '#ef4444', 'Pendiente': '#6b7280',
      };
      statsEl.innerHTML = Object.entries(conteo).map(([est, n]) => {
        const c = estadoColors[est] || '#6b7280';
        return `<div style="background:${c}18;border:1px solid ${c}55;border-radius:6px;padding:6px 12px;font-size:0.75rem">
          <span style="font-weight:700;color:${c}">${n}</span>
          <span style="color:var(--text-secondary);margin-left:4px">${est}</span>
        </div>`;
      }).join('') + `<div style="background:var(--bg-hover);border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:0.75rem">
        <span style="font-weight:700;color:var(--text-primary)">${allTickets.length}</span>
        <span style="color:var(--text-muted);margin-left:4px">Total</span>
      </div>`;
    }

    if (!allTickets.length) {
      listEl.innerHTML = DOM.emptyState('🔧', 'Sin tickets de soporte', 'Los tickets aparecen aquí cuando usas el botón "Soporte" en el historial de un equipo.');
      return;
    }

    _filtrarYRenderizar(allTickets);
    _bindFiltros(allTickets);
  }

  function _filtrarYRenderizar(allTickets) {
    const loteFilter   = document.getElementById('sop-filter-lote')?.value || '';
    const estadoFilter = document.getElementById('sop-filter-estado')?.value || '';
    const buscarFilter = (document.getElementById('sop-filter-buscar')?.value || '').toLowerCase();
    const listEl       = document.getElementById('sop-tickets-list');
    if (!listEl) return;

    let filtered = allTickets;
    if (loteFilter)   filtered = filtered.filter(({ lote }) => lote.id === loteFilter);
    if (estadoFilter) filtered = filtered.filter(({ eq }) => (eq._estadoSoporte || 'Pendiente') === estadoFilter);
    if (buscarFilter) filtered = filtered.filter(({ eq }) =>
      [eq.CODIGO, eq.MARCA, eq.MODELO, eq.SERIE, eq._tecnico, eq._fallaReportada]
        .some(v => (v||'').toLowerCase().includes(buscarFilter))
    );

    if (!filtered.length) {
      listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">Sin resultados para los filtros seleccionados.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(({ eq, lote }, i) => _renderTicketCard(eq, lote, i)).join('');
  }

  function _renderTicketCard(eq, lote, i) {
    const estado = eq._estadoSoporte || 'Pendiente';
    const estadoColor = {
      'Listo para entrega': 'var(--success)', 'En diagnóstico': 'var(--warning)',
      'En reparación': 'var(--info)', 'Esperando repuesto': 'var(--accent)',
      'Sin solución': 'var(--danger)', 'Pendiente': 'var(--text-muted)',
    }[estado] || 'var(--text-muted)';

    const fechaMod = eq._lastModified ? new Date(eq._lastModified).toLocaleString('es-PE') : '—';
    const fotos    = (eq._fotos || []).filter(f => f.thumbUrl || f.url || f.preview).slice(0, 4);
    const repuestos = eq._repuestosUsados || [];
    const gemini   = eq._geminiData;
    const ticketId = `ticket-detail-${eq._registroId}`;

    const fotosThumbHtml = fotos.map(f =>
      `<img src="${f.thumbUrl||f.url||f.preview}" referrerpolicy="no-referrer"
        style="width:48px;height:36px;object-fit:cover;border-radius:4px;border:1px solid var(--border)"
        onerror="this.style.display='none'">`
    ).join('');

    const codigosIA = gemini?.codigos
      ? Object.entries(gemini.codigos).filter(([,v])=>v).map(([k,v])=>`<span style="font-size:0.68rem;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:3px;padding:1px 6px"><strong>${k}:</strong> ${v}</span>`).join(' ')
      : '';

    return `
    <div class="card" style="margin-bottom:10px;padding:0;overflow:hidden">
      <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;cursor:pointer"
        onclick="document.getElementById('${ticketId}').style.display = document.getElementById('${ticketId}').style.display==='none'?'':'none'">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <div style="flex-shrink:0">
            <div style="font-size:0.88rem;font-weight:700;color:var(--text-primary)">${eq.CODIGO || '—'}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">${eq.MARCA || ''} ${eq.MODELO || ''}</div>
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);flex:1;min-width:0">
            <div style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:300px">
              ${eq._fallaReportada ? `⚠️ ${eq._fallaReportada}` : 'Sin falla registrada'}
            </div>
            <div style="margin-top:2px">👨‍🔧 ${eq._tecnico || 'Sin técnico'} · 📦 ${lote.titulo}</div>
          </div>
          ${fotos.length ? `<div style="display:flex;gap:3px;flex-shrink:0">${fotosThumbHtml}</div>` : ''}
          ${codigosIA ? `<div style="flex-shrink:0">${codigosIA}</div>` : ''}
          ${repuestos.length ? `<span style="flex-shrink:0;font-size:0.7rem;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:2px 8px;color:var(--accent)">${repuestos.length} repuesto${repuestos.length>1?'s':''}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-size:0.72rem;font-weight:700;color:${estadoColor};background:${estadoColor}18;border:1px solid ${estadoColor}55;border-radius:10px;padding:3px 10px">${estado}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${fechaMod.split(',')[0]}</span>
          <button onclick="event.stopPropagation();TabTicketsSoporte.exportTicketPDF('${eq._registroId}')"
            class="btn btn-secondary btn-sm" style="font-size:0.68rem;padding:3px 8px">🖨️ PDF</button>
          <span style="color:var(--text-muted);font-size:0.85rem">▼</span>
        </div>
      </div>
      <div id="${ticketId}" style="display:none;border-top:1px solid var(--border);padding:16px;background:var(--bg-hover)">
        <div id="ticket-content-${eq._registroId}">
          ${PlantillaTicketSoporte.generar(eq, lote, getOpciones())}
        </div>
      </div>
    </div>`;
  }

  function _bindFiltros(allTickets) {
    ['sop-filter-lote', 'sop-filter-estado', 'sop-filter-buscar'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => _filtrarYRenderizar(allTickets));
      document.getElementById(id)?.addEventListener('change', () => _filtrarYRenderizar(allTickets));
    });
    document.getElementById('btn-sop-csv')?.addEventListener('click', () => exportCSV(allTickets));
    document.getElementById('btn-sop-pdf-all')?.addEventListener('click', () => exportTodosPDF(allTickets));
  }

  // ── EXPORTS ─────────────────────────────────────────────────────────

  async function exportTicketPDF(registroId) {
    const result = await LotesService.findEquipo(registroId);
    if (!result) { Toast.error('Ticket no encontrado'); return; }
    const { equipo, lote } = result;
    const html = `<div class="ticket-page">${PlantillaTicketSoporte.generar(equipo, lote, getOpciones())}</div>`;
    PrintWindow.abrir(html, 'Ticket_' + (equipo.CODIGO || registroId), 1);
  }

  async function exportTodosPDF(allTickets) {
    if (!allTickets.length) { Toast.warning('Sin tickets para exportar'); return; }
    const opc  = getOpciones();
    const html = allTickets.map(({ eq, lote }) =>
      `<div class="ticket-page">${PlantillaTicketSoporte.generar(eq, lote, opc)}</div>`
    ).join('');
    PrintWindow.abrir(html, 'Tickets_Soporte_' + new Date().toISOString().slice(0,10), 2);
  }

  async function exportPDFPorLote(loteId) {
    const lotes = await LocalCache.getLotes();
    const lote  = loteId ? lotes.find(l => l.id === loteId) : lotes.find(l => l.activo);
    if (!lote) { Toast.warning('Lote no encontrado'); return; }
    if (!lote.equipos?.length) { Toast.warning('El lote está vacío'); return; }
    const opc  = getOpciones();
    const html = lote.equipos.map(eq =>
      `<div class="ticket-page">${PlantillaTicketSoporte.generar(eq, lote, opc)}</div>`
    ).join('');
    PrintWindow.abrir(html, 'Lote_' + lote.titulo.replace(/\s+/g,'_'), 2);
    Toast.info(`Preparando PDF con ${lote.equipos.length} equipos del lote "${lote.titulo}"`);
  }

  function exportCSV(allTickets) {
    if (!allTickets.length) { Toast.warning('Sin tickets para exportar'); return; }
    const headers = ['Lote','Código','Marca','Modelo','Serie','Tipo','Técnico','Estado','Falla','Diagnóstico','Repuestos','Fotos','Fecha'];
    const rows = allTickets.map(({ eq, lote }) => [
      lote.titulo, eq.CODIGO, eq.MARCA, eq.MODELO, eq.SERIE,
      eq.TIP_EQUIP || eq.TIPO_EQUIPO || '',
      eq._tecnico || '', eq._estadoSoporte || 'Pendiente',
      (eq._fallaReportada || '').replace(/\n/g,' '),
      (eq._diagnostico || '').replace(/\n/g,' '),
      (eq._repuestosUsados || []).map(r=>r.nombre).join('; '),
      (eq._fotos || []).filter(f=>f.url).map(f=>f.url).join('; '),
      eq._lastModified || '',
    ]);

    const csv = [headers, ...rows].map(r =>
      r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tickets_soporte_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success(`CSV con ${allTickets.length} tickets exportado`);
  }

  return {
    renderConfigPanel, renderTickets, toggleConfigPanel, onConfigChange,
    resetConfig, guardarConfig, getOpciones,
    exportTicketPDF, exportTodosPDF, exportPDFPorLote, exportCSV,
  };
})();

window.TabTicketsSoporte = TabTicketsSoporte;
