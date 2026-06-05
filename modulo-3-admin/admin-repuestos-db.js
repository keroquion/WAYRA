/**
 * modulo-3-admin/admin-repuestos-db.js — Inventario Pro v3
 * Lógica para la pestaña de Base de Datos de Repuestos × Modelo en Admin.
 */

const AdminRepuestosDB = (() => {
  let _repDBEntries = [];

  function render() {
    _repDBEntries = ModoRapido.getAll();
    _renderTablaRepuestos(_repDBEntries);
    _renderAliases();
  }

  function _renderTablaRepuestos(entries) {
    const el = document.getElementById('rep-db-tabla');
    const count = document.getElementById('rep-db-count');
    if (!el) return;

    const rows = [];
    for (const e of entries) {
      for (const m of (e.modelos || [])) {
        rows.push({ key: e.key, repuesto: e.repuesto, modelo: m.modelo, pn: m.pn || '—', usos: m.usos || 1 });
      }
    }

    if (count) count.textContent = `${rows.length} registro(s) · ${entries.length} combinaciones`;

    if (!rows.length) {
      el.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-muted)">
        <div style="font-size:2rem">🗄️</div>
        <div style="margin-top:8px;font-size:0.85rem">La base está vacía.<br>Se llena automáticamente al registrar equipos con repuesto y PN.</div>
      </div>`;
      return;
    }

    el.innerHTML = `<table class="data-table" style="font-size:0.8rem">
      <thead><tr>
        <th>Repuesto</th><th>Modelo</th>
        <th>PN</th><th style="text-align:center">Usos</th><th>Acciones</th>
      </tr></thead>
      <tbody>
        ${rows.map((r,i) => `<tr>
          <td><strong>${r.repuesto}</strong></td>
          <td style="color:var(--text-secondary)">${r.modelo}</td>
          <td>
            <span id="rep-pn-display-${i}" style="background:var(--bg-hover);padding:2px 8px;border-radius:4px;font-family:monospace;font-size:0.75rem">${r.pn}</span>
            <input type="text" id="rep-pn-input-${i}" value="${r.pn === '—' ? '' : r.pn}"
              style="display:none;width:110px;font-size:0.75rem;padding:2px 6px;border:1px solid var(--accent);border-radius:4px"
              onkeydown="if(event.key==='Enter') AdminRepuestosDB.guardarPN('${r.key}','${r.modelo.replace(/'/g,"\\'")}',${i})">
          </td>
          <td style="text-align:center;color:var(--text-muted)">${r.usos}x</td>
          <td>
            <div style="display:flex;gap:6px;align-items:center">
              <button onclick="AdminRepuestosDB.editarPN(${i})" style="background:none;border:none;cursor:pointer;font-size:1rem" title="Editar PN">✏️</button>
              <button onclick="AdminRepuestosDB.eliminarEntrada('${r.key}','${r.modelo.replace(/'/g,"\\'")}',${i})"
                style="background:none;border:none;cursor:pointer;font-size:1rem;color:var(--danger)" title="Eliminar">🗑️</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  function editarPN(idx) {
    const display = document.getElementById(`rep-pn-display-${idx}`);
    const input   = document.getElementById(`rep-pn-input-${idx}`);
    if (!display || !input) return;
    display.style.display = 'none';
    input.style.display   = 'inline-block';
    input.focus(); input.select();
  }

  async function guardarPN(key, modelo, idx) {
    const input = document.getElementById(`rep-pn-input-${idx}`);
    if (!input) return;
    const nuevoPn = input.value.trim();
    await ModoRapido.editarPN(key, modelo, nuevoPn);
    Toast.success(`PN actualizado → ${nuevoPn || '(vacío)'}`);
    render();
  }

  async function eliminarEntrada(key, modelo, idx) {
    if (!confirm(`¿Eliminar "${modelo}" de la base de repuestos?`)) return;
    await ModoRapido.eliminarEntrada(key, modelo);
    Toast.success('Entrada eliminada');
    render();
  }

  function filtrarRepuestos(query) {
    const q = query.toLowerCase();
    const filtered = q
      ? _repDBEntries.filter(e =>
          e.repuesto.toLowerCase().includes(q) ||
          (e.modelos || []).some(m =>
            m.modelo.toLowerCase().includes(q) || (m.pn || '').toLowerCase().includes(q)
          )
        )
      : _repDBEntries;
    _renderTablaRepuestos(filtered);
  }

  async function syncRepuestosDB() {
    const btn = document.querySelector('[onclick="AdminRepuestosDB.syncRepuestosDB()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sincronizando…'; }
    try {
      await AppsScriptBridge.saveRepuestosDB(ModoRapido.getAll());
      Toast.success('✅ Base de repuestos sincronizada con Sheets');
      render();
    } catch (e) {
      Toast.error('Error al sincronizar: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '☁️ Sincronizar con Sheets'; }
    }
  }

  function _renderAliases() {
    const el = document.getElementById('aliases-lista');
    if (!el) return;
    const aliases = JSON.parse(localStorage.getItem('model-aliases-v1') || '[]');
    if (!aliases.length) { el.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted)">Sin aliases registrados aún.</div>'; return; }
    el.innerHTML = aliases.map((a, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;background:var(--bg-hover);padding:6px 10px;border-radius:6px;font-size:0.82rem">
        <code style="background:rgba(99,102,241,0.1);padding:2px 8px;border-radius:4px">${a.modeloA}</code>
        <span style="color:var(--text-muted)">≡</span>
        <code style="background:rgba(99,102,241,0.1);padding:2px 8px;border-radius:4px">${a.modeloB}</code>
        <button onclick="AdminRepuestosDB.eliminarAlias(${i})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--danger);font-size:0.9rem">✕</button>
      </div>`).join('');
  }

  function guardarAlias() {
    const a = document.getElementById('alias-modelo-a')?.value.trim();
    const b = document.getElementById('alias-modelo-b')?.value.trim();
    if (!a || !b) { Toast.warning('Completa ambos campos'); return; }
    if (a === b)  { Toast.warning('Los modelos son idénticos'); return; }
    const aliases = JSON.parse(localStorage.getItem('model-aliases-v1') || '[]');
    const dup = aliases.find(x => (x.modeloA===a && x.modeloB===b) || (x.modeloA===b && x.modeloB===a));
    if (dup) { Toast.warning('Alias ya existe'); return; }
    aliases.push({ modeloA: a, modeloB: b });
    localStorage.setItem('model-aliases-v1', JSON.stringify(aliases));
    document.getElementById('alias-modelo-a').value = '';
    document.getElementById('alias-modelo-b').value = '';
    _renderAliases();
    Toast.success(`✅ Alias guardado: "${a}" ≡ "${b}"`);
  }

  function eliminarAlias(idx) {
    const aliases = JSON.parse(localStorage.getItem('model-aliases-v1') || '[]');
    aliases.splice(idx, 1);
    localStorage.setItem('model-aliases-v1', JSON.stringify(aliases));
    _renderAliases();
    Toast.info('Alias eliminado');
  }

  function init() {
    // Inicialización si es necesaria
  }

  return { 
    init, 
    render, 
    editarPN, 
    guardarPN, 
    eliminarEntrada, 
    filtrarRepuestos, 
    syncRepuestosDB, 
    guardarAlias, 
    eliminarAlias 
  };
})();

window.AdminRepuestosDB = AdminRepuestosDB;
