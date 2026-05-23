/**
 * modulo-1-ingreso/modo-rapido.js
 * Panel de configuración rápida (sticky) para ingreso masivo.
 *
 * - Modo: Soporte / Garantía / Ninguno
 * - Técnico, Estado, Repuesto, PN — todos persisten entre scans
 * - Base de datos interna: repuesto + modelo → PN (auto-sugerencia)
 * - Al escanear un equipo, los valores sticky se aplican automáticamente
 */

const ModoRapido = (() => {
  const LS_KEY = 'modo-rapido-sticky-v1';

  // Estado en memoria (persiste en localStorage entre sesiones)
  let _state = _loadState();

  function _loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : _defaultState();
    } catch { return _defaultState(); }
  }

  function _defaultState() {
    return {
      modo:     'ninguno',   // 'ninguno' | 'soporte' | 'garantia'
      tecnico:  '',
      estado:   '',
      repuesto: '',
      pn:       '',
      falla:    '',
    };
  }

  function _saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch {}
  }

  // ── Renderizar el panel ───────────────────────────────────────────
  function renderPanel() {
    const tiposRepuesto = APP_CONFIG.catalogos.tiposRepuesto || [];
    const estadosSoporte = APP_CONFIG.estadosSoporte || [];

    const modoColor = {
      ninguno:  'var(--bg-card)',
      soporte:  'rgba(168,85,247,0.08)',
      garantia: 'rgba(6,182,212,0.08)',
    };
    const modoBorder = {
      ninguno:  'var(--border)',
      soporte:  'rgba(168,85,247,0.4)',
      garantia: 'rgba(6,182,212,0.4)',
    };

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

        <!-- Modo toggle -->
        <div style="display:flex;gap:0;border-radius:6px;overflow:hidden;border:1px solid var(--border);flex-shrink:0">
          <button id="modo-btn-ninguno"
            onclick="ModoRapido.setModo('ninguno')"
            style="padding:5px 10px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;
              background:${_state.modo==='ninguno'?'var(--text-muted)':'var(--bg-hover)'};
              color:${_state.modo==='ninguno'?'#fff':'var(--text-muted)'}">
            ○ Normal
          </button>
          <button id="modo-btn-soporte"
            onclick="ModoRapido.setModo('soporte')"
            style="padding:5px 10px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;
              background:${_state.modo==='soporte'?'#7c3aed':'var(--bg-hover)'};
              color:${_state.modo==='soporte'?'#fff':'var(--text-muted)'}">
            🔧 Soporte
          </button>
          <button id="modo-btn-garantia"
            onclick="ModoRapido.setModo('garantia')"
            style="padding:5px 10px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;
              background:${_state.modo==='garantia'?'#0891b2':'var(--bg-hover)'};
              color:${_state.modo==='garantia'?'#fff':'var(--text-muted)'}">
            🛡️ Garantía
          </button>
        </div>

        <!-- Técnico -->
        <div style="display:flex;align-items:center;gap:4px;flex:0 1 170px;min-width:120px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">👨‍🔧 Técnico</label>
          <input type="text" id="sticky-tecnico" class="form-control"
            value="${_esc(_state.tecnico)}"
            placeholder="Nombre…"
            oninput="ModoRapido.updateField('tecnico',this.value)"
            style="font-size:0.75rem;padding:4px 8px;height:28px">
        </div>

        <!-- Repuesto (solo en modo soporte) -->
        <div id="sticky-repuesto-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:0 1 160px;min-width:120px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">🔩 Repuesto</label>
          <select id="sticky-repuesto" class="form-control"
            onchange="ModoRapido.onRepuestoChange(this.value)"
            style="font-size:0.75rem;padding:4px 6px;height:28px">
            <option value="">— ninguno —</option>
            ${tiposRepuesto.map(t => `<option value="${t}" ${_state.repuesto===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>

        <!-- PN / Código repuesto -->
        <div id="sticky-pn-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:0 1 200px;min-width:130px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">🔢 PN</label>
          <input type="text" id="sticky-pn" class="form-control"
            value="${_esc(_state.pn)}"
            placeholder="Código repuesto…"
            list="pn-suggestions-list"
            oninput="ModoRapido.updateField('pn',this.value)"
            style="font-size:0.75rem;padding:4px 8px;height:28px">
          <datalist id="pn-suggestions-list"></datalist>
        </div>

        <!-- Falla rápida -->
        <div id="sticky-falla-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:1;min-width:140px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">⚠️ Falla</label>
          <input type="text" id="sticky-falla" class="form-control"
            value="${_esc(_state.falla)}"
            placeholder="Descripción de falla…"
            oninput="ModoRapido.updateField('falla',this.value)"
            style="font-size:0.75rem;padding:4px 8px;height:28px">
        </div>

        <!-- Estado soporte -->
        <div id="sticky-estado-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:0 1 160px;min-width:120px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">📋 Estado</label>
          <select id="sticky-estado" class="form-control"
            onchange="ModoRapido.updateField('estado',this.value)"
            style="font-size:0.75rem;padding:4px 6px;height:28px">
            <option value="">— sin estado —</option>
            ${estadosSoporte.map(e => `<option value="${e.key}" ${_state.estado===e.key?'selected':''}>${e.label}</option>`).join('')}
          </select>
        </div>

        <!-- Limpiar -->
        <button onclick="ModoRapido.limpiar()"
          title="Limpiar valores sticky"
          style="flex-shrink:0;padding:4px 8px;font-size:0.68rem;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;color:var(--text-muted)">
          ↺
        </button>

      </div>

      <!-- Indicador de modo activo -->
      ${_state.modo !== 'ninguno' ? `
      <div style="margin-top:6px;font-size:0.68rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${_state.modo==='soporte'?'#7c3aed':'#0891b2'};animation:pulse 2s infinite"></span>
        <strong>Modo ${_state.modo==='soporte'?'Soporte':'Garantía'} activo</strong>
        ${_state.tecnico ? `· 👨‍🔧 ${_esc(_state.tecnico)}` : ''}
        ${_state.repuesto ? `· 🔩 ${_esc(_state.repuesto)}` : ''}
        ${_state.pn ? `· PN: <code style="background:var(--bg-hover);padding:1px 4px;border-radius:3px">${_esc(_state.pn)}</code>` : ''}
        <span style="color:var(--accent);margin-left:auto;font-weight:600">↑ Estos valores se aplican al escanear</span>
      </div>` : ''}
    </div>`;
  }

  // ── Acciones ──────────────────────────────────────────────────────
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
    _saveState();
    // Limpiar PN al cambiar repuesto (se cargará de la DB si existe)
    _state.pn = '';
    const pnEl = document.getElementById('sticky-pn');
    if (pnEl) pnEl.value = '';
    _actualizarIndicador();
    // Cargar sugerencias de PN de la DB interna
    await _cargarSugerenciasPN(value);
  }

  function limpiar() {
    _state = _defaultState();
    _saveState();
    _actualizarPanel();
  }

  // ── Actualizar panel sin re-renderizar completo ───────────────────
  function _actualizarPanel() {
    const panel = document.getElementById('modo-rapido-panel');
    if (!panel) return;
    const wrapper = panel.parentElement;
    if (!wrapper) return;
    panel.outerHTML = renderPanel();
    // Re-cargar sugerencias si hay repuesto
    if (_state.repuesto && _state.modo === 'soporte') {
      _cargarSugerenciasPN(_state.repuesto);
    }
    // Mostrar/ocultar campos según modo
    const isS = _state.modo === 'soporte';
    ['sticky-repuesto-wrap','sticky-pn-wrap','sticky-falla-wrap','sticky-estado-wrap'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isS ? 'flex' : 'none';
    });
  }

  function _actualizarIndicador() {
    // Sólo actualizar el indicador de estado sin re-renderizar todo
    const panel = document.getElementById('modo-rapido-panel');
    if (!panel) return;
    // Actualizar colores del panel según modo
    const modoColor = { ninguno:'var(--bg-card)', soporte:'rgba(168,85,247,0.08)', garantia:'rgba(6,182,212,0.08)' };
    const modoBorder = { ninguno:'var(--border)', soporte:'rgba(168,85,247,0.4)', garantia:'rgba(6,182,212,0.4)' };
    panel.style.background = modoColor[_state.modo];
    panel.style.border = `1px solid ${modoBorder[_state.modo]}`;
  }

  // ── DB Interna de PNs ─────────────────────────────────────────────
  // Key: "repuesto|modelo_normalizado"
  // Value: { pn, repuesto, modelos: [{ modelo, usos }], updatedAt }

  function _normalizarModelo(modelo) {
    return (modelo || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  async function guardarPN(repuesto, modelo, pn) {
    if (!repuesto || !pn) return;
    const key = repuesto + '|' + _normalizarModelo(modelo);
    try {
      const existing = await LocalCache.get('repuestos_db', key);
      const entry = existing || { key, repuesto, modelos: [] };
      const mIdx = entry.modelos.findIndex(m => m.modelo === modelo);
      if (mIdx >= 0) {
        entry.modelos[mIdx].usos = (entry.modelos[mIdx].usos || 0) + 1;
        entry.modelos[mIdx].pn = pn;
      } else {
        entry.modelos.push({ modelo, pn, usos: 1 });
      }
      entry.pn = pn;  // último PN usado para este repuesto+modelo
      entry.updatedAt = new Date().toISOString();
      await LocalCache.put('repuestos_db', entry);
      console.log(`[PNdb] Guardado: ${key} → ${pn}`);
    } catch (e) { console.warn('[PNdb] Error guardando:', e.message); }
  }

  async function buscarPN(repuesto, modelo) {
    if (!repuesto) return null;
    const key = repuesto + '|' + _normalizarModelo(modelo);
    try {
      const entry = await LocalCache.get('repuestos_db', key);
      return entry?.pn || null;
    } catch { return null; }
  }

  async function _cargarSugerenciasPN(repuesto) {
    if (!repuesto) return;
    const datalist = document.getElementById('pn-suggestions-list');
    if (!datalist) return;
    try {
      // Buscar todos los PNs para este tipo de repuesto
      const todos = await LocalCache.getAll('repuestos_db');
      const delRepuesto = todos.filter(e => e.repuesto === repuesto);
      const pns = [...new Set(delRepuesto.map(e => e.pn).filter(Boolean))];
      datalist.innerHTML = pns.map(pn => `<option value="${_esc(pn)}">`).join('');
    } catch {}
  }

  // ── Aplicar sticky al equipo recién registrado ────────────────────
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
          // PN: usar el sticky, o buscar en DB si no hay PN en sticky
          let pn = _state.pn;
          if (!pn) {
            pn = await buscarPN(_state.repuesto, eq.MODELO) || '';
          }

          // Auto-fill PN en el sticky si se encontró en DB y el campo está vacío
          if (pn && !_state.pn) {
            _state.pn = pn;
            _saveState();
            const pnEl = document.getElementById('sticky-pn');
            if (pnEl && !pnEl.value) pnEl.value = pn;
          }

          if (!eq._repuestosUsados) eq._repuestosUsados = [];
          const nombre = `${_state.repuesto}${pn ? ' (PN: ' + pn + ')' : ''}`;
          // Evitar duplicado si ya existe el mismo repuesto
          if (!eq._repuestosUsados.find(r => r.nombre === nombre)) {
            eq._repuestosUsados.push({
              nombre,
              detalle: pn,
              repuesto: _state.repuesto,
              pn,
              timestamp: new Date().toISOString(),
            });
          }

          // Guardar en DB de PNs
          if (pn) await guardarPN(_state.repuesto, eq.MODELO, pn);
        }
      }

      if (_state.modo === 'garantia') {
        eq._tecnico       = _state.tecnico || '';
        eq._estadoGarantia = 'RECIBIDO';
        eq._lastModified  = new Date().toISOString();
      }

      await LocalCache.updateLote(lote);

      // Chip visual en la fila de la tabla
      _marcarFilaEnTabla(registro._registroId, _state.modo);
      break;
    }
  }

  function _marcarFilaEnTabla(registroId, modo) {
    // Añadir un badge visible en la tabla para confirmar que se aplicó
    const rows = document.querySelectorAll('#ingreso-tabla tbody tr');
    // No podemos identificar la fila fácilmente por registroId sin data-attr
    // Toast es suficiente feedback visual
    const modoLabel = modo === 'soporte' ? '🔧 Soporte' : '🛡️ Garantía';
    const repStr    = _state.repuesto ? ` · ${_state.repuesto}` : '';
    const pnStr     = _state.pn ? ` · PN: ${_state.pn}` : '';
    Toast.success(`${modoLabel} aplicado automáticamente${repStr}${pnStr}`, { duration: 2000 });
  }

  // ── Getters ───────────────────────────────────────────────────────
  function getModo()     { return _state.modo; }
  function getTecnico()  { return _state.tecnico; }
  function getRepuesto() { return _state.repuesto; }
  function getPN()       { return _state.pn; }

  // ── Ver/editar DB de PNs ──────────────────────────────────────────
  async function mostrarDBPNs() {
    const todos = await LocalCache.getAll('repuestos_db');
    if (!todos.length) { Toast.info('La base de PNs está vacía — se llena automáticamente al registrar equipos con repuesto y PN'); return; }
    const html = `
      <div class="modal-title">🔩 Base de datos interna de PNs</div>
      <div class="modal-subtitle">Se construye automáticamente al registrar repuestos. Editable manualmente.</div>
      <div style="overflow-x:auto;margin-top:12px">
        <table class="data-table" style="font-size:0.78rem">
          <thead><tr><th>Repuesto</th><th>Modelo</th><th>PN</th><th>Usos</th><th></th></tr></thead>
          <tbody>
            ${todos.flatMap(e => e.modelos.map(m =>
              `<tr>
                <td><strong>${e.repuesto}</strong></td>
                <td>${m.modelo}</td>
                <td><code style="background:var(--bg-hover);padding:2px 6px;border-radius:3px">${m.pn}</code></td>
                <td style="text-align:center">${m.usos || 1}</td>
                <td><button onclick="ModoRapido.eliminarEntradaPN('${e.key}','${m.modelo}')" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:0.8rem">🗑️</button></td>
              </tr>`
            )).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cerrar</button>
      </div>`;
    ModalGenerico.open(html, { size: 'modal-lg' });
  }

  async function eliminarEntradaPN(key, modelo) {
    const entry = await LocalCache.get('repuestos_db', key);
    if (!entry) return;
    entry.modelos = entry.modelos.filter(m => m.modelo !== modelo);
    if (!entry.modelos.length) {
      await LocalCache.del('repuestos_db', key);
    } else {
      await LocalCache.put('repuestos_db', entry);
    }
    Toast.success('Entrada eliminada');
    mostrarDBPNs(); // refrescar modal
  }

  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    renderPanel, setModo, updateField, onRepuestoChange, limpiar,
    aplicarASiHayModo, getModo, getTecnico, getRepuesto, getPN,
    guardarPN, buscarPN, mostrarDBPNs, eliminarEntradaPN,
  };
})();

window.ModoRapido = ModoRapido;
