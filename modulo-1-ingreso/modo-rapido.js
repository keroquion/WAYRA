/**
 * modulo-1-ingreso/modo-rapido.js
 * Panel sticky para ingreso masivo.
 * Delega la persistencia y búsqueda de Repuestos/PN a RepuestosDB.
 */

const ModoRapido = (() => {
  const LS_KEY = 'modo-rapido-sticky-v1';

  let _state = _loadState();

  function _loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : _defaultState();
    } catch { return _defaultState(); }
  }

  function _defaultState() {
    return { modo: 'ninguno', tecnico: '', estado: '', repuesto: '', pn: '', falla: '' };
  }

  function _saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch {}
  }

  function renderPanel() {
    const tiposRepuesto  = APP_CONFIG.catalogos.tiposRepuesto || [];
    const estadosSoporte = APP_CONFIG.estadosSoporte || [];
    const modoColor  = { ninguno:'var(--bg-card)', soporte:'rgba(168,85,247,0.08)', garantia:'rgba(6,182,212,0.08)' };
    const modoBorder = { ninguno:'var(--border)',   soporte:'rgba(168,85,247,0.4)',  garantia:'rgba(6,182,212,0.4)'  };
    return `
    <div id="modo-rapido-panel" style="
      background:${modoColor[_state.modo]};
      border:1px solid ${modoBorder[_state.modo]};
      border-radius:var(--radius);
      padding:10px 14px;
      margin-top:6px;
      transition:all 0.2s;
    ">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="display:flex;gap:0;border-radius:6px;overflow:hidden;border:1px solid var(--border);flex-shrink:0">
          <button id="modo-btn-ninguno" onclick="ModoRapido.setModo('ninguno')"
            style="padding:5px 10px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;
              background:${_state.modo==='ninguno'?'var(--text-muted)':'var(--bg-hover)'};
              color:${_state.modo==='ninguno'?'#fff':'var(--text-muted)'}">○ Normal</button>
          <button id="modo-btn-soporte" onclick="ModoRapido.setModo('soporte')"
            style="padding:5px 10px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;
              background:${_state.modo==='soporte'?'#7c3aed':'var(--bg-hover)'};
              color:${_state.modo==='soporte'?'#fff':'var(--text-muted)'}">🔧 Soporte</button>
          <button id="modo-btn-garantia" onclick="ModoRapido.setModo('garantia')"
            style="padding:5px 10px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;
              background:${_state.modo==='garantia'?'#0891b2':'var(--bg-hover)'};
              color:${_state.modo==='garantia'?'#fff':'var(--text-muted)'}">🛡️ Garantía</button>
        </div>

        <div style="display:flex;align-items:center;gap:4px;flex:0 1 170px;min-width:120px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">👨‍🔧 Técnico</label>
          <input type="text" id="sticky-tecnico" class="form-control"
            value="${_esc(_state.tecnico)}" placeholder="Nombre…"
            oninput="ModoRapido.updateField('tecnico',this.value)"
            style="font-size:0.75rem;padding:4px 8px;height:28px">
        </div>

        <div id="sticky-repuesto-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:0 1 160px;min-width:120px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">🔩 Repuesto</label>
          <select id="sticky-repuesto" class="form-control"
            onchange="ModoRapido.onRepuestoChange(this.value)"
            style="font-size:0.75rem;padding:4px 6px;height:28px">
            <option value="">— ninguno —</option>
            ${tiposRepuesto.map(t => `<option value="${t}" ${_state.repuesto===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>

        <div id="sticky-pn-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:0 1 200px;min-width:130px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">🔢 PN</label>
          <input type="text" id="sticky-pn" class="form-control"
            value="${_esc(_state.pn)}" placeholder="Código repuesto…"
            list="pn-suggestions-list"
            oninput="ModoRapido.updateField('pn',this.value)"
            style="font-size:0.75rem;padding:4px 8px;height:28px">
          <datalist id="pn-suggestions-list"></datalist>
        </div>

        <div id="sticky-falla-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:1;min-width:140px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">⚠️ Falla</label>
          <input type="text" id="sticky-falla" class="form-control"
            value="${_esc(_state.falla)}" placeholder="Descripción de falla…"
            oninput="ModoRapido.updateField('falla',this.value)"
            style="font-size:0.75rem;padding:4px 8px;height:28px">
        </div>

        <div id="sticky-estado-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:0 1 160px;min-width:120px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">📋 Estado</label>
          <select id="sticky-estado" class="form-control"
            onchange="ModoRapido.updateField('estado',this.value)"
            style="font-size:0.75rem;padding:4px 6px;height:28px">
            <option value="">— sin estado —</option>
            ${estadosSoporte.map(e => `<option value="${e.key}" ${_state.estado===e.key?'selected':''}>${e.label}</option>`).join('')}
          </select>
        </div>

        <button onclick="ModoRapido.limpiar()" title="Limpiar valores sticky"
          style="flex-shrink:0;padding:4px 8px;font-size:0.68rem;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;color:var(--text-muted)">↺</button>
      </div>

      ${_state.modo !== 'ninguno' ? `
      <div style="margin-top:6px;font-size:0.68rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${_state.modo==='soporte'?'#7c3aed':'#0891b2'};animation:pulse 2s infinite"></span>
        <strong>Modo ${_state.modo==='soporte'?'Soporte':'Garantía'} activo</strong>
        ${_state.tecnico ? `· 👨‍🔧 ${_esc(_state.tecnico)}` : ''}
        ${_state.repuesto ? `· 🔩 ${_esc(_state.repuesto)}` : ''}
        ${_state.pn ? `· PN: <code style="background:var(--bg-hover);padding:1px 4px;border-radius:3px">${_esc(_state.pn)}</code>` : ''}
        <span style="color:var(--accent);margin-left:auto;font-weight:600">↑ Se aplica al escanear</span>
      </div>` : ''}
    </div>`;
  }

  function setModo(modo) {
    _state.modo = modo;
    _saveState();
    _actualizarPanel();
  }

  function updateField(field, value) {
    _state[field] = value;
    _saveState();
    _actualizarIndicador();
  }

  async function onRepuestoChange(value) {
    _state.repuesto = value;
    _state.pn = '';
    _saveState();
    const pnEl = document.getElementById('sticky-pn');
    if (pnEl) pnEl.value = '';
    _actualizarIndicador();
    _actualizarSugerenciasPN(value);
  }

  function limpiar() {
    _state = _defaultState();
    _saveState();
    _actualizarPanel();
  }

  function _actualizarPanel() {
    const panel = document.getElementById('modo-rapido-panel');
    if (!panel) return;
    panel.outerHTML = renderPanel();
    if (_state.repuesto && _state.modo === 'soporte') {
      _actualizarSugerenciasPN(_state.repuesto);
    }
  }

  function _actualizarIndicador() {
    const panel = document.getElementById('modo-rapido-panel');
    if (!panel) return;
    const modoColor  = { ninguno:'var(--bg-card)', soporte:'rgba(168,85,247,0.08)', garantia:'rgba(6,182,212,0.08)' };
    const modoBorder = { ninguno:'var(--border)',  soporte:'rgba(168,85,247,0.4)',  garantia:'rgba(6,182,212,0.4)'  };
    panel.style.background = modoColor[_state.modo];
    panel.style.border = `1px solid ${modoBorder[_state.modo]}`;
  }

  function _actualizarSugerenciasPN(repuesto) {
    const datalist = document.getElementById('pn-suggestions-list');
    if (!datalist || !window.RepuestosDB) return;
    const pns = RepuestosDB.getSugerenciasPN(repuesto);
    datalist.innerHTML = pns.map(pn => `<option value="${_esc(pn)}">`).join('');
  }

  async function autocompletarParaEquipo(modelo) {
    if (!_state.repuesto || !modelo || !window.RepuestosDB) return null;
    const pn = RepuestosDB.buscarPN(_state.repuesto, modelo);
    if (pn && !_state.pn) {
      _state.pn = pn;
      _saveState();
      const pnEl = document.getElementById('sticky-pn');
      if (pnEl) {
        pnEl.value = pn;
        pnEl.style.borderColor = 'var(--success)';
        setTimeout(() => { pnEl.style.borderColor = ''; }, 2000);
      }
      Toast.info(`🔩 PN sugerido para ${modelo}: ${pn}`, { duration: 2500 });
    }
    return pn;
  }

  async function aplicarASiHayModo(registro, loteId) {
    if (_state.modo === 'ninguno') return;
    if (!registro?._registroId) return;

    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      if (loteId && lote.id !== loteId) continue;
      const eq = lote.equipos?.find(e => e._registroId === registro._registroId);
      if (!eq) continue;

      if (_state.modo === 'soporte') {
        eq._estadoSoporte  = _state.estado  || 'RECIBIDO';
        eq._tecnico        = _state.tecnico  || '';
        eq._fallaReportada = _state.falla    || '';
        eq._lastModified   = new Date().toISOString();

        if (_state.repuesto) {
          let pn = _state.pn || (window.RepuestosDB ? RepuestosDB.buscarPN(_state.repuesto, eq.MODELO) : '') || '';

          if (pn && !_state.pn) {
            _state.pn = pn; _saveState();
            const pnEl = document.getElementById('sticky-pn');
            if (pnEl && !pnEl.value) {
              pnEl.value = pn;
              pnEl.style.borderColor = 'var(--success)';
              setTimeout(() => { pnEl.style.borderColor = ''; }, 2000);
            }
          }

          if (!eq._repuestosUsados) eq._repuestosUsados = [];
          const nombre = `${_state.repuesto}${pn ? ' (PN: ' + pn + ')' : ''}`;
          if (!eq._repuestosUsados.find(r => r.nombre === nombre)) {
            eq._repuestosUsados.push({
              nombre, detalle: pn, repuesto: _state.repuesto, pn,
              timestamp: new Date().toISOString(),
            });
          }
          if (pn && window.RepuestosDB) await RepuestosDB.guardarPN(_state.repuesto, eq.MODELO, pn);
        }
      }

      if (_state.modo === 'garantia') {
        eq._tecnico        = _state.tecnico || '';
        eq._estadoGarantia = 'RECIBIDO';
        eq._lastModified   = new Date().toISOString();
      }

      await LocalCache.updateLote(lote);
      _marcarFilaEnTabla(registro._registroId, _state.modo);
      break;
    }
  }

  function _marcarFilaEnTabla(registroId, modo) {
    const modoLabel = modo === 'soporte' ? '🔧 Soporte' : '🛡️ Garantía';
    const repStr    = _state.repuesto ? ` · ${_state.repuesto}` : '';
    const pnStr     = _state.pn ? ` · PN: ${_state.pn}` : '';
    Toast.success(`${modoLabel} aplicado${repStr}${pnStr}`, { duration: 2000 });
  }

  function getModo()     { return _state.modo; }
  function getTecnico()  { return _state.tecnico; }
  function getRepuesto() { return _state.repuesto; }
  function getPN()       { return _state.pn; }

  async function mostrarDBPNs() {
    if (window.Views) Views.go('admin');
    Toast.info('Abre el tab 🗄️ Repuestos en Administración');
  }

  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    renderPanel, setModo, updateField, onRepuestoChange, limpiar,
    aplicarASiHayModo, getModo, getTecnico, getRepuesto, getPN,
    autocompletarParaEquipo, mostrarDBPNs
  };
})();

window.ModoRapido = ModoRapido;
