/**
 * modulo-2-reportes/reportes.view.js — Inventario Pro v3
 * Vista principal del Módulo 2 — ORQUESTADOR.
 *
 * Delega a sub-módulos:
 *   - TabTicketsSoporte  → tickets, config PDF, filtros, exports
 *   - TabOrdenCompra     → tabla de repuestos, PDF, Excel
 *   - PrintWindow        → ventana de impresión reutilizable
 *
 * ANTES: 1,064 líneas → AHORA: ~130 líneas
 */

const ReportesView = (() => {

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
          📋 Reportes de Tareas
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
          <div style="display:flex;flex-direction:column;gap:12px" id="rep-sidebar-reportes">
            <div class="card">
              <div class="card-title">Configuración</div>
              <div class="form-group">
                <label class="form-label">Tarea Activa / Historial</label>
                <select class="form-control" id="rep-lote-sel">
                  ${lotes.map(l=>`<option value="${l.id}" ${l.activo?'selected':''}>${l.titulo} (${l.equipos?.length||0})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo de Documento</label>
                <select class="form-control" id="rep-tipo-sel">
                  <option value="reporte">📋 Reporte de Actividades / Tarea</option>
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
          <div style="min-width:0">
            <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
              <button class="btn btn-secondary btn-sm" id="btn-toggle-rep-sidebar"
                onclick="ReportesView.toggleRepSidebar()"
                style="font-size:0.7rem;padding:4px 10px">◀ Ocultar panel</button>
            </div>
            <div id="rep-preview-area" style="color:var(--text-muted);text-align:center;padding:60px;overflow-x:auto;max-width:100%">
              ${DOM.emptyState('📄', 'Vista previa', 'Selecciona una tarea y tipo de documento, luego haz clic en Vista Previa')}
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: ORDEN DE COMPRA -->
      <div id="tab-panel-compras" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select class="form-control" id="compras-filter-lote" style="width:auto;min-width:180px"
              onchange="TabOrdenCompra.renderTabla()">
              <option value="">Todos los lotes</option>
              ${lotes.map(l=>`<option value="${l.id}" ${l.activo?'selected':''}>${l.titulo}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" id="btn-compras-cols" onclick="TabOrdenCompra.toggleColPanel()">⚙️ Columnas</button>
            <button class="btn btn-secondary btn-sm" onclick="TabOrdenCompra.exportPDF()">🖶 Imprimir / PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="TabOrdenCompra.exportExcel()">📊 Exportar Excel</button>
          </div>
        </div>
        <div id="compras-tabla-wrapper">
          ${DOM.emptyState('🛒', 'Orden de Compra', 'Selecciona un lote para generar la orden de compra')}
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
              <option>Pendiente</option><option>En diagnóstico</option><option>En reparación</option>
              <option>Esperando repuesto</option><option>Listo para entrega</option><option>Sin solución</option>
            </select>
            <input type="text" class="form-control" id="sop-filter-buscar" placeholder="🔍 Buscar código, modelo…" style="width:auto;min-width:180px">
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" id="btn-sop-config" onclick="TabTicketsSoporte.toggleConfigPanel()">⚙️ Configurar PDF</button>
            <button class="btn btn-secondary btn-sm" id="btn-sop-pdf-lote" onclick="TabTicketsSoporte.exportPDFPorLote(document.getElementById('sop-filter-lote')?.value||'')">📦 PDF Lote Completo</button>
            <button class="btn btn-secondary btn-sm" id="btn-sop-pdf-all">🖨️ PDF Todos</button>
            <button class="btn btn-secondary btn-sm" id="btn-sop-csv">⬇️ CSV</button>
          </div>
        </div>
        ${TabTicketsSoporte.renderConfigPanel()}
        <div id="sop-stats-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"></div>
        <div id="sop-tickets-list"></div>
      </div>
    `;

    _bindEventosReportes(lotes);
    TabTicketsSoporte.renderTickets(lotes);
  }

  // ── TAB SWITCHING ─────────────────────────────────────────────────

  function switchTab(tab) {
    const tabs = ['reportes', 'soporte', 'compras'];
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
    if (tab === 'soporte') LocalCache.getLotes().then(lotes => TabTicketsSoporte.renderTickets(lotes));
    if (tab === 'compras') TabOrdenCompra.renderTabla();
  }

  // ── REPORTES CLÁSICOS ─────────────────────────────────────────────

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
    } else { el.innerHTML = ''; }
  }

  async function _generarPreview(lotes) {
    const lote = await _getLoteSeleccionado(lotes);
    if (!lote) { Toast.warning('Selecciona un lote'); return; }
    if (!lote.equipos?.length) { Toast.warning('El lote está vacío'); return; }
    const tipo      = document.getElementById('rep-tipo-sel')?.value;
    const proveedor = document.getElementById('rep-proveedor')?.value || '';
    const html = tipo === 'garantia'
      ? PlantillaGarantiaProveedor.generar(lote, proveedor)
      : PlantillaReporteTarea.generar(lote);
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

  // ── TOGGLE SIDEBAR ─────────────────────────────────────────────────

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

  // ── Compat: mantener exports antiguos que otros módulos puedan usar ─

  return {
    render, switchTab, toggleRepSidebar,
    // Delegados a sub-módulos (para onclick existentes)
    exportTicketPDF:      (id) => TabTicketsSoporte.exportTicketPDF(id),
    exportPDFPorLote:     (id) => TabTicketsSoporte.exportPDFPorLote(id),
    toggleConfigPanel:    ()   => TabTicketsSoporte.toggleConfigPanel(),
    _onConfigChange:      ()   => TabTicketsSoporte.onConfigChange(),
    _resetConfig:         ()   => TabTicketsSoporte.resetConfig(),
    _guardarConfig:       ()   => TabTicketsSoporte.guardarConfig(),
    renderOrdenCompra:    ()   => TabOrdenCompra.renderTabla(),
    exportOrdenCompraPDF: ()   => TabOrdenCompra.exportPDF(),
    exportOrdenCompraExcel:()  => TabOrdenCompra.exportExcel(),
    toggleComprasColPanel:()   => TabOrdenCompra.toggleColPanel(),
    _onComprasColChange:  ()   => TabOrdenCompra.onColChange(),
    _resetComprasCols:    ()   => TabOrdenCompra.resetCols(),
  };
})();

window.ReportesView = ReportesView;
