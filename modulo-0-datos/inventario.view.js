/**
 * modulo-0-datos/inventario.view.js — Inventario completo desde Sheets.
 */

const InventarioView = (() => {
  let _all = [], _filtered = [], _colVis = {};

  async function render() {
    const el = document.getElementById('view-inventario');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">📦 Inventario Completo</div><div class="page-subtitle">Todos los equipos en Google Sheets</div></div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btn-inv-refresh">🔄 Actualizar</button>
          <button class="btn btn-secondary btn-sm" onclick="InventarioView.abrirModalImportar()">📤 Importar CSV</button>
          <button class="btn btn-secondary btn-sm" id="btn-inv-csv">⬇️ Exportar CSV</button>
          <button class="btn btn-secondary btn-sm" id="btn-inv-xlsx">📊 Excel</button>
        </div>
      </div>
      <div class="stats-grid" id="inv-stats">${_skelStats()}</div>
      <div class="filter-toolbar">
        <div class="filter-search"><span class="search-icon">🔍</span><input type="text" class="form-control" id="inv-search" placeholder="Buscar serie, código, marca…"></div>
        <select class="form-control" id="inv-f-tipo"><option value="">Tipo</option></select>
        <select class="form-control" id="inv-f-suc"><option value="">Sucursal</option></select>
        <select class="form-control" id="inv-f-est"><option value="">Estado</option><option value="C">Correcto</option><option value="P">En Revisión</option><option value="M">Malogrado</option><option value="V">Vendido</option></select>
        <button class="btn btn-secondary btn-sm" id="btn-inv-clear">✕ Limpiar</button>
      </div>
      <div class="col-toggle-row" id="inv-col-toggles"></div>
      <div id="inv-tabla"><div style="padding:60px;text-align:center"><span class="spinner"></span><div style="margin-top:10px;color:var(--text-muted)">Cargando…</div></div></div>
    `;
    _buildColToggles();
    _bindEvents();
    await _load();
  }

  async function _load(force=false) {
    try {
      _all = await SheetsAPI.fetchAll(force);
      _populateFilters();
      _apply();
      _renderStats();
    } catch(err) {
      document.getElementById('inv-tabla').innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--danger)">
          <div style="font-size:2rem">⚠️</div>
          <div style="font-weight:600;margin-top:8px">${err.message}</div>
          <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="Views.go('admin')">⚙️ Configurar Conexión</button>
        </div>`;
    }
  }

  function _apply() {
    const q   = (document.getElementById('inv-search')?.value||'').toLowerCase();
    const tipo = document.getElementById('inv-f-tipo')?.value||'';
    const suc  = document.getElementById('inv-f-suc')?.value||'';
    const est  = document.getElementById('inv-f-est')?.value||'';
    _filtered = _all.filter(r=>{
      if(tipo && r.TIP_EQUIP!==tipo) return false;
      if(suc  && r.SUCURSAL!==suc)   return false;
      if(est  && r.ESTADO!==est)     return false;
      if(q && !Object.values(r).some(v=>v.toLowerCase().includes(q))) return false;
      return true;
    });
    _renderTabla(q);
  }

  function _renderTabla(q='') {
    const el = document.getElementById('inv-tabla');
    if(!el) return;
    const visCols = APP_CONFIG.columns.filter(c=>_colVis[c.key]!==false);
    if(!_filtered.length){ el.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text-muted)"><div style="font-size:2rem">📭</div><div style="margin-top:8px">Sin resultados</div></div>`; return; }

    // Paginación simple
    const page = window._invPage||1, rpp = APP_CONFIG.rowsPerPage;
    const total = _filtered.length, pages = Math.max(1,Math.ceil(total/rpp));
    const start = (page-1)*rpp, end = Math.min(page*rpp,total);
    const pageRows = _filtered.slice(start,end);

    const headers = visCols.map(c=>`<th>${c.label}</th>`).join('') + `<th>Acciones</th>`;
    const rows = pageRows.map(r=>{
      const cells = visCols.map(c=>{
        if(c.key==='ESTADO') return `<td>${Formatters.estadoBadge(r[c.key])}</td>`;
        const v = Formatters.safe(r[c.key]);
        return `<td title="${v}">${q?Formatters.highlight(v,q):v}</td>`;
      }).join('');
      return `<tr>${cells}<td style="white-space:nowrap">
        <button class="btn btn-sm btn-icon" title="Editar" onclick="InventarioView.editarFila('${r.CODIGO}')">✏️</button>
        <button class="btn btn-sm btn-icon btn-danger" title="Eliminar" onclick="InventarioView.borrarFila('${r.CODIGO}')">🗑️</button>
      </td></tr>`;
    }).join('');

    let paginacion = `<div class="pagination"><span>Mostrando ${start+1}–${end} de ${total}</span><div class="pagination-controls">`;
    paginacion += `<button class="page-btn" onclick="_invGoPage(${page-1})" ${page<=1?'disabled':''}>‹</button>`;
    for(let i=1;i<=pages;i++){ if(i===1||i===pages||Math.abs(i-page)<=2) paginacion+=`<button class="page-btn ${i===page?'active':''}" onclick="_invGoPage(${i})">${i}</button>`; else if(Math.abs(i-page)===3) paginacion+=`<button class="page-btn" disabled>…</button>`; }
    paginacion += `<button class="page-btn" onclick="_invGoPage(${page+1})" ${page>=pages?'disabled':''}>›</button></div></div>`;

    el.innerHTML=`<div class="table-wrapper"><div style="overflow-x:auto"><table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>${paginacion}</div>`;
  }

  window._invGoPage = (p) => { window._invPage=p; _renderTabla(document.getElementById('inv-search')?.value||''); };

  function _renderStats() {
    const el = document.getElementById('inv-stats');
    if(!el) return;
    const total=_all.length, corr=_all.filter(r=>r.ESTADO==='C').length, rev=_all.filter(r=>r.ESTADO==='P').length, mal=_all.filter(r=>r.ESTADO==='M').length;
    el.innerHTML=`
      <div class="stat-card" style="--stat-color:var(--accent)"><div class="stat-label">Total</div><div class="stat-value">${total}</div><div class="stat-icon">📦</div></div>
      <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-label">Correctos</div><div class="stat-value">${corr}</div><div class="stat-icon">✅</div></div>
      <div class="stat-card" style="--stat-color:var(--warning)"><div class="stat-label">En Revisión</div><div class="stat-value">${rev}</div><div class="stat-icon">🔧</div></div>
      <div class="stat-card" style="--stat-color:var(--danger)"><div class="stat-label">Malogrados</div><div class="stat-value">${mal}</div><div class="stat-icon">⚠️</div></div>
    `;
  }

  function _skelStats() { return Array(4).fill(0).map(()=>`<div class="stat-card"><div class="skeleton" style="height:10px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:30px;width:40%"></div></div>`).join(''); }

  function _populateFilters() {
    const tipos=[...new Set(_all.map(r=>r.TIP_EQUIP).filter(Boolean))].sort();
    const sucs=[...new Set(_all.map(r=>r.SUCURSAL).filter(Boolean))].sort();
    const selT=document.getElementById('inv-f-tipo'), selS=document.getElementById('inv-f-suc');
    if(selT) tipos.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;selT.appendChild(o);});
    if(selS) sucs.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;selS.appendChild(o);});
  }

  function _buildColToggles() {
    _colVis=JSON.parse(localStorage.getItem('inv-col-vis-v2')||'null')||{};
    APP_CONFIG.columns.forEach(c=>{if(_colVis[c.key]===undefined)_colVis[c.key]=c.visible;});
    const row=document.getElementById('inv-col-toggles'); if(!row) return;
    row.innerHTML=APP_CONFIG.columns.map(c=>`<span class="col-toggle ${_colVis[c.key]?'active':''}" data-col="${c.key}">${c.label}</span>`).join('');
    row.querySelectorAll('.col-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        _colVis[btn.dataset.col]=!_colVis[btn.dataset.col];
        btn.classList.toggle('active',_colVis[btn.dataset.col]);
        localStorage.setItem('inv-col-vis-v2',JSON.stringify(_colVis));
        _apply();
      });
    });
  }

  function _bindEvents() {
    const deb=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}};
    document.getElementById('inv-search')?.addEventListener('input', deb(()=>{window._invPage=1;_apply();},250));
    ['inv-f-tipo','inv-f-suc','inv-f-est'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{window._invPage=1;_apply();}));
    document.getElementById('btn-inv-refresh')?.addEventListener('click',()=>_load(true));
    document.getElementById('btn-inv-clear')?.addEventListener('click',()=>{
      ['inv-search','inv-f-tipo','inv-f-suc','inv-f-est'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
      window._invPage=1; _apply();
    });
    document.getElementById('btn-inv-csv')?.addEventListener('click',()=>ImportExport.exportCSV(_filtered.length?_filtered:_all,APP_CONFIG.columns,'inventario'));
    document.getElementById('btn-inv-xlsx')?.addEventListener('click',()=>ImportExport.exportXLSX(_filtered.length?_filtered:_all,APP_CONFIG.columns,'inventario','Inventario'));
  }

  async function editarFila(codigo) {
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) return;
    
    const fields = APP_CONFIG.columns.map(c => {
      if(c.key === 'CODIGO') return `<div class="form-group"><label class="form-label">${c.label}</label><input type="text" class="form-control" id="edit-inv-${c.key}" value="${Formatters.safe(r[c.key])}" readonly style="background:var(--bg-hover)"></div>`;
      if(c.key === 'ESTADO') return `<div class="form-group"><label class="form-label">${c.label}</label><select class="form-control" id="edit-inv-${c.key}"><option value="C" ${r.ESTADO==='C'?'selected':''}>Correcto</option><option value="P" ${r.ESTADO==='P'?'selected':''}>En Revisión</option><option value="M" ${r.ESTADO==='M'?'selected':''}>Malogrado</option><option value="V" ${r.ESTADO==='V'?'selected':''}>Vendido</option></select></div>`;
      return `<div class="form-group"><label class="form-label">${c.label}</label><input type="text" class="form-control" id="edit-inv-${c.key}" value="${Formatters.safe(r[c.key])}"></div>`;
    }).join('');

    ModalGenerico.open(`
      <div class="modal-title">✏️ Editar Equipo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-height:60vh;overflow-y:auto;padding-right:8px">${fields}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="InventarioView.guardarEdicion('${codigo}')">Guardar Cambios</button>
      </div>
    `);
  }

  async function guardarEdicion(codigo) {
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) return;
    if(!r._rowIndex) { Toast.error('Fila no identificada en Sheets. Actualiza primero.'); return; }

    APP_CONFIG.columns.forEach(c => {
      const el = document.getElementById(`edit-inv-${c.key}`);
      if(el && c.key !== 'CODIGO') r[c.key] = el.value.trim();
    });

    ModalGenerico.close();
    Toast.info('Guardando cambios...');
    
    const rowData = {};
    APP_CONFIG.columns.forEach(c => { rowData[c.key] = r[c.key]; });

    try {
      await LocalCache.addAudit({ accion: 'UPDATE', entidad: 'Inventario', datos: rowData, usuario: 'Admin' });
      await SyncEngine.enqueue('updateRow', { sheetName: APP_CONFIG.sheets.sheetName || 'Buscador Historial', rowIndex: r._rowIndex, rowData });
      
      localStorage.setItem('inv-pro-full-data', JSON.stringify(_all));
      _apply();
      Toast.success('Equipo actualizado en cola');
    } catch(err) { Toast.error('Error al actualizar'); }
  }

  async function borrarFila(codigo) {
    if(!confirm('¿Eliminar este equipo permanentemente de Sheets?')) return;
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r || !r._rowIndex) { Toast.error('Fila no identificada'); return; }

    try {
      await LocalCache.addAudit({ accion: 'DELETE', entidad: 'Inventario', datos: {codigo}, usuario: 'Admin' });
      await SyncEngine.enqueue('deleteRow', { sheetName: APP_CONFIG.sheets.sheetName || 'Buscador Historial', rowIndex: r._rowIndex });
      
      _all = _all.filter(x => x.CODIGO !== codigo);
      localStorage.setItem('inv-pro-full-data', JSON.stringify(_all));
      _apply();
      Toast.warning('Equipo eliminado');
    } catch(err) { Toast.error('Error al eliminar'); }
  }

  function abrirModalImportar() {
    ModalGenerico.open(`
      <div class="modal-title">📤 Importar Lote CSV</div>
      <div class="modal-subtitle">Sube un archivo CSV con las columnas exactas del inventario.</div>
      <div style="margin: 16px 0">
        <button class="btn btn-secondary btn-sm" onclick="InventarioView.descargarPlantilla()">⬇️ Descargar Plantilla</button>
      </div>
      <div class="form-group">
        <label class="form-label">Archivo CSV</label>
        <input type="file" id="inv-csv-file" class="form-control" accept=".csv">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="InventarioView.procesarImportar()">Subir a Sheets</button>
      </div>
    `);
  }

  function descargarPlantilla() {
    ImportExport.exportCSV([], APP_CONFIG.columns, 'plantilla_inventario');
  }

  async function procesarImportar() {
    const file = document.getElementById('inv-csv-file')?.files[0];
    if(!file) { Toast.warning('Selecciona un archivo CSV'); return; }
    
    ModalGenerico.close();
    Toast.info('Procesando CSV...');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split('\\n').map(r => r.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
      if(rows.length < 2) return Toast.warning('El archivo está vacío');
      
      const headers = rows[0];
      const items = [];
      for(let i=1; i<rows.length; i++) {
        if(!rows[i].some(v=>v)) continue;
        const obj = {};
        headers.forEach((h, idx) => {
          const col = APP_CONFIG.columns.find(c => c.label.toUpperCase() === h.toUpperCase());
          if (col) obj[col.key] = rows[i][idx] || '';
        });
        if(obj.CODIGO || obj.SERIE) items.push(obj);
      }
      
      if(!items.length) return Toast.error('No se encontraron registros válidos');
      if(!confirm(`Se van a insertar ${items.length} equipos. ¿Continuar?`)) return;

      for(const item of items) {
        await SyncEngine.syncWrite(APP_CONFIG.sheets.sheetName || 'Buscador Historial', item, {accion:'BATCH_INSERT', entidad:'Inventario'});
      }
      Toast.success(`Agregados ${items.length} equipos a la cola de sincronización`);
      SyncEngine.forceSync();
    };
    reader.readAsText(file);
  }

  return { render, editarFila, guardarEdicion, borrarFila, abrirModalImportar, descargarPlantilla, procesarImportar };
})();

window.InventarioView = InventarioView;
