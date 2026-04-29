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
          <button class="btn btn-secondary btn-sm" onclick="LocalCache.exportBackup();Toast.success('Backup exportado')">💾 Backup</button>
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
    return `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${lote.activo?'var(--accent)':'var(--border)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="_histToggle('${lote.id}')">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.2rem">📦</span>
            <div>
              <div style="font-weight:700">${lote.titulo} ${lote.activo?'<span class="badge badge-success" style="margin-left:6px;font-size:0.62rem">ACTIVO</span>':''}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${fecha} · ${eq.length} equipo(s) · ${correctos} correctos</div>
            </div>
          </div>
          <div style="display:flex;gap:5px;align-items:center">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ImportExport.exportLote(window._histLotes?.find(l=>l.id==='${lote.id}'),'csv')">CSV</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ImportExport.exportLote(window._histLotes?.find(l=>l.id==='${lote.id}'),'xlsx')">Excel</button>
            ${!lote.activo?`<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();_histEliminar('${lote.id}')">🗑️</button>`:''}
            <span id="hist-arrow-${lote.id}" style="color:var(--text-muted);transition:transform 0.2s">▼</span>
          </div>
        </div>
        <div id="hist-body-${lote.id}" style="display:${lote.activo?'block':'none'}">
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

  window._histToggle = (id) => {
    const body  = document.getElementById(`hist-body-${id}`);
    const arrow = document.getElementById(`hist-arrow-${id}`);
    if (!body) return;
    const open = body.style.display==='block';
    body.style.display = open?'none':'block';
    if(arrow) arrow.style.transform = open?'':'rotate(180deg)';
  };

  window._histEliminar = async (id) => {
    if (!confirm('¿Eliminar este lote permanentemente?')) return;
    await LocalCache.deleteLote(id);
    Toast.warning('Lote eliminado');
    HistorialView.render();
  };

  return { render };
})();

window.HistorialView = HistorialView;
