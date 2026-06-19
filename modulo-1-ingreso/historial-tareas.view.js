/**
 * modulo-1-ingreso/historial-tareas.view.js
 * Historial de Tareas y Actividades.
 */

const HistorialTareasView = (() => {
  async function render() {
    const el = document.getElementById('view-historial-tareas');
    if (!el) return;
    const lotes = await LocalCache.getLotes();
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">📋 Historial de Tareas</div><div class="page-subtitle">${lotes.length} tarea(s) registradas</div></div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.depurarLotesBugeados && window.depurarLotesBugeados()" title="Purga tareas que se quedan pegadas" style="background:#ff9800;color:white;border:none">🔧 Depurar</button>
          <button class="btn btn-secondary btn-sm" onclick="LocalCache.exportBackup();Toast.success('Backup exportado')">💾 Backup</button>
          <button class="btn btn-primary btn-sm" onclick="Views.go('tareas')">📝 Ir a Actividades</button>
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
      <div style="margin-top:12px;font-weight:600">Sin tareas</div>
      <div style="margin-top:16px"><button class="btn btn-primary" onclick="Views.go('tareas')">➕ Crear Primera Tarea</button></div>
    </div>`;
  }

  function _renderCard(lote) {
    const eq = lote.equipos||[];
    const fecha = new Date(lote.fechaCreacion).toLocaleString('es-PE');
    const canEdit = window.AuthService ? AuthService.canEditLote(lote) : true;
    return `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${lote.activo?'var(--success)':'var(--border)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="HistorialTareasView._histToggle('${lote.id}')">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.2rem">📌</span>
            <div>
              <div style="font-weight:700">${lote.titulo} ${lote.activo?'<span class="badge badge-success" style="margin-left:6px;font-size:0.62rem;background:var(--success);color:white;padding:2px 6px;border-radius:4px;">ACTIVA</span>':''}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${fecha} · ${eq.length} actividad(es) ${lote.tecnico ? ' · 👨‍🔧 '+lote.tecnico : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:5px;align-items:center">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ImportExport.exportLote(window._histLotes?.find(l=>l.id==='${lote.id}'),'csv')">CSV</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ImportExport.exportLote(window._histLotes?.find(l=>l.id==='${lote.id}'),'xlsx')">Excel</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();LotePortable.exportar('${lote.id}')" title="Descargar como JSON">JSON</button>
            
            ${canEdit ? `
              <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();HistorialTareasView._histEditar('${lote.id}')" title="Editar tarea">✏️</button>
              ${!lote.activo?`<button class="btn btn-sm btn-success" style="background:var(--success);border:none;color:#fff" onclick="event.stopPropagation();HistorialTareasView._histContinuar('${lote.id}')" title="Continuar trabajando en esta tarea">▶️ Continuar</button>`:''}
              ${!lote.activo?`<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();HistorialTareasView._histEliminar('${lote.id}')">🗑️</button>`:''}
            ` : `
              <span style="padding:0 8px;font-size:1.1rem" title="Solo lectura">🔒</span>
            `}
            
            <span id="hist-arrow-${lote.id}" style="color:var(--text-muted);transition:transform 0.2s;margin-left:4px">▼</span>
          </div>
        </div>
        <div id="hist-body-${lote.id}" style="display:${lote.activo?'block':'none'}">
          ${eq.length?`
            <div style="overflow-x:auto;margin-top:12px;border-radius:var(--radius-sm);border:1px solid var(--border)">
              <table class="data-table" style="width:100%; text-align:left;">
                <thead><tr><th>Hora</th><th>Tipo</th><th>Descripción</th><th>Foto Evidencia</th></tr></thead>
                <tbody>
                  ${eq.map(e=>`<tr>
                    <td style="font-size:0.75rem;color:var(--text-muted)">${new Date(e._timestamp).toLocaleTimeString('es-PE')}</td>
                    <td><span style="font-weight:600; font-size:0.8rem;">${Formatters.safe(e.TIP_EQUIP || 'Actividad')}</span></td>
                    <td style="font-size:0.8rem;">${Formatters.safe(e.OBSERVACION || e._obsPersonal)}</td>
                    <td>
                      ${e._fotos && e._fotos.length > 0 
                        ? `<a href="${e._fotos[0]}" target="_blank"><img src="${e._fotos[0]}" style="height:40px; border-radius:4px;"></a>` 
                        : `<span style="color:var(--text-muted); font-size:0.75rem;">Sin foto</span>`}
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          `:`<div style="color:var(--text-muted);font-size:0.82rem;padding:14px">Sin actividades</div>`}
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
    if (window.AuthService && !AuthService.canEditLote(lote)) { Toast.error('🔒 No tienes permisos.'); return; }
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return;
    await LocalCache.deleteLote(id);
    Toast.warning('Tarea eliminada');
    HistorialTareasView.render();
    if(window.TareasView && (!window._loteActivo || window._loteActivo.id===id)) {
      window._loteActivo = await LocalCache.getLoteActivo();
      TareasView.render();
    }
  };

  const _histContinuar = async (id) => {
    const lote = window._histLotes?.find(l => l.id === id);
    if (window.AuthService && !AuthService.canEditLote(lote)) { Toast.error('🔒 No tienes permisos.'); return; }
    if (!confirm('Esto cerrará la tarea activa actual (si hay una). ¿Continuar?')) return;
    await LocalCache.continuarLote(id);
    window._loteActivo = await LocalCache.getLoteActivo();
    Toast.success('Tarea reactivada');
    HistorialTareasView.render();
    if(window.TareasView) TareasView.render();
    Views.go('tareas');
  };

  const _histEditar = async (id) => {
    const lotes = await LocalCache.getLotes();
    const lote = lotes.find(l => l.id === id);
    if (!lote) return;

    ModalGenerico.open(`
      <div class="modal-title">✏️ Editar Tarea</div>
      <div class="form-group">
        <label class="form-label">Título de la Tarea</label>
        <input type="text" class="form-control" id="edit-tarea-titulo" value="${Formatters.safe(lote.titulo)}">
      </div>
      <div class="form-group">
        <label class="form-label">👨‍🔧 Técnico Responsable</label>
        <input type="text" class="form-control" id="edit-tarea-tecnico" value="${Formatters.safe(lote.tecnico || '')}" autocomplete="off">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="HistorialTareasView._histGuardarEdicion('${lote.id}')">💾 Guardar</button>
      </div>
    `);
  };

  const _histGuardarEdicion = async (id) => {
    const titulo = document.getElementById('edit-tarea-titulo')?.value?.trim();
    const tecnico = document.getElementById('edit-tarea-tecnico')?.value?.trim() || '';
    if (!titulo) { Toast.warning('Escribe un título'); return; }

    const lotes = await LocalCache.getLotes();
    const lote = lotes.find(l => l.id === id);
    if (lote) {
      lote.titulo = titulo;
      lote.tecnico = tecnico;
      await LocalCache.updateLote(lote);
      ModalGenerico.close();
      Toast.success('Tarea actualizada');
      window._histLotes = await LocalCache.getLotes();
      HistorialTareasView.render();
    }
  };

  return { render, _histToggle, _histEliminar, _histContinuar, _histEditar, _histGuardarEdicion };
})();

window.HistorialTareasView = HistorialTareasView;
