/**
 * modulo-2-reportes/reportes.view.js
 * Vista Módulo 2: Dos tabs — Reportes de lote clásicos + Tickets de Soporte.
 */

const ReportesView = (() => {

  // Config PDF (persiste en localStorage)
  let _opcConfig = null;
  try { const r = localStorage.getItem('sop-pdf-opciones'); _opcConfig = r ? JSON.parse(r) : null; } catch {}

  function _saveOpcConfig(opc) {
    _opcConfig = opc;
    try { localStorage.setItem('sop-pdf-opciones', JSON.stringify(opc)); } catch {}
  }

  function _getOpciones() {
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

  function _onConfigChange() { _saveOpcConfig(_getOpciones()); }

  function _resetConfig() {
    _saveOpcConfig(null);
    const panel = document.getElementById('sop-config-panel');
    if (panel) panel.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
    Toast.info('Configuracion restaurada al estado por defecto');
  }

  function _guardarConfig() { _saveOpcConfig(_getOpciones()); Toast.success('Preferencias de reporte guardadas'); }

  function _renderConfigPanel() {
    const opc    = _opcConfig || {};
    const campos = opc.mostrarCamposEquipo || {};
    const chk = (id, label, checked) => {
      const isOn = checked !== false ? 'checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer;padding:3px 0">' +
        '<input type="checkbox" id="' + id + '" ' + isOn + ' onchange="ReportesView._onConfigChange()" style="accent-color:var(--accent)">' +
        label + '</label>';
    };
    return '<div id="sop-config-panel" style="display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:14px">' +
      '<div style="font-size:0.78rem;font-weight:700;color:var(--text-primary);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">' +
        'Configurar Reporte PDF' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-secondary btn-sm" style="font-size:0.68rem" onclick="ReportesView._resetConfig()">Restaurar</button>' +
          '<button class="btn btn-primary btn-sm" style="font-size:0.68rem" onclick="ReportesView._guardarConfig()">Guardar</button>' +
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

  async function render() {
    const lotes = await LocalCache.getLotes();
    const el = document.getElementById('view-reportes');
    if (!el) return;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📊 Reportes & Soporte</div>
          <div class="page-subtitle">Documentos formales, exportación y tickets de servicio técnico</div>
        </div>
      </div>

      <!-- TABS -->
      <div class="rep-tabs" style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid var(--border)">
        <button class="rep-tab active" id="tab-btn-reportes" onclick="ReportesView.switchTab('reportes')"
          style="padding:8px 18px;border:none;background:none;cursor:pointer;font-size:0.85rem;font-weight:600;color:var(--accent);border-bottom:2px solid var(--accent);margin-bottom:-2px;border-radius:var(--radius-sm) var(--radius-sm) 0 0">
          📋 Reportes de Lote
        </button>
        <button class="rep-tab" id="tab-btn-soporte" onclick="ReportesView.switchTab('soporte')"
          style="padding:8px 18px;border:none;background:none;cursor:pointer;font-size:0.85rem;font-weight:600;color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;border-radius:var(--radius-sm) var(--radius-sm) 0 0">
          🔧 Tickets Soporte
        </button>
        <button class="rep-tab" id="tab-btn-compras" onclick="ReportesView.switchTab('compras')"
          style="padding:8px 18px;border:none;background:none;cursor:pointer;font-size:0.85rem;font-weight:600;color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;border-radius:var(--radius-sm) var(--radius-sm) 0 0">
          🛒 Orden de Compra
        </button>
      </div>

      <!-- TAB: REPORTES CLÁSICOS -->
      <div id="tab-panel-reportes">
        <div style="display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start" class="rep-grid" id="rep-grid-reportes">

          <!-- Panel control -->
          <div style="display:flex;flex-direction:column;gap:12px" id="rep-sidebar-reportes">
            <div class="card">
              <div class="card-title">Configuración</div>
              <div class="form-group">
                <label class="form-label">Lote</label>
                <select class="form-control" id="rep-lote-sel">
                  ${lotes.map(l=>`<option value="${l.id}" ${l.activo?'selected':''}>${l.titulo} (${l.equipos?.length||0})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo de Documento</label>
                <select class="form-control" id="rep-tipo-sel">
                  <option value="reporte">📋 Reporte de Lote</option>
                  <option value="garantia">🛡️ Remisión Garantía Proveedor</option>
                </select>
              </div>
              <div id="rep-extra-fields"></div>
              <button class="btn btn-primary" style="width:100%" id="btn-rep-generar">👁️ Vista Previa</button>
            </div>

            <div class="card">
              <div class="card-title">Exportar</div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <button class="btn btn-secondary" id="btn-rep-pdf">🖨️ Exportar PDF</button>
                <button class="btn btn-secondary" id="btn-rep-csv">⬇️ Exportar CSV</button>
                <button class="btn btn-secondary" id="btn-rep-xlsx">📊 Exportar Excel</button>
              </div>
            </div>

            <div class="card" id="rep-resumen-card" style="display:none">
              <div class="card-title">Resumen del Lote</div>
              <div id="rep-resumen-content"></div>
            </div>
          </div>

          <!-- Preview -->
          <div style="min-width:0">
            <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
              <button class="btn btn-secondary btn-sm" id="btn-toggle-rep-sidebar"
                onclick="ReportesView.toggleRepSidebar()"
                style="font-size:0.7rem;padding:4px 10px">◀ Ocultar panel</button>
            </div>
            <div id="rep-preview-area" style="color:var(--text-muted);text-align:center;padding:60px;overflow-x:auto;max-width:100%">
              <div style="font-size:3rem">📄</div>
              <div style="margin-top:10px">Selecciona un lote y tipo de documento,<br>luego haz clic en Vista Previa</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: ORDEN DE COMPRA -->
      <div id="tab-panel-compras" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select class="form-control" id="compras-filter-lote" style="width:auto;min-width:180px"
              onchange="ReportesView.renderOrdenCompra()">
              <option value="">Todos los lotes</option>
              ${lotes.map(l=>`<option value="${l.id}" ${l.activo?'selected':''}>${l.titulo}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" id="btn-compras-cols" onclick="ReportesView.toggleComprasColPanel()">&#9881;&#65039; Columnas</button>
            <button class="btn btn-secondary btn-sm" onclick="ReportesView.exportOrdenCompraPDF()">&#128438; Imprimir / PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="ReportesView.exportOrdenCompraExcel()">&#128202; Exportar Excel</button>
          </div>
        </div>
        <div id="compras-tabla-wrapper">
          <div style="padding:40px;text-align:center;color:var(--text-muted)">
            <div style="font-size:2.5rem">🛒</div>
            <div style="margin-top:8px">Selecciona un lote para generar la orden de compra</div>
          </div>
        </div>
      </div>

      <!-- TAB: TICKETS SOPORTE -->
      <div id="tab-panel-soporte" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select class="form-control" id="sop-filter-lote" style="width:auto;min-width:180px">
              <option value="">Todos los lotes</option>
              ${lotes.map(l=>`<option value="${l.id}">${l.titulo}</option>`).join('')}
            </select>
            <select class="form-control" id="sop-filter-estado" style="width:auto;min-width:160px">
              <option value="">Todos los estados</option>
              <option>Pendiente</option>
              <option>En diagnóstico</option>
              <option>En reparación</option>
              <option>Esperando repuesto</option>
              <option>Listo para entrega</option>
              <option>Sin solución</option>
            </select>
            <input type="text" class="form-control" id="sop-filter-buscar" placeholder="🔍 Buscar código, modelo…" style="width:auto;min-width:180px">
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" id="btn-sop-config" onclick="ReportesView.toggleConfigPanel()">&#9881;&#65039; Configurar PDF</button>
            <button class="btn btn-secondary btn-sm" id="btn-sop-pdf-lote" onclick="ReportesView.exportPDFPorLote(document.getElementById('sop-filter-lote')?.value||'')">&#128230; PDF Lote Completo</button>
            <button class="btn btn-secondary btn-sm" id="btn-sop-pdf-all">🖨️ PDF Todos</button>
            <button class="btn btn-secondary btn-sm" id="btn-sop-csv">&#11015;&#65039; CSV</button>
          </div>
        </div>

        ${_renderConfigPanel()}

        <!-- Stats soporte -->
        <div id="sop-stats-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"></div>

        <!-- Lista de tickets -->
        <div id="sop-tickets-list"></div>
      </div>
    `;

    _bindEventosReportes(lotes);
    _renderTicketsSoporte(lotes);
  }

  // ── TAB SWITCHING ─────────────────────────────────────────────────────────
  function switchTab(tab) {
    const tabs   = ['reportes', 'soporte', 'compras'];
    tabs.forEach(t => {
      const btn   = document.getElementById(`tab-btn-${t}`);
      const panel = document.getElementById(`tab-panel-${t}`);
      const active = t === tab;
      if (panel) panel.style.display = active ? '' : 'none';
      if (btn) {
        btn.style.color        = active ? 'var(--accent)' : 'var(--text-muted)';
        btn.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
      }
    });
    if (tab === 'soporte') {
      LocalCache.getLotes().then(lotes => _renderTicketsSoporte(lotes));
    }
    if (tab === 'compras') {
      renderOrdenCompra();
    }
  }

  // ── TICKETS SOPORTE ───────────────────────────────────────────────────────
  async function _renderTicketsSoporte(lotes) {
    const listEl  = document.getElementById('sop-tickets-list');
    const statsEl = document.getElementById('sop-stats-row');
    if (!listEl) return;

    // Recolectar todos los equipos con datos de soporte
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
      listEl.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:12px">🔧</div>
        <div style="font-weight:600">Sin tickets de soporte</div>
        <div style="font-size:0.82rem;margin-top:6px">Los tickets aparecen aquí cuando usas el botón "Soporte" en el historial de un equipo.</div>
      </div>`;
      return;
    }

    _filtrarYRenderizarTickets(allTickets);
    _bindFiltros(allTickets);
  }

  function _filtrarYRenderizarTickets(allTickets) {
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
      <!-- CARD HEADER (siempre visible) -->
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
          <button onclick="event.stopPropagation();ReportesView.exportTicketPDF('${eq._registroId}')"
            class="btn btn-secondary btn-sm" style="font-size:0.68rem;padding:3px 8px">🖨️ PDF</button>
          <span style="color:var(--text-muted);font-size:0.85rem">▼</span>
        </div>
      </div>

      <!-- DETAIL EXPANDIDO -->
      <div id="${ticketId}" style="display:none;border-top:1px solid var(--border);padding:16px;background:var(--bg-hover)">
        <div id="ticket-content-${eq._registroId}">
          ${PlantillaTicketSoporte.generar(eq, lote, _getOpciones())}
        </div>
      </div>
    </div>`;
  }

  function _bindFiltros(allTickets) {
    ['sop-filter-lote', 'sop-filter-estado', 'sop-filter-buscar'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => _filtrarYRenderizarTickets(allTickets));
      document.getElementById(id)?.addEventListener('change', () => _filtrarYRenderizarTickets(allTickets));
    });

    document.getElementById('btn-sop-csv')?.addEventListener('click', () => _exportarSoporteCSV(allTickets));
    document.getElementById('btn-sop-pdf-all')?.addEventListener('click', () => _exportarTodosPDF(allTickets));
  }

  function _abrirVentanaImpresion(ticketsHtml, filename, cols = 2) {
    const win = window.open('', '_blank', 'width=1000,height=750');
    if (!win) { Toast.error('Activa las ventanas emergentes para imprimir'); return; }

    const bodyFontSize = cols >= 4 ? '9px' : cols === 2 ? '11px' : '12px';
    const initWidth = cols === 1 ? '100%' : cols === 4 ? 'calc(25% - 12px)' : 'calc(50% - 8px)';
    const printWidth = cols === 1 ? '100%' : cols === 4 ? 'calc(25% - 6px)' : 'calc(50% - 4px)';

    win.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', system-ui, Arial, sans-serif;
          background: #f1f5f9;
          color: #1e293b;
          font-size: ${bodyFontSize};
          padding: 16px;
        }

        /* Contenedor flexible de tickets */
        .tickets-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        /* Cada ticket: evitar rupturas entre páginas */
        .ticket-page {
          width: ${initWidth};
          break-inside: avoid;
          page-break-inside: avoid;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #cbd5e1;
        }

        /* Asegurar que imágenes dentro del ticket se escalen bien */
        .ticket-soporte-doc img {
          max-width: 100%;
          height: auto;
        }

        @media print {
          body { padding: 5mm; background: #fff; }
          .no-print { display: none !important; }
          .tickets-grid { gap: 8px; }
          .ticket-page {
            width: ${printWidth} !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          @page { margin: 6mm; size: A4; }
        }

        .no-print { display: flex; }
      </style>
    </head><body>
      <div class="no-print" style="
        position:sticky;top:0;
        background:linear-gradient(135deg,#0f172a,#1e293b);
        padding:10px 16px;
        display:flex;gap:10px;align-items:center;
        z-index:999;
        margin:-16px -16px 16px;
        flex-wrap:wrap;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
      ">
        <span style="font-size:13px;font-weight:700;color:#fff">🖨️ Tickets de Soporte</span>
        <button onclick="window.print()" style="
          background:linear-gradient(135deg,#7c3aed,#6d28d9);
          color:#fff;border:none;border-radius:8px;
          padding:8px 20px;font-size:12px;cursor:pointer;font-weight:700;
          box-shadow:0 2px 8px rgba(124,58,237,0.4);
        ">
          🖨️ Imprimir / Guardar PDF
        </button>
        <span style="font-size:10.5px;color:#94a3b8">
          Selecciona <strong style="color:#c4b5fd">"Guardar como PDF"</strong> en el diálogo para descargar.
        </span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <label style="font-size:10.5px;color:#94a3b8">Tickets por fila:</label>
          <select onchange="_cambiarDensidad(this.value)" style="
            padding:5px 10px;border-radius:6px;
            border:1px solid #334155;
            background:#1e293b;color:#e2e8f0;
            font-size:12px;cursor:pointer;
          ">
            <option value="1" ${cols===1?'selected':''}>1 — Grande</option>
            <option value="2" ${cols!==1&&cols!==4?'selected':''}>2 — Estándar</option>
            <option value="4" ${cols===4?'selected':''}>4 — Compacto</option>
          </select>
        </div>
        <button onclick="window.close()" style="
          background:#dc2626;color:#fff;border:none;
          border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;
        ">✕ Cerrar</button>
      </div>
      <div class="tickets-grid" id="tickets-grid">
        ${ticketsHtml}
      </div>
    </body></html>`);

    win.document.write(`<script>
      function _cambiarDensidad(v) {
        const g = document.getElementById('tickets-grid');
        if (!g) return;
        const n = parseInt(v);
        const items = g.querySelectorAll('.ticket-page');
        items.forEach(item => {
          if (n === 1) {
            item.style.width = '100%';
          } else if (n === 4) {
            item.style.width = 'calc(25% - 12px)';
          } else {
            item.style.width = 'calc(50% - 8px)';
          }
        });
        document.body.style.fontSize = n >= 4 ? '9px' : n === 2 ? '11px' : '12px';
      }
    <\/script>`);

    win.document.close();
    win.focus();
  }



  // ── EXPORTAR TICKET INDIVIDUAL PDF ────────────────────────────────────
  async function exportTicketPDF(registroId) {
    const lotes = await LocalCache.getLotes();
    let eq = null, lote = null;
    for (const l of lotes) {
      const found = l.equipos?.find(e => e._registroId === registroId);
      if (found) { eq = found; lote = l; break; }
    }
    if (!eq) { Toast.error('Ticket no encontrado'); return; }
    const html = `<div class="ticket-page">${PlantillaTicketSoporte.generar(eq, lote, _getOpciones())}</div>`;
    _abrirVentanaImpresion(html, 'Ticket_' + (eq.CODIGO || registroId), 1);
  }

  // ── EXPORTAR TODOS PDF (todos los tickets visibles) ─────────────────────────
  async function _exportarTodosPDF(allTickets) {
    if (!allTickets.length) { Toast.warning('Sin tickets para exportar'); return; }
    const opc  = _getOpciones();
    const html = allTickets.map(({ eq, lote }) =>
      `<div class="ticket-page">${PlantillaTicketSoporte.generar(eq, lote, opc)}</div>`
    ).join('');
    _abrirVentanaImpresion(html, 'Tickets_Soporte_' + new Date().toISOString().slice(0,10), 2);
  }

  // ── EXPORTAR PDF DE UN LOTE COMPLETO ───────────────────────────────────────
  async function exportPDFPorLote(loteId) {
    const lotes = await LocalCache.getLotes();
    const lote  = loteId ? lotes.find(l => l.id === loteId) : lotes.find(l => l.activo);
    if (!lote) { Toast.warning('Lote no encontrado'); return; }
    if (!lote.equipos?.length) { Toast.warning('El lote está vacío'); return; }

    // Todos los equipos del lote (tengan o no datos de soporte)
    const opc  = _getOpciones();
    const html = lote.equipos.map(eq =>
      `<div class="ticket-page">${PlantillaTicketSoporte.generar(eq, lote, opc)}</div>`
    ).join('');
    _abrirVentanaImpresion(html, 'Lote_' + lote.titulo.replace(/\s+/g,'_'), 2);
    Toast.info(`Preparando PDF con ${lote.equipos.length} equipos del lote "${lote.titulo}"`);
  }

  // ── EXPORTAR CSV ───────────────────────────────────────────────────────────
  function _exportarSoporteCSV(allTickets) {
    if (!allTickets.length) { Toast.warning('Sin tickets para exportar'); return; }
    const headers = ['Lote','Código','Marca','Modelo','Serie','Tipo','Técnico','Estado','Falla','Diagnóstico','Repuestos','Fotos','Fecha'];
    const rows = allTickets.map(({ eq, lote }) => [
      lote.titulo,
      eq.CODIGO,
      eq.MARCA,
      eq.MODELO,
      eq.SERIE,
      eq.TIP_EQUIP || eq.TIPO_EQUIPO || '',
      eq._tecnico || '',
      eq._estadoSoporte || 'Pendiente',
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

  // ── REPORTES CLÁSICOS (sin cambios) ──────────────────────────────────────
  function _bindEventosReportes(lotes) {
    document.getElementById('rep-tipo-sel')?.addEventListener('change', _updateExtraFields);
    _updateExtraFields();

    document.getElementById('rep-lote-sel')?.addEventListener('change', async () => {
      await _actualizarResumen(lotes);
    });

    document.getElementById('btn-rep-generar')?.addEventListener('click', async () => {
      await _generarPreview(lotes);
    });

    document.getElementById('btn-rep-pdf')?.addEventListener('click', async () => {
      const hasPreview = document.getElementById('doc-garantia-proveedor') || document.getElementById('doc-reporte-lote');
      if (!hasPreview) { Toast.warning('Genera la vista previa primero'); return; }
      const element = document.getElementById('rep-preview-area');
      const btn = document.getElementById('btn-rep-pdf');
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Generando...'; }
      try {
        await html2pdf().set({
          margin: 10, filename: 'reporte_lote.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, windowWidth: 1200 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        }).from(element).save();
        Toast.success('PDF generado con éxito');
      } catch (err) {
        Toast.error('Error al exportar PDF');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '🖨️ Exportar PDF'; }
      }
    });

    document.getElementById('btn-rep-csv')?.addEventListener('click', async () => {
      const lote = await _getLoteSeleccionado(lotes);
      if (!lote) return;
      ImportExport.exportLote(lote, 'csv');
    });

    document.getElementById('btn-rep-xlsx')?.addEventListener('click', async () => {
      const lote = await _getLoteSeleccionado(lotes);
      if (!lote) return;
      ImportExport.exportLote(lote, 'xlsx');
    });
  }

  function _updateExtraFields() {
    const tipo = document.getElementById('rep-tipo-sel')?.value;
    const el   = document.getElementById('rep-extra-fields');
    if (!el) return;
    if (tipo === 'garantia') {
      el.innerHTML = `<div class="form-group">
        <label class="form-label">Proveedor</label>
        <select class="form-control" id="rep-proveedor">
          <option value="">— Seleccionar —</option>
          ${(APP_CONFIG.catalogos.proveedores||[]).map(p=>`<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>`;
    } else {
      el.innerHTML = '';
    }
  }

  async function _generarPreview(lotes) {
    const lote = await _getLoteSeleccionado(lotes);
    if (!lote) { Toast.warning('Selecciona un lote'); return; }
    if (!lote.equipos?.length) { Toast.warning('El lote está vacío'); return; }
    const tipo      = document.getElementById('rep-tipo-sel')?.value;
    const proveedor = document.getElementById('rep-proveedor')?.value || '';
    const html = tipo === 'garantia'
      ? PlantillaGarantiaProveedor.generar(lote, proveedor)
      : PlantillaReporteLote.generar(lote);
    const preview = document.getElementById('rep-preview-area');
    if (preview) preview.innerHTML = html;
    const resumenCard    = document.getElementById('rep-resumen-card');
    const resumenContent = document.getElementById('rep-resumen-content');
    if (resumenCard && resumenContent) {
      resumenCard.style.display = 'block';
      resumenContent.innerHTML  = AgrupadorLotes.renderResumen(lote.equipos);
    }
  }

  async function _getLoteSeleccionado(lotes) {
    const id = document.getElementById('rep-lote-sel')?.value;
    return lotes.find(l => l.id === id) || null;
  }

  async function _actualizarResumen(lotes) {
    const lote = await _getLoteSeleccionado(lotes);
    const resumenCard    = document.getElementById('rep-resumen-card');
    const resumenContent = document.getElementById('rep-resumen-content');
    if (!lote || !resumenCard || !resumenContent) return;
    resumenCard.style.display = 'block';
    resumenContent.innerHTML  = AgrupadorLotes.renderResumen(lote.equipos);
  }

  // ── ORDEN DE COMPRA ─────────────────────────────────────────────

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

  function toggleComprasColPanel() {
    const panel = document.getElementById('compras-col-panel');
    const btn   = document.getElementById('btn-compras-cols');
    if (!panel) return;
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : '';
    if (btn) { btn.style.background = visible ? '' : 'var(--accent)'; btn.style.color = visible ? '' : '#fff'; }
  }

  function _renderComprasColPanel() {
    const vis = _getComprasCols();
    return `<div id="compras-col-panel" style="display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:12px">
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        Columnas visibles
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" style="font-size:0.68rem" onclick="ReportesView._resetComprasCols()">Restaurar</button>
          <button class="btn btn-primary btn-sm" style="font-size:0.68rem" onclick="ReportesView.toggleComprasColPanel()">Cerrar</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${COMPRAS_COLS.map(c => `
          <label style="display:flex;align-items:center;gap:5px;font-size:0.75rem;cursor:pointer;background:var(--bg-hover);padding:4px 10px;border-radius:var(--radius-sm);border:1px solid var(--border)">
            <input type="checkbox" id="cc-${c.key}" ${vis[c.key]!==false?'checked':''}
              onchange="ReportesView._onComprasColChange()" style="accent-color:var(--accent)">
            ${c.label}
          </label>`).join('')}
      </div>
    </div>`;
  }

  function _onComprasColChange() {
    const vis = {};
    COMPRAS_COLS.forEach(c => { vis[c.key] = document.getElementById('cc-' + c.key)?.checked !== false; });
    _saveComprasCols(vis);
    renderOrdenCompra();
  }

  function _resetComprasCols() {
    const def = {};
    COMPRAS_COLS.forEach(c => { def[c.key] = c.default; });
    _saveComprasCols(def);
    COMPRAS_COLS.forEach(c => { const el = document.getElementById('cc-' + c.key); if (el) el.checked = true; });
    renderOrdenCompra();
    Toast.info('Columnas restauradas');
  }

  async function renderOrdenCompra() {
    const wrapper = document.getElementById('compras-tabla-wrapper');
    if (!wrapper) return;
    const loteId = document.getElementById('compras-filter-lote')?.value || '';
    const lotes  = await LocalCache.getLotes();
    const empresa = APP_CONFIG.empresa?.nombre || 'Empresa';
    const vis     = _getComprasCols();

    // Collect rows: one per repuesto per equipment
    const filas = [];
    for (const lote of lotes) {
      if (loteId && lote.id !== loteId) continue;
      for (const eq of (lote.equipos || [])) {
        const repuestos = eq._repuestosUsados || [];
        if (!repuestos.length) continue;
        for (const rep of repuestos) {
          filas.push({
            lote,
            eq,
            repuesto: rep.repuesto || rep.nombre || '—',
            pn:       rep.pn || '—',
            fecha:    rep.timestamp ? new Date(rep.timestamp).toLocaleDateString('es-PE') : new Date(lote.fechaCreacion).toLocaleDateString('es-PE'),
            tecnico:  lote.tecnico || eq._tecnico || '—',
          });
        }
      }
    }

    if (!filas.length) {
      wrapper.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">
        <div style="font-size:2.5rem">📭</div>
        <div style="margin-top:8px">No hay repuestos registrados en este lote.<br>
          <small>Añade repuestos desde Ingreso → Modo Soporte.</small>
        </div>
      </div>`;
      return;
    }

    // Generar cabeceras según columnas visibles
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
      ${_renderComprasColPanel()}
      <div id="compras-printable" style="overflow-x:auto">
        <table class="data-table" style="border-collapse:collapse;width:100%;font-size:0.8rem">
          <thead>
            <tr style="background:var(--accent);color:#fff">
              ${thCells}
            </tr>
          </thead>
          <tbody>
            ${filas.map((f, i) => `
              <tr style="background:${i%2===0?'var(--bg-card)':'var(--bg-hover)'}">${tdRow(f, i)}</tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top:12px;font-size:0.7rem;color:var(--text-muted)">
          Total de repuestos: <strong>${filas.length}</strong> ·
          Generado: ${new Date().toLocaleString('es-PE')}
        </div>
      </div>
    `;
  }

  async function exportOrdenCompraPDF() {
    const loteId = document.getElementById('compras-filter-lote')?.value || '';
    const lotes  = await LocalCache.getLotes();
    const empresa = APP_CONFIG.empresa?.nombre || 'Empresa';

    const filas = [];
    for (const lote of lotes) {
      if (loteId && lote.id !== loteId) continue;
      for (const eq of (lote.equipos || [])) {
        for (const rep of (eq._repuestosUsados || [])) {
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

    if (!filas.length) { Toast.warning('No hay repuestos para imprimir'); return; }

    const loteTitulo = loteId ? lotes.find(l=>l.id===loteId)?.titulo : 'Todos los lotes';
    const win = window.open('', '_blank', 'width=1000,height=750');
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
        .no-print { display:block; }
        @media print {
          .no-print { display:none !important; }
          body { padding:10px; }
        }
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
${(()=>{
          const loteObj = lotes.find(l=>l.id===loteId) || lotes.find(l=>l.activo) || lotes[0];
          const loteFecha = loteObj?.fechaCreacion ? new Date(loteObj.fechaCreacion).toLocaleDateString('es-PE') : '—';
          const loteTecnico = loteObj?.tecnico || '—';
          return `<p><strong>${empresa}</strong> · Lote: <strong>${loteTitulo}</strong> · Fecha creación lote: <strong>${loteFecha}</strong> · Técnico: <strong>${loteTecnico}</strong></p>
        <p style="margin-top:3px;color:#777">Documento generado: ${new Date().toLocaleString('es-PE')}</p>`;
        })()}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Código</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Serie</th>
            <th>Repuesto a comprar</th>
            <th>PN / Código</th>
            <th>Fecha solicitud</th>
            <th class="checkbox-cell" style="min-width:45px">□ Llegó</th>
            <th class="empty-cell">Fecha colocación</th>
            <th class="empty-cell">Técnico instalación</th>
          </tr>
        </thead>
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

  async function exportOrdenCompraExcel() {
    const loteId = document.getElementById('compras-filter-lote')?.value || '';
    const lotes  = await LocalCache.getLotes();

    const filas = [];
    for (const lote of lotes) {
      if (loteId && lote.id !== loteId) continue;
      for (const eq of (lote.equipos || [])) {
        for (const rep of (eq._repuestosUsados || [])) {
          filas.push([
            lote.titulo,
            eq.CODIGO || '',
            eq.MARCA  || '',
            eq.MODELO || '',
            eq.SERIE  || '',
            rep.repuesto || rep.nombre || '',
            rep.pn || '',
            rep.timestamp ? new Date(rep.timestamp).toLocaleDateString('es-PE') : new Date(lote.fechaCreacion).toLocaleDateString('es-PE'),
            '',  // □ Llegó
            '',  // Fecha colocación
            '',  // Técnico instalación
          ]);
        }
      }
    }

    if (!filas.length) { Toast.warning('No hay repuestos para exportar'); return; }

    const headers = ['Lote','Código','Marca','Modelo','Serie','Repuesto a comprar','PN/Código','Fecha solicitud','□ Llegó','Fecha colocación','Técnico instalación'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...filas]);

    // Style: column widths
    ws['!cols'] = [14,10,10,18,16,20,16,14,8,14,18].map(w=>({wch:w}));

    // Bold header row
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


  // ── TOGGLE SIDEBAR REP ────────────────────────────────────────
  function toggleRepSidebar() {
    const sidebar = document.getElementById('rep-sidebar-reportes');
    const grid    = document.getElementById('rep-grid-reportes');
    const btn     = document.getElementById('btn-toggle-rep-sidebar');
    if (!sidebar || !grid) return;
    const collapsed = sidebar.style.display === 'none';
    if (collapsed) {
      sidebar.style.display = '';
      grid.style.gridTemplateColumns = '280px 1fr';
      if (btn) btn.textContent = '◀ Ocultar panel';
    } else {
      sidebar.style.display = 'none';
      grid.style.gridTemplateColumns = '1fr';
      if (btn) btn.textContent = '▶ Mostrar panel';
    }
  }

  return { render, switchTab, exportTicketPDF, exportPDFPorLote, toggleConfigPanel, _onConfigChange, _resetConfig, _guardarConfig, renderOrdenCompra, exportOrdenCompraPDF, exportOrdenCompraExcel, toggleComprasColPanel, _onComprasColChange, _resetComprasCols, toggleRepSidebar };
})();

window.ReportesView = ReportesView;
