/**
 * modulo-2-reportes/reportes.view.js
 * Vista Módulo 2: Selector de lote + preview de documento + export PDF/CSV/XLSX.
 */

const ReportesView = (() => {

  async function render() {
    const lotes = await LocalCache.getLotes();
    const el = document.getElementById('view-reportes');
    if (!el) return;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📊 Reportes</div>
          <div class="page-subtitle">Genera documentos formales y exporta datos</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start">

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

          <!-- Resumen rápido del lote seleccionado -->
          <div class="card" id="rep-resumen-card" style="display:none">
            <div class="card-title">Resumen del Lote</div>
            <div id="rep-resumen-content"></div>
          </div>
        </div>

        <!-- Preview del documento -->
        <div>
          <div id="rep-preview-area" style="color:var(--text-muted);text-align:center;padding:60px">
            <div style="font-size:3rem">📄</div>
            <div style="margin-top:10px">Selecciona un lote y tipo de documento,<br>luego haz clic en Vista Previa</div>
          </div>
        </div>

      </div>
    `;

    _bindEvents(lotes);
  }

  function _bindEvents(lotes) {
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
      const opt = {
        margin:       10,
        filename:     'reporte_lote.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 1200 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      const btn = document.getElementById('btn-rep-pdf');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Generando...';
      }
      
      try {
        await html2pdf().set(opt).from(element).save();
        Toast.success('PDF generado con éxito');
      } catch (err) {
        Toast.error('Error al exportar PDF');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '🖨️ Exportar PDF';
        }
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
    const el = document.getElementById('rep-extra-fields');
    if (!el) return;
    if (tipo === 'garantia') {
      el.innerHTML = `
        <div class="form-group">
          <label class="form-label">Proveedor</label>
          <select class="form-control" id="rep-proveedor">
            <option value="">— Seleccionar —</option>
            ${(APP_CONFIG.catalogos.proveedores||[]).map(p=>`<option value="${p}">${p}</option>`).join('')}
          </select>
        </div>
      `;
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

    let html;
    if (tipo === 'garantia') {
      html = PlantillaGarantiaProveedor.generar(lote, proveedor);
    } else {
      html = PlantillaReporteLote.generar(lote);
    }

    const preview = document.getElementById('rep-preview-area');
    if (preview) preview.innerHTML = html;

    // Mostrar resumen agrupado
    const resumenCard = document.getElementById('rep-resumen-card');
    const resumenContent = document.getElementById('rep-resumen-content');
    if (resumenCard && resumenContent) {
      resumenCard.style.display = 'block';
      resumenContent.innerHTML = AgrupadorLotes.renderResumen(lote.equipos);
    }
  }

  async function _getLoteSeleccionado(lotes) {
    const id = document.getElementById('rep-lote-sel')?.value;
    return lotes.find(l => l.id === id) || null;
  }

  async function _actualizarResumen(lotes) {
    const lote = await _getLoteSeleccionado(lotes);
    const resumenCard = document.getElementById('rep-resumen-card');
    const resumenContent = document.getElementById('rep-resumen-content');
    if (!lote || !resumenCard || !resumenContent) return;
    resumenCard.style.display = 'block';
    resumenContent.innerHTML = AgrupadorLotes.renderResumen(lote.equipos);
  }

  return { render };
})();

window.ReportesView = ReportesView;
