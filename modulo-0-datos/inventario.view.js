/**
 * modulo-0-datos/inventario.view.js — Inventario completo desde Sheets.
 */

const InventarioView = (() => {
  let _all = [], _filtered = [], _colVis = {};
  let _trabajadoresUnicos = [];

  async function render() {
    const el = document.getElementById('view-inventario');
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">📦 Inventario Completo</div><div class="page-subtitle">Todos los equipos en Google Sheets</div></div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btn-inv-refresh">🔄 Actualizar</button>
          <button class="btn btn-secondary btn-sm" onclick="InventarioView.verTrabajadores()">👥 Trabajadores</button>
          <button class="btn btn-secondary btn-sm" onclick="InventarioView.exportarPDF('lista')">🖨️ PDF Lista</button>
          <button class="btn btn-secondary btn-sm" onclick="InventarioView.exportarPDF('catalogo')">🗂️ Reporte Asignaciones</button>
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
      
      // Extraer trabajadores dinámicamente
      _trabajadoresUnicos = [];
      const tMap = {};
      _all.forEach(e => {
        if(e.DNI && e.USUARIO_ASIGNADO && !tMap[e.DNI]) {
          tMap[e.DNI] = { DNI: e.DNI, USUARIO_ASIGNADO: e.USUARIO_ASIGNADO, CARGO: e.CARGO, AREA_DEPARTAMENTO: e.AREA_DEPARTAMENTO };
          _trabajadoresUnicos.push(tMap[e.DNI]);
        }
      });

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
        if(c.key==='USUARIO_ASIGNADO') {
          const v = r[c.key] ? `<span style="background:#0b2253;color:white;padding:2px 6px;border-radius:12px;font-size:0.75rem;font-weight:bold;white-space:nowrap">👤 ${Formatters.safe(r[c.key])}</span>` : `<span style="background:#10b981;color:white;padding:2px 6px;border-radius:12px;font-size:0.75rem;font-weight:bold;white-space:nowrap">🟢 Libre</span>`;
          return `<td title="${r[c.key]||'Libre'}">${v}</td>`;
        }
        const v = Formatters.safe(r[c.key]);
        return `<td title="${v}">${q?Formatters.highlight(v,q):v}</td>`;
      }).join('');
      return `<tr>${cells}<td style="white-space:nowrap; max-width:none; overflow:visible;">
        <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Editar" onclick="InventarioView.editarFila('${r.CODIGO}')">✏️</button>
        <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Asignar / Acta" onclick="InventarioView.abrirModalAsignacion('${r.CODIGO}')">📄</button>
        <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Capacitación" onclick="InventarioView.imprimirCapacitacionEquipo('${r.CODIGO}')">🎓</button>
        <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Regularización / Extraordinario" onclick="InventarioView.imprimirRegularizacionEquipo('${r.CODIGO}')">📝</button>
        ${r.USUARIO_ASIGNADO ? `<button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Devolver (Libera equipo y genera Acta)" onclick="InventarioView.devolverEquipo('${r.CODIGO}')">↩️</button>` : ''}
        <button class="btn btn-sm btn-icon btn-danger" style="font-size:1.1rem; padding:4px 6px" title="Eliminar" onclick="InventarioView.borrarFila('${r.CODIGO}')">🗑️</button>
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
      if(c.isAsignacion) return '';
      if(c.key === 'CODIGO') return `<div class="form-group"><label class="form-label">${c.label}</label><input type="text" class="form-control" id="edit-inv-${c.key}" value="${Formatters.safe(r[c.key])}" readonly style="background:var(--bg-hover)"></div>`;
      if(c.key === 'ESTADO') return `<div class="form-group"><label class="form-label">${c.label}</label><select class="form-control" id="edit-inv-${c.key}"><option value="C" ${r.ESTADO==='C'?'selected':''}>Correcto</option><option value="P" ${r.ESTADO==='P'?'selected':''}>En Revisión</option><option value="M" ${r.ESTADO==='M'?'selected':''}>Malogrado</option><option value="V" ${r.ESTADO==='V'?'selected':''}>Vendido</option></select></div>`;
      if(c.key === 'SUCURSAL') return `<div class="form-group"><label class="form-label">${c.label}</label><select class="form-control" id="edit-inv-${c.key}">${(APP_CONFIG.catalogos.sucursales||[]).map(o=>`<option value="${o}" ${r[c.key]===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
      if(c.key === 'TIP_EQUIP') return `<div class="form-group"><label class="form-label">${c.label}</label><select class="form-control" id="edit-inv-${c.key}">${(APP_CONFIG.catalogos.tiposEquipo||[]).map(o=>`<option value="${o}" ${r[c.key]===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
      if(c.key === 'MARCA') return `<div class="form-group"><label class="form-label">${c.label}</label><input type="text" class="form-control" id="edit-inv-${c.key}" list="dl-marcas-edit" value="${Formatters.safe(r[c.key])}"></div>`;
      return `<div class="form-group"><label class="form-label">${c.label}</label><input type="text" class="form-control" id="edit-inv-${c.key}" value="${Formatters.safe(r[c.key])}"></div>`;
    }).join('');

    const extraHTML = `<datalist id="dl-marcas-edit">${(APP_CONFIG.catalogos.marcas||[]).map(m=>`<option value="${m}">`).join('')}</datalist>`;

    ModalGenerico.open(`
      <div class="modal-title">✏️ Editar Equipo</div>
      ${extraHTML}
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

    APP_CONFIG.columns.forEach(c => {
      if (c.isAsignacion) return;
      const el = document.getElementById(`edit-inv-${c.key}`);
      if(el && c.key !== 'CODIGO') r[c.key] = el.value.trim();
    });

    ModalGenerico.close();
    Toast.info('Guardando cambios...');
    
    const rowData = {};
    APP_CONFIG.columns.forEach(c => { rowData[c.key] = r[c.key]; });

    try {
      await LocalCache.addAudit({ accion: 'UPDATE', entidad: 'Inventario', datos: rowData, usuario: 'Admin' });
      await SyncEngine.enqueue('updateRow', { sheetName: APP_CONFIG.sheets.sheetName || 'InventarioTI', codigo: r.CODIGO, rowData });
      
      // FIX: Update local IDB directly so fetchAll() does not retrieve old data upon refresh
      await LocalCache.put('equipos', { ...r, _id: r.CODIGO || r.SERIE });

      localStorage.setItem('inv-pro-full-data', JSON.stringify(_all));
      _apply();
      Toast.success('Equipo actualizado en cola');
    } catch(err) { Toast.error('Error al actualizar'); }
  }

  async function borrarFila(codigo) {
    if(!confirm('¿Eliminar este equipo permanentemente de Sheets?')) return;
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) { Toast.error('Equipo no encontrado en la memoria local'); return; }

    try {
      await LocalCache.addAudit({ accion: 'DELETE', entidad: 'Inventario', datos: {codigo}, usuario: 'Admin' });
      await SyncEngine.enqueue('deleteRow', { sheetName: APP_CONFIG.sheets.sheetName || 'InventarioTI', codigo: r.CODIGO });
      
      // FIX: Remove from local IDB directly so fetchAll() does not retrieve old data upon refresh
      await LocalCache.delete('equipos', codigo);

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
        await SyncEngine.syncWrite(APP_CONFIG.sheets.sheetName || 'InventarioTI', item, {accion:'BATCH_INSERT', entidad:'Inventario'});
      }
      Toast.success(`Agregados ${items.length} equipos a la cola de sincronización`);
      SyncEngine.forceSync();
    };
    reader.readAsText(file);
  }

  function abrirModalAsignacion(codigo) {
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) return;
    
    const datalistHTML = `<datalist id="list-trabajadores">${_trabajadoresUnicos.map(t => `<option value="${t.DNI}">${t.USUARIO_ASIGNADO} - ${t.CARGO}</option>`).join('')}</datalist>`;

    const fields = APP_CONFIG.columns.filter(c => c.isAsignacion).map(c => {
      if(c.key === 'DNI') {
        return `<div class="form-group"><label class="form-label">${c.label} (Escribe para buscar)</label><input type="text" class="form-control" list="list-trabajadores" id="asig-inv-${c.key}" value="${Formatters.safe(r[c.key])}" placeholder="Buscar DNI..." oninput="InventarioView.autocompletarTrabajador(this.value)"></div>`;
      }
      return `<div class="form-group"><label class="form-label">${c.label}</label><input type="text" class="form-control" id="asig-inv-${c.key}" value="${Formatters.safe(r[c.key])}" placeholder="Opcional"></div>`;
    }).join('');

    const accesoriosOptions = _all
      .filter(x => x.CODIGO !== codigo && ['MONITOR','TECLADO','MOUSE','ACCESORIO','MICROFONO','ACCESORIO_SIMPLE'].includes(x.TIP_EQUIP))
      .map(x => {
        const asignado = x.USUARIO_ASIGNADO ? true : false;
        const disabled = asignado ? 'disabled' : '';
        const label = asignado ? `👤 Asignado a ${x.USUARIO_ASIGNADO}` : '🟢 Libre';
        return `<option value="${x.CODIGO}" ${disabled}>${x.TIP_EQUIP}: ${x.MARCA||''} ${x.MODELO||''} (SN: ${x.SERIE||'-'}) - ${label}</option>`;
      })
      .join('');

    ModalGenerico.open(`
      <div class="modal-title">📄 Asignación de Equipo y Acta</div>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:15px">Completa los datos de asignación antes de generar el acta de entrega. Puedes buscar por DNI para autocompletar.</p>
      ${datalistHTML}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${fields}</div>
      <div class="form-group" style="margin-top:15px">
        <label class="form-label">🔌 Emparejar Accesorios / Periféricos (Opcional)</label>
        <select id="asig-inv-accesorios" class="form-control" multiple style="height: 110px; font-size:12px">
          ${accesoriosOptions}
        </select>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Mantén presionada la tecla Ctrl para seleccionar múltiples. Solo aparecen habilitados los que están libres.</div>
      </div>
      <div class="modal-footer" style="margin-top:20px">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="InventarioView.guardarYGenerarActa('${codigo}')">💾 Guardar y Generar Acta</button>
      </div>
    `);
  }

  async function guardarYGenerarActa(codigo) {
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) return;

    const accSelect = document.getElementById('asig-inv-accesorios');
    const selectedCodigos = accSelect ? Array.from(accSelect.selectedOptions).map(opt => opt.value) : [];
    const perif = selectedCodigos.map(c => _all.find(x => x.CODIGO === c)).filter(Boolean);

    APP_CONFIG.columns.forEach(c => {
      if (c.isAsignacion) {
        const el = document.getElementById(`asig-inv-${c.key}`);
        if(el) {
          const val = el.value.trim();
          r[c.key] = val;
          perif.forEach(p => p[c.key] = val); // Copiar a periféricos
        }
      }
    });

    ModalGenerico.close();
    Toast.info('Guardando asignación y periféricos...');
    
    try {
      const rowData = {};
      APP_CONFIG.columns.forEach(c => { rowData[c.key] = r[c.key]; });
      await LocalCache.addAudit({ accion: 'UPDATE', entidad: 'Inventario', datos: rowData, usuario: 'Admin' });
      await SyncEngine.enqueue('updateRow', { sheetName: APP_CONFIG.sheets.sheetName || 'InventarioTI', codigo: r.CODIGO, rowData });
      await LocalCache.put('equipos', { ...r, _id: r.CODIGO || r.SERIE });

      for(let p of perif) {
        const pData = {};
        APP_CONFIG.columns.forEach(c => { pData[c.key] = p[c.key]; });
        await LocalCache.addAudit({ accion: 'UPDATE', entidad: 'Inventario', datos: pData, usuario: 'Admin' });
        await SyncEngine.enqueue('updateRow', { sheetName: APP_CONFIG.sheets.sheetName || 'InventarioTI', codigo: p.CODIGO, rowData: pData });
        await LocalCache.put('equipos', { ...p, _id: p.CODIGO || p.SERIE });
      }

      localStorage.setItem('inv-pro-full-data', JSON.stringify(_all));
      _apply();
      
      if(typeof PrintActas !== 'undefined') {
        PrintActas.imprimirActa([r, ...perif]);
      } else {
        Toast.error('Módulo de Actas no encontrado');
      }
    } catch(err) { Toast.error('Error al guardar asignación'); }
  }

  function exportarPDF(tipo) {
    if(!_filtered.length) { Toast.warning('No hay datos para exportar'); return; }
    if(tipo === 'catalogo' && typeof PrintActas !== 'undefined') {
      PrintActas.imprimirReporteGeneral(_filtered);
    } else if (typeof PrintInventario !== 'undefined') {
      PrintInventario.abrir(_filtered, APP_CONFIG.columns, tipo);
    } else {
      Toast.error('Módulo de impresión no cargado');
    }
  }

  function autocompletarTrabajador(dni) {
    const t = _trabajadoresUnicos.find(x => x.DNI === dni);
    if(t) {
      if(document.getElementById('asig-inv-USUARIO_ASIGNADO')) document.getElementById('asig-inv-USUARIO_ASIGNADO').value = t.USUARIO_ASIGNADO || '';
      if(document.getElementById('asig-inv-CARGO')) document.getElementById('asig-inv-CARGO').value = t.CARGO || '';
      if(document.getElementById('asig-inv-AREA_DEPARTAMENTO')) document.getElementById('asig-inv-AREA_DEPARTAMENTO').value = t.AREA_DEPARTAMENTO || '';
    }
  }

  async function devolverEquipo(codigo) {
    if(!confirm('¿Estás seguro de DEVOLVER este equipo? Se borrarán los datos del usuario asignado y se generará el Acta de Devolución.')) return;
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) return;

    // Copiar datos del usuario para el acta antes de borrarlos
    const usuarioCopia = { ...r };

    // Limpiar campos de asignación
    APP_CONFIG.columns.forEach(c => {
      if (c.isAsignacion) r[c.key] = '';
    });

    Toast.info('Procesando devolución...');
    try {
      const rowData = {};
      APP_CONFIG.columns.forEach(c => { rowData[c.key] = r[c.key]; });
      await LocalCache.addAudit({ accion: 'UPDATE', entidad: 'Inventario', datos: rowData, usuario: 'Admin' });
      await SyncEngine.enqueue('updateRow', { sheetName: APP_CONFIG.sheets.sheetName || 'InventarioTI', codigo: r.CODIGO, rowData });
      await LocalCache.put('equipos', { ...r, _id: r.CODIGO || r.SERIE });

      localStorage.setItem('inv-pro-full-data', JSON.stringify(_all));
      _apply();
      
      if(typeof PrintActas !== 'undefined') {
        PrintActas.imprimirActa([usuarioCopia], true); // true = isDevolucion
      }
      Toast.success('Equipo devuelto correctamente');
    } catch(err) { Toast.error('Error al procesar devolución'); }
  }

  function imprimirCapacitacionEquipo(codigo) {
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) return;
    if(!r.USUARIO_ASIGNADO) {
      Toast.warning('Este equipo no tiene un usuario asignado para la capacitación. Asígnale uno primero.');
      return;
    }
    if(typeof PrintActas !== 'undefined' && PrintActas.imprimirCapacitacion) {
      PrintActas.imprimirCapacitacion(r);
    } else {
      Toast.error('Módulo de Actas no encontrado o desactualizado');
    }
  }

  function imprimirRegularizacionEquipo(codigo) {
    const r = _all.find(x => x.CODIGO === codigo);
    if(!r) return;
    if(typeof PrintActas !== 'undefined' && PrintActas.imprimirRegularizacion) {
      PrintActas.imprimirRegularizacion(r);
    } else {
      Toast.error('Módulo de Actas no encontrado o desactualizado');
    }
  }

  function verTrabajadores() {
    if(!_trabajadoresUnicos || _trabajadoresUnicos.length === 0) {
      Toast.info('No hay trabajadores registrados con equipos asignados.');
      return;
    }
    
    // Sort by name
    const sorted = [..._trabajadoresUnicos].sort((a,b) => a.USUARIO_ASIGNADO.localeCompare(b.USUARIO_ASIGNADO));

    const rows = sorted.map(t => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:10px">${t.DNI}</td>
        <td style="padding:10px;font-weight:600;color:var(--accent)">${t.USUARIO_ASIGNADO}</td>
        <td style="padding:10px">${t.CARGO || '-'}</td>
        <td style="padding:10px"><span class="badge" style="background:var(--bg-hover);color:var(--text-color)">${t.AREA_DEPARTAMENTO || t.SUCURSAL || '-'}</span></td>
        <td style="padding:10px;text-align:right;white-space:nowrap;max-width:none;overflow:visible;">
          <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Acta Global" onclick="InventarioView.imprimirActaTrabajador('${t.DNI}')">📄</button>
          <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Capacitación (Blanco)" onclick="InventarioView.imprimirCapacitacionTrabajador('${t.DNI}')">🎓</button>
          <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Regularización (Blanco)" onclick="InventarioView.imprimirRegularizacionTrabajador('${t.DNI}')">📝</button>
          <button class="btn btn-sm btn-icon btn-secondary" style="font-size:1.1rem; padding:4px 6px" title="Devolución Masiva" onclick="InventarioView.devolverTodoTrabajador('${t.DNI}')">↩️</button>
        </td>
      </tr>
    `).join('');

    ModalGenerico.open(`
      <div class="modal-title">👥 Directorio de Trabajadores</div>
      <div class="modal-subtitle">Trabajadores extraídos dinámicamente de las asignaciones actuales (${sorted.length} registrados).</div>
      <div style="max-height:60vh;overflow-y:auto;overflow-x:auto;margin-top:16px;border:1px solid var(--border);border-radius:var(--radius-md)">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:0.85rem;min-width:600px;">
          <thead style="background:var(--bg-card);color:var(--text-secondary);position:sticky;top:0;z-index:1;box-shadow:0 1px 0 var(--border)">
            <tr>
              <th style="padding:12px 10px;font-weight:600">DNI</th>
              <th style="padding:12px 10px;font-weight:600">Nombre Completo</th>
              <th style="padding:12px 10px;font-weight:600">Cargo</th>
              <th style="padding:12px 10px;font-weight:600">Área / Ubicación</th>
              <th style="padding:12px 10px;font-weight:600;text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <div class="modal-footer" style="margin-top:20px">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cerrar</button>
      </div>
    `);
  }

  function imprimirActaTrabajador(dni) {
    const equipos = _all.filter(x => x.DNI === dni);
    if (!equipos.length) return Toast.error('El trabajador no tiene equipos asignados.');
    if (typeof PrintActas !== 'undefined' && PrintActas.imprimirActa) {
      PrintActas.imprimirActa(equipos);
    } else {
      Toast.error('Módulo de Actas no encontrado.');
    }
  }

  function _generarPseudoEquipoTrabajador(dni) {
    const t = _trabajadoresUnicos.find(x => x.DNI === dni);
    if (!t) return null;
    return {
      USUARIO_ASIGNADO: t.USUARIO_ASIGNADO,
      DNI: t.DNI,
      CARGO: t.CARGO,
      AREA_DEPARTAMENTO: t.AREA_DEPARTAMENTO,
      SUCURSAL: t.SUCURSAL || '',
      TIP_EQUIP: '', MARCA: '', MODELO: '', SERIE: ''
    };
  }

  function imprimirCapacitacionTrabajador(dni) {
    const p = _generarPseudoEquipoTrabajador(dni);
    if (!p) return;
    if (typeof PrintActas !== 'undefined' && PrintActas.imprimirCapacitacion) {
      PrintActas.imprimirCapacitacion(p);
    } else {
      Toast.error('Módulo de Actas no encontrado.');
    }
  }

  function imprimirRegularizacionTrabajador(dni) {
    const p = _generarPseudoEquipoTrabajador(dni);
    if (!p) return;
    if (typeof PrintActas !== 'undefined' && PrintActas.imprimirRegularizacion) {
      PrintActas.imprimirRegularizacion(p);
    } else {
      Toast.error('Módulo de Actas no encontrado.');
    }
  }

  function devolverTodoTrabajador(dni) {
    Toast.info('Función de devolución masiva en desarrollo (Próximamente).', 3000);
  }

  return { render, editarFila, guardarEdicion, borrarFila, abrirModalImportar, descargarPlantilla, procesarImportar, exportarPDF, abrirModalAsignacion, guardarYGenerarActa, autocompletarTrabajador, devolverEquipo, imprimirCapacitacionEquipo, imprimirRegularizacionEquipo, verTrabajadores, imprimirActaTrabajador, imprimirCapacitacionTrabajador, imprimirRegularizacionTrabajador, devolverTodoTrabajador };
})();

window.InventarioView = InventarioView;
