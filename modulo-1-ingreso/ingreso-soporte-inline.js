/**
 * modulo-1-ingreso/ingreso-soporte-inline.js — Inventario Pro v3
 * Handlers para las acciones en modo Soporte y Garantía (inline en la tabla).
 */

const IngresoSoporteInline = (() => {

  function init() {
    window._sopOnRepuestoChange = _sopOnRepuestoChange;
    window._sopOnPNInput = _sopOnPNInput;
    window._sopAutoAgregar = _sopAutoAgregar;
    window._sopAgregarSiTieneRepuesto = _sopAgregarSiTieneRepuesto;
    window._sopAgregarRepuesto = _sopAgregarRepuesto;
    window._sopQuitarRepuesto = _sopQuitarRepuesto;
    window._sopAbrirBuscador = _sopAbrirBuscador;
    window._sopFiltrarBuscador = _sopFiltrarBuscador;
    window._sopSeleccionarDeBuscador = _sopSeleccionarDeBuscador;
    window._sopAutocompletarPN = _sopAutocompletarPN;
    window._garGuardar = _garGuardar;
  }

  function _saveStickyRepuesto(r) { localStorage.setItem('sticky-repuesto-v1', r); }
  function _saveStickyPN(p)       { localStorage.setItem('sticky-pn-v1', p); }

  async function _sopOnRepuestoChange(regId, modelo) {
    const sel = document.getElementById('sop-rep-' + regId);
    if (!sel) return;
    _saveStickyRepuesto(sel.value);
    // Auto-fill PN from DB for this repuesto+modelo
    if (sel.value && modelo && window.ModoRapido?.buscarPN) {
      const pn = await ModoRapido.buscarPN(sel.value, modelo);
      if (pn) {
        const pnEl = document.getElementById('sop-pn-' + regId);
        if (pnEl && !pnEl.value) { pnEl.value = pn; _saveStickyPN(pn); }
      }
    }
  }

  function _sopOnPNInput(regId, val) {
    _saveStickyPN(val);
  }

  function _sopAutoAgregar(regId) {
    const sel = document.getElementById('sop-rep-' + regId);
    if (!sel || !sel.value) return;
    setTimeout(() => _sopAgregarRepuesto(regId), 180);
  }

  function _sopAgregarSiTieneRepuesto(regId) {
    const sel = document.getElementById('sop-rep-' + regId);
    if (!sel || !sel.value) return;
    _sopAgregarRepuesto(regId);
  }

  async function _sopAgregarRepuesto(regId) {
    const sel = document.getElementById('sop-rep-' + regId);
    const pnEl = document.getElementById('sop-pn-'  + regId);
    const repuesto = sel?.value?.trim();
    const pn       = pnEl?.value?.trim();
    if (!repuesto) { Toast.warning('Selecciona un tipo de repuesto'); return; }
    
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === regId);
      if (!eq) continue;
      
      if (!eq._repuestosUsados) eq._repuestosUsados = [];
      const nombre = repuesto + (pn ? ' (PN: ' + pn + ')' : '');
      if (!eq._repuestosUsados.find(r => r.repuesto === repuesto && r.pn === pn)) {
        eq._repuestosUsados.push({ nombre, repuesto, pn, timestamp: new Date().toISOString() });
      }
      eq._estadoSoporte = eq._estadoSoporte || 'RECIBIDO';
      eq._tecnico = eq._tecnico || (window._loteActivo?.tecnico || '');
      eq._lastModified = new Date().toISOString();
      
      await LocalCache.updateLote(lote);
      if (pn && window.ModoRapido?.guardarPN) await ModoRapido.guardarPN(repuesto, eq.MODELO, pn);
      
      window._loteActivo = await LocalCache.getLoteActivo();
      IngresoTabla.render();
      
      if (repuesto) _saveStickyRepuesto(repuesto);
      if (pn)       _saveStickyPN(pn);
      Toast.success(repuesto + (pn ? ' · ' + pn : '') + ' añadido');
      return;
    }
    Toast.error('Equipo no encontrado');
  }

  async function _sopQuitarRepuesto(regId, idx) {
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === regId);
      if (!eq) continue;
      eq._repuestosUsados = (eq._repuestosUsados || []).filter((_, i) => i !== idx);
      await LocalCache.updateLote(lote);
      window._loteActivo = await LocalCache.getLoteActivo();
      IngresoTabla.render();
      return;
    }
  }

  function _sopAbrirBuscador(regId, modelo, serie) {
    const panelEl = document.getElementById('sop-search-' + regId);
    if (!panelEl) return;
    if (panelEl.style.display !== 'none') {
      panelEl.style.display = 'none';
      return;
    }
    const repuestoSel = document.getElementById('sop-rep-' + regId)?.value || '';
    _sopRenderBuscador(panelEl, regId, modelo, repuestoSel, '');
    panelEl.style.display = 'block';
  }

  function _sopRenderBuscador(panelEl, regId, modelo, repuestoFiltro, textoBusqueda) {
    if (!window.ModoRapido) return;
    const todos = ModoRapido.getAll();
    const q = textoBusqueda.toLowerCase();

    let rows = [];
    for (const entry of todos) {
      for (const m of (entry.modelos || [])) {
        rows.push({ repuesto: entry.repuesto, modelo: m.modelo, pn: m.pn || '', usos: m.usos || 1 });
      }
    }

    if (repuestoFiltro) rows = rows.filter(r => r.repuesto === repuestoFiltro);

    if (q) rows = rows.filter(r =>
      r.modelo.toLowerCase().includes(q) ||
      r.pn.toLowerCase().includes(q) ||
      r.repuesto.toLowerCase().includes(q)
    );

    if (modelo) {
      const modeloNorm = modelo.toLowerCase().replace(/[^a-z0-9]/g, '');
      rows.sort((a, b) => {
        const aN = a.modelo.toLowerCase().replace(/[^a-z0-9]/g, '');
        const bN = b.modelo.toLowerCase().replace(/[^a-z0-9]/g, '');
        const aM = aN.includes(modeloNorm) || modeloNorm.includes(aN) ? 0 : 1;
        const bM = bN.includes(modeloNorm) || modeloNorm.includes(bN) ? 0 : 1;
        return aM - bM || b.usos - a.usos;
      });
    }

    const modeloEsc = (modelo || '').replace(/'/g, "\\'");
    panelEl.innerHTML = `
      <div style="margin-top:4px;background:var(--bg-card);border:1px solid var(--accent);border-radius:6px;padding:8px;font-size:0.75rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:420px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <input type="text" placeholder="🔍 Buscar modelo, repuesto o PN…"
            value="${textoBusqueda}"
            oninput="_sopFiltrarBuscador('${regId}','${modeloEsc}','${repuestoFiltro.replace(/'/g,"\\'")}',this.value)"
            style="flex:1;font-size:0.73rem;padding:3px 6px;height:24px;border:1px solid var(--border);border-radius:4px;background:var(--bg-hover);color:var(--text)">
          <button onclick="document.getElementById('sop-search-${regId}').style.display='none'"
            style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.9rem;padding:0 2px">✕</button>
        </div>
        ${!rows.length ? `<div style="color:var(--text-muted);text-align:center;padding:8px 0">Sin resultados en la base</div>` :
          `<div style="max-height:160px;overflow-y:auto">
            ${rows.slice(0, 30).map(r => `
              <div onclick="_sopSeleccionarDeBuscador('${regId}','${r.pn.replace(/'/g,"\\'")}','${r.repuesto.replace(/'/g,"\\'")}','${r.modelo.replace(/'/g,"\\'")}',this)"
                style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;transition:background 0.1s"
                onmouseover="this.style.background='var(--bg-hover)'"
                onmouseout="this.style.background='transparent'">
                <span style="color:var(--text-muted);min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.repuesto}</span>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary)">${r.modelo}</span>
                <code style="background:rgba(99,102,241,0.1);padding:1px 6px;border-radius:3px;font-size:0.7rem;white-space:nowrap;flex-shrink:0">${r.pn || '<span style="color:var(--text-muted)">sin PN</span>'}</code>
                <span style="color:var(--text-muted);font-size:0.65rem;flex-shrink:0">${r.usos}x</span>
              </div>`).join('')}
          </div>`
        }
        <div style="margin-top:6px;border-top:1px solid var(--border);padding-top:5px;font-size:0.68rem;color:var(--text-muted)">
          ${rows.length} resultado(s) · Clic en una fila para usar ese PN
        </div>
      </div>`;
  }

  function _sopFiltrarBuscador(regId, modelo, repuesto, texto) {
    const panelEl = document.getElementById('sop-search-' + regId);
    if (!panelEl) return;
    _sopRenderBuscador(panelEl, regId, modelo, repuesto, texto);
  }

  function _sopSeleccionarDeBuscador(regId, pn, repuesto, modelo, rowEl) {
    const selRepuesto = document.getElementById('sop-rep-' + regId);
    if (selRepuesto && repuesto) {
      const opt = [...selRepuesto.options].find(o => o.value === repuesto);
      if (opt) { selRepuesto.value = repuesto; _saveStickyRepuesto(repuesto); }
    }
    const pnEl = document.getElementById('sop-pn-' + regId);
    if (pnEl) {
      pnEl.value = pn;
      pnEl.style.borderColor = 'var(--success)';
      setTimeout(() => { pnEl.style.borderColor = ''; }, 1500);
      _saveStickyPN(pn);
    }
    const panelEl = document.getElementById('sop-search-' + regId);
    if (panelEl) panelEl.style.display = 'none';
    if (rowEl) { rowEl.style.background = 'rgba(34,197,94,0.1)'; }
    Toast.success(`🔍 Seleccionado: ${repuesto}${pn ? ' · PN: ' + pn : ''}`, { duration: 1800 });
  }

  async function _sopAutocompletarPN(regId, modelo) {
    if (!window.ModoRapido?.buscarPN) return;
    const sel   = document.getElementById('sop-rep-' + regId);
    const pnEl  = document.getElementById('sop-pn-'  + regId);
    if (!sel || !pnEl || pnEl.value) return;
    const repuesto = sel?.value;
    if (!repuesto) return;
    const pn = await ModoRapido.buscarPN(repuesto, modelo);
    if (pn) { pnEl.value = pn; }
  }

  async function _garGuardar(regId) {
    const proveedor  = document.getElementById('gar-prov-'  + regId)?.value  || '';
    const falla      = document.getElementById('gar-falla-' + regId)?.value  || '';
    const fechaEnvio = document.getElementById('gar-fecha-' + regId)?.value  || '';
    
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === regId);
      if (!eq) continue;
      eq._estadoGarantia     = eq._estadoGarantia || 'RECIBIDO';
      eq._proveedorGarantia  = proveedor;
      eq._fallaGarantia      = falla;
      eq._fechaEnvioGarantia = fechaEnvio;
      eq._tecnico            = eq._tecnico || (window._loteActivo?.tecnico || '');
      eq._lastModified       = new Date().toISOString();
      
      await LocalCache.updateLote(lote);
      window._loteActivo = await LocalCache.getLoteActivo();
      return;
    }
  }

  return { init };
})();

window.IngresoSoporteInline = IngresoSoporteInline;
