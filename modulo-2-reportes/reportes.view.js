/**
 * modulo-2-reportes/reportes.view.js
 * Vista Módulo 2: Dos tabs — Reportes de lote clásicos + Tickets de Soporte.
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
          📋 Reportes de Lote
        </button>
        <button class="rep-tab" id="tab-btn-soporte" onclick="ReportesView.switchTab('soporte')"
          style="padding:8px 18px;border:none;background:none;cursor:pointer;font-size:0.85rem;font-weight:600;color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;border-radius:var(--radius-sm) var(--radius-sm) 0 0">
          🔧 Tickets Soporte
        </button>
      </div>

      <!-- TAB: REPORTES CLÁSICOS -->
      <div id="tab-panel-reportes">
        <div style="display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start" class="rep-grid">

          <!-- Panel control -->
          <div style="display:flex;flex-direction:column;gap:12px">
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
          <div>
            <div id="rep-preview-area" style="color:var(--text-muted);text-align:center;padding:60px">
              <div style="font-size:3rem">📄</div>
              <div style="margin-top:10px">Selecciona un lote y tipo de documento,<br>luego haz clic en Vista Previa</div>
            </div>
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
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" id="btn-sop-pdf-all">🖨️ PDF Todos</button>
            <button class="btn btn-secondary btn-sm" id="btn-sop-csv">⬇️ CSV</button>
          </div>
        </div>

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
    const tabs   = ['reportes', 'soporte'];
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
          ${PlantillaTicketSoporte.generar(eq, lote)}
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

  // ── EXPORTAR TICKET INDIVIDUAL PDF ────────────────────────────────────────
  async function exportTicketPDF(registroId) {
    const lotes = await LocalCache.getLotes();
    let eq = null, lote = null;
    for (const l of lotes) {
      const found = l.equipos?.find(e => e._registroId === registroId);
      if (found) { eq = found; lote = l; break; }
    }
    if (!eq) { Toast.error('Ticket no encontrado'); return; }

    const html = PlantillaTicketSoporte.generar(eq, lote);
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;padding:20px;width:900px';
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    try {
      await html2pdf().set({
        margin: 10,
        filename: `ticket_soporte_${eq.CODIGO || registroId}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(wrapper).save();
      Toast.success('PDF generado');
    } catch (err) {
      Toast.error('Error al generar PDF: ' + err.message);
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  // ── EXPORTAR TODOS PDF ────────────────────────────────────────────────────
  async function _exportarTodosPDF(allTickets) {
    if (!allTickets.length) { Toast.warning('Sin tickets para exportar'); return; }
    const btn = document.getElementById('btn-sop-pdf-all');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Generando…'; }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;padding:20px;width:900px';
    wrapper.innerHTML = allTickets.map(({ eq, lote }) =>
      `<div style="page-break-after:always">${PlantillaTicketSoporte.generar(eq, lote)}</div>`
    ).join('');
    document.body.appendChild(wrapper);

    try {
      await html2pdf().set({
        margin: 10, filename: `tickets_soporte_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(wrapper).save();
      Toast.success(`PDF con ${allTickets.length} tickets generado`);
    } catch (err) {
      Toast.error('Error al generar PDF');
    } finally {
      document.body.removeChild(wrapper);
      if (btn) { btn.disabled = false; btn.innerHTML = '🖨️ PDF Todos'; }
    }
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

  return { render, switchTab, exportTicketPDF };
})();

window.ReportesView = ReportesView;
