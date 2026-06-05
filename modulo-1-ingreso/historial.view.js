/**
 * modulo-1-ingreso/historial.view.js — Historial de todos los lotes.
 */

const HistorialView = (() => {
  async function render() {
    const el = document.getElementById('view-historial');
    if (!el) return;
    const lotes = await LocalCache.getLotes();
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">📋 Historial de Lotes</div><div class="page-subtitle">${lotes.length} lote(s) registrados</div></div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.depurarLotesBugeados && window.depurarLotesBugeados()" title="Purga lotes que se quedan pegados o reaparecen" style="background:#ff9800;color:white;border:none">🔧 Depurar</button>
          <button class="btn btn-secondary btn-sm" onclick="LocalCache.exportBackup();Toast.success('Backup exportado')">💾 Backup</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px" title="Importar lote desde archivo JSON">
            📥 Importar Lote
            <input type="file" accept=".json" style="display:none" onchange="_histImportarLote(this)">
          </label>
          <button class="btn btn-primary btn-sm" onclick="Views.go('ingreso')">➕ Nuevo Registro</button>
        </div>
      </div>
      <div id="hist-lista">
        ${!lotes.length ? _emptyState() : lotes.map(_renderCard).join('')}
      </div>
    `;
  }

  function _emptyState() {
    return `<div style="padding:60px;text-align:center;color:var(--text-muted)">
      <div style="font-size:3rem">📭</div>
      <div style="margin-top:12px;font-weight:600">Sin lotes</div>
      <div style="margin-top:16px"><button class="btn btn-primary" onclick="Views.go('ingreso')">➕ Crear Primer Lote</button></div>
    </div>`;
  }

  function _renderCard(lote) {
    const eq = lote.equipos||[];
    const fecha = new Date(lote.fechaCreacion).toLocaleString('es-PE');
    const correctos = eq.filter(e=>e.ESTADO==='C').length;
    const canEdit = window.AuthService ? AuthService.canEditLote(lote) : true;
    return `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${lote.activo?'var(--accent)':'var(--border)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="HistorialView._histToggle('${lote.id}')">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.2rem">📦</span>
            <div>
              <div style="font-weight:700">${lote.titulo} ${lote.activo?'<span class="badge badge-success" style="margin-left:6px;font-size:0.62rem">ACTIVO</span>':''}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${fecha} · ${eq.length} equipo(s) · ${correctos} correctos ${lote.tecnico ? ' · 👨‍🔧 '+lote.tecnico : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:5px;align-items:center">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ImportExport.exportLote(window._histLotes?.find(l=>l.id==='${lote.id}'),'csv')">CSV</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ImportExport.exportLote(window._histLotes?.find(l=>l.id==='${lote.id}'),'xlsx')">Excel</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();LotePortable.exportar('${lote.id}')" title="Descargar lote completo como JSON portable">📦 JSON</button>
            
            ${canEdit ? `
              <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();HistorialView._histEditar('${lote.id}')" title="Editar lote">✏️</button>
              ${!lote.activo?`<button class="btn btn-sm btn-success" style="background:var(--success);border:none;color:#fff" onclick="event.stopPropagation();HistorialView._histContinuar('${lote.id}')" title="Continuar trabajando en este lote">▶️ Continuar</button>`:''}
              ${!lote.activo?`<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();HistorialView._histEliminar('${lote.id}')">🗑️</button>`:''}
            ` : `
              <span style="padding:0 8px;font-size:1.1rem" title="Solo lectura (Propietario: ${lote._ownerId})">🔒</span>
            `}
            
            <span id="hist-arrow-${lote.id}" style="color:var(--text-muted);transition:transform 0.2s;margin-left:4px">▼</span>
          </div>
        </div>
        <div id="hist-body-${lote.id}" style="display:${lote.activo?'block':'none'}">
          ${lote._importado ? `<div style="font-size:0.72rem;padding:6px 10px;margin:8px 0 0;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);border-radius:6px;color:var(--text-secondary)">📥 Importado de: <strong>${DOM.esc(lote._importadoDesde?.empresa || '?')}</strong> · ${Formatters.fechaCorta(lote._importadoDesde?.fechaExportacion)} · Lote original: ${DOM.esc(lote._importadoDesde?.idOriginal || '?')}</div>` : ''}
          ${eq.length?`
            <div style="overflow-x:auto;margin-top:12px;border-radius:var(--radius-sm);border:1px solid var(--border)">
              <table class="data-table">
                <thead><tr><th>Código</th><th>Marca</th><th>Modelo</th><th>Tipo</th><th>Estado</th><th>Evidencia</th><th>Hora</th></tr></thead>
                <tbody>
                  ${eq.slice(0,10).map(e=>`<tr>
                    <td><strong>${Formatters.safe(e.CODIGO)}</strong></td>
                    <td>${Formatters.safe(e.MARCA)}</td>
                    <td>${Formatters.safe(e.MODELO)}</td>
                    <td>${Formatters.safe(e.TIP_EQUIP)}</td>
                    <td>${Formatters.estadoBadge(e.ESTADO)}</td>
                    <td>${EvidenciaFotos.renderFotoCell(e, null)}</td>
                    <td style="font-size:0.72rem;color:var(--text-muted)">${new Date(e._timestamp).toLocaleTimeString('es-PE')}</td>
                  </tr>`).join('')}
                  ${eq.length>10?`<tr><td colspan="7" style="text-align:center;color:var(--text-muted);font-size:0.75rem;padding:8px">+ ${eq.length-10} más</td></tr>`:''}
                </tbody>
              </table>
            </div>
          `:`<div style="color:var(--text-muted);font-size:0.82rem;padding:14px">Lote vacío</div>`}
        </div>
      </div>
    `;
  }

  const _histToggle = (id) => {
    const body = document.getElementById('hist-body-'+id);
    const arrow = document.getElementById('hist-arrow-'+id);
    if(body.style.display==='none'){
      body.style.display='block';
      if(arrow) arrow.style.transform='rotate(180deg)';
    }else{
      body.style.display='none';
      if(arrow) arrow.style.transform='rotate(0)';
    }
  };

  const _histEliminar = async (id) => {
    const lote = window._histLotes?.find(l => l.id === id);
    if (window.AuthService && !AuthService.canEditLote(lote)) { Toast.error('🔒 No tienes permisos para eliminar este lote.'); return; }
    if (!confirm('¿Eliminar este lote permanentemente?')) return;
    await LocalCache.deleteLote(id);
    Toast.warning('Lote eliminado');
    HistorialView.render();
    if(window.IngresoView && (!window._loteActivo || window._loteActivo.id===id)) {
      window._loteActivo = await LocalCache.getLoteActivo();
      IngresoView.render();
    }
  };

  const _histContinuar = async (id) => {
    const lote = window._histLotes?.find(l => l.id === id);
    if (window.AuthService && !AuthService.canEditLote(lote)) { Toast.error('🔒 No tienes permisos para editar este lote.'); return; }
    if (!confirm('Esto cerrará el lote activo actual (si hay uno). ¿Continuar?')) return;
    await LocalCache.continuarLote(id);
    window._loteActivo = await LocalCache.getLoteActivo();
    Toast.success('Lote reactivado');
    HistorialView.render();
    if(window.IngresoView) IngresoView.render();
    Views.go('ingreso');
  };

  const _histEditar = async (id) => {
    const lotes = await LocalCache.getLotes();
    const lote = lotes.find(l => l.id === id);
    if (!lote) { Toast.error('Lote no encontrado'); return; }
    if (window.AuthService && !AuthService.canEditLote(lote)) { Toast.error('🔒 No tienes permisos para editar este lote.'); return; }

    ModalGenerico.open(`
      <div class="modal-title">✏️ Editar Lote</div>
      <div class="modal-subtitle">Modifica los detalles del lote en el historial</div>
      <div class="form-group">
        <label class="form-label">Título del Lote</label>
        <input type="text" class="form-control" id="edit-lote-titulo" value="${Formatters.safe(lote.titulo)}">
      </div>
      <div class="form-group">
        <label class="form-label">👨‍🔧 Técnico Encargado</label>
        <input type="text" class="form-control" id="edit-lote-tecnico" value="${Formatters.safe(lote.tecnico || '')}" autocomplete="off">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="HistorialView._histGuardarEdicion('${lote.id}')">💾 Guardar</button>
      </div>
    `);
  };

  const _histGuardarEdicion = async (id) => {
    const titulo = document.getElementById('edit-lote-titulo')?.value?.trim();
    const tecnico = document.getElementById('edit-lote-tecnico')?.value?.trim() || '';
    if (!titulo) { Toast.warning('Escribe un título'); return; }

    const lotes = await LocalCache.getLotes();
    const lote = lotes.find(l => l.id === id);
    if (lote) {
      lote.titulo = titulo;
      lote.tecnico = tecnico;
      await LocalCache.updateLote(lote);
      ModalGenerico.close();
      Toast.success('Lote actualizado');
      // Actualizar la variable global del historial
      window._histLotes = await LocalCache.getLotes();
      HistorialView.render();
    } else {
      Toast.error('Error al actualizar el lote');
    }
  };

  const _histImportarLote = async (input) => {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    try {
      const result = await LotePortable.importar(file);
      HistorialView.render();
    } catch (err) {
      Toast.error('Error al importar: ' + err.message);
    }
  };

  return { 
    render, 
    _histToggle, 
    _histEliminar, 
    _histContinuar, 
    _histEditar, 
    _histGuardarEdicion, 
    _histImportarLote 
  };
})();

window.HistorialView = HistorialView;
