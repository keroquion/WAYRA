/**
 * modulo-0-datos/audit-trail.js
 * Registro inmutable de acciones CREATE/UPDATE/DELETE.
 * Local en IndexedDB + sync a hoja _AuditTrail en Sheets.
 */

const AuditTrail = (() => {

  async function log(accion, entidad, datos, antes = null) {
    const entry = {
      accion,      // 'CREATE' | 'UPDATE' | 'DELETE'
      entidad,     // 'LOTE' | 'EQUIPO' | 'CATALOGO' | etc.
      datos,       // objeto nuevo
      antes,       // objeto anterior (para UPDATE/DELETE)
      usuario: await _getUsuario(),
      timestamp: new Date().toISOString(),
    };
    await LocalCache.addAudit(entry);
    // Sync a Sheets si hay conexión
    if (navigator.onLine && APP_CONFIG.appsScript.webAppUrl) {
      SyncEngine.enqueue('appendAudit', {
        auditRow: [
          entry.timestamp,
          entry.accion,
          entry.entidad,
          entry.usuario,
          JSON.stringify(entry.datos).slice(0, 500),
        ],
      });
    }
  }

  async function _getUsuario() {
    return (await LocalCache.getConfig('usuario_nombre')) || 'Operador';
  }

  async function getAll() {
    const rows = await LocalCache.getAudit();
    return rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Vista HTML del audit trail
  async function renderTo(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const rows = await getAll();
    if (rows.length === 0) {
      el.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:24px">Sin registros de auditoría</div>`;
      return;
    }

    const icons = { CREATE: '✅', UPDATE: '✏️', DELETE: '🗑️', SYNC_FAIL: '⚠️' };
    const cls   = { CREATE: 'audit-row-create', UPDATE: 'audit-row-update', DELETE: 'audit-row-delete' };

    el.innerHTML = `
      <table class="crud-table" style="font-size:0.76rem">
        <thead><tr><th>Hora</th><th>Acción</th><th>Entidad</th><th>Usuario</th><th>Detalle</th></tr></thead>
        <tbody>
          ${rows.slice(0, 200).map(r => `
            <tr class="${cls[r.accion]||''}">
              <td style="white-space:nowrap;color:var(--text-muted)">${new Date(r.timestamp).toLocaleString('es-PE')}</td>
              <td><span class="badge ${r.accion==='CREATE'?'badge-success':r.accion==='DELETE'?'badge-danger':'badge-warning'}">${icons[r.accion]||''} ${r.accion}</span></td>
              <td>${r.entidad||'—'}</td>
              <td>${r.usuario||'—'}</td>
              <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${JSON.stringify(r.datos||'').replace(/"/g,'&quot;')}">${JSON.stringify(r.datos||'').slice(0,80)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return { log, getAll, renderTo };
})();

window.AuditTrail = AuditTrail;
