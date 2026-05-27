/**
 * modulo-1-ingreso/modo-rapido.js
 * Panel sticky para ingreso masivo + Base de datos de Repuestos/PN.
 *
 * ARQUITECTURA DE LA DB:
 *   Memory Map (O(1)) ←→ IndexedDB (offline) ←→ Sheets _RepuestosDB (compartida)
 *
 * Flujo:
 *   1. Al iniciar → carga Sheets → IDB → Memory Map
 *   2. Al guardar → Memory Map → IDB → Sheets (debounced 3s)
 *   3. Al buscar  → Memory Map (instantáneo, sin I/O)
 *   4. Fuzzy match → normaliza modelo para tolerar variaciones (HP, sin HP, espacios, etc.)
 */

const ModoRapido = (() => {
  const LS_KEY = 'modo-rapido-sticky-v1';

  // ── Memory Map: key → entry (carga completa en RAM al iniciar) ────
  let _memMap = new Map(); // key="repuesto|modelo_norm" → { pn, usos, modelos, repuesto }
  let _syncTimer = null;
  let _loaded = false;

  // Estado sticky en memoria
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

  // ── Normalización de modelo (fuzzy match) ─────────────────────────
  // "HP ProBook 640 G8" → "probook640g8"
  // "PROBOOK 640G8"     → "probook640g8"  ← mismo resultado → match!
  const _BRAND_PREFIXES = /\b(hp|dell|lenovo|asus|acer|toshiba|samsung|lg|msi|fujitsu|sony|panasonic|huawei|microsoft|apple|mac)\b/gi;

  function _norm(str) {
    return (str || '')
      .toLowerCase()
      .replace(_BRAND_PREFIXES, '')   // quitar marcas
      .replace(/[^a-z0-9]/g, '')     // solo alfanumérico
      .trim();
  }

  function _makeKey(repuesto, modelo) {
    return (repuesto || '') + '|' + _norm(modelo);
  }

  // ── Cargar DB desde Sheets → IDB → Memory Map ────────────────────
  async function loadFromRemote() {
    if (!APP_CONFIG.appsScript.webAppUrl) return;
    try {
      const res = await AppsScriptBridge.loadRepuestosDB();
      const entries = res.entries || [];
      // Guardar en IDB y poblar Memory Map
      for (const entry of entries) {
        await LocalCache.put('repuestos_db', entry);
        _memMap.set(entry.key, entry);
      }
      _loaded = true;
      console.log(`[RepuestosDB] ✅ Cargados ${entries.length} entradas desde Sheets`);
    } catch (e) {
      console.warn('[RepuestosDB] Error cargando desde Sheets:', e.message);
      // Fallback: cargar desde IDB local
      await _loadFromIDB();
    }
  }

  async function _loadFromIDB() {
    try {
      const todos = await LocalCache.getAll('repuestos_db');
      for (const entry of todos) {
        _memMap.set(entry.key, entry);
      }
      _loaded = true;
      console.log(`[RepuestosDB] 📦 ${_memMap.size} entradas cargadas desde IDB local`);
    } catch (e) {
      console.warn('[RepuestosDB] Error cargando IDB:', e.message);
    }
  }

  // ── Guardar PN (Memory Map + IDB + Sheets debounced) ─────────────
  async function guardarPN(repuesto, modelo, pn) {
    if (!repuesto || !modelo) return;
    const key = _makeKey(repuesto, modelo);

    // 1. Actualizar Memory Map
    let entry = _memMap.get(key) || { key, repuesto, modelos: [], pn: '', updatedAt: '' };
    const mIdx = entry.modelos.findIndex(m => _norm(m.modelo) === _norm(modelo));
    if (mIdx >= 0) {
      entry.modelos[mIdx].usos = (entry.modelos[mIdx].usos || 0) + 1;
      if (pn) entry.modelos[mIdx].pn = pn;
    } else {
      entry.modelos.push({ modelo, pn: pn || '', usos: 1 });
    }
    if (pn) entry.pn = pn;
    entry.updatedAt = new Date().toISOString();
    _memMap.set(key, entry);

    // 2. Guardar en IDB
    try { await LocalCache.put('repuestos_db', entry); } catch {}

    // 3. Sync a Sheets (debounced 3s para agrupar cambios rápidos)
    _scheduleSyncToSheets();

    console.log(`[RepuestosDB] 💾 ${repuesto} + ${modelo}${pn?' → PN: '+pn:' (sin PN)'}`);
  }

  // ── Buscar PN — Fuzzy (Memory Map, instantáneo) ───────────────────
  // Busca primero por coincidencia exacta normalizada.
  // Si no hay, busca por similitud (modelo normalizado contenido en la key).
  function buscarPN(repuesto, modelo) {
    if (!repuesto || !modelo) return null;
    const keyExact = _makeKey(repuesto, modelo);
    const modeloNorm = _norm(modelo);

    // 1. Exacto
    const exact = _memMap.get(keyExact);
    if (exact?.pn) return exact.pn;

    // 2. Fuzzy: buscar entradas del mismo repuesto con modelo similar
    let bestPn = null;
    let bestUsos = 0;
    for (const [k, entry] of _memMap) {
      if (entry.repuesto !== repuesto) continue;
      // Verificar si el modelo normalizado está contenido o contiene el buscado
      const entryNorm = k.split('|')[1] || '';
      const isSimilar = entryNorm === modeloNorm ||
        (entryNorm.length > 4 && modeloNorm.includes(entryNorm)) ||
        (modeloNorm.length > 4 && entryNorm.includes(modeloNorm));
      if (!isSimilar) continue;
      // Tomar el modelo con más usos dentro de esta entry
      for (const m of (entry.modelos || [])) {
        if (m.pn && m.usos > bestUsos) { bestPn = m.pn; bestUsos = m.usos; }
      }
      if (!bestPn && entry.pn) bestPn = entry.pn;
    }
    return bestPn || null;
  }

  // ── Obtener todas las sugerencias de PN para un repuesto ──────────
  function getSugerenciasPN(repuesto) {
    if (!repuesto) return [];
    const pns = new Set();
    for (const [, entry] of _memMap) {
      if (entry.repuesto !== repuesto) continue;
      for (const m of (entry.modelos || [])) { if (m.pn) pns.add(m.pn); }
    }
    return [...pns];
  }

  // ── Sync a Sheets (debounced) ─────────────────────────────────────
  function _scheduleSyncToSheets() {
    if (!APP_CONFIG.appsScript.webAppUrl) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(async () => {
      try {
        const entries = [..._memMap.values()];
        await AppsScriptBridge.saveRepuestosDB(entries);
        console.log(`[RepuestosDB] ☁️ Sincronizados ${entries.length} entradas a Sheets`);
      } catch (e) {
        console.warn('[RepuestosDB] Error sync a Sheets:', e.message);
      }
    }, 3000);
  }

  // ── Obtener toda la DB (para admin view) ─────────────────────────
  function getAll() {
    return [..._memMap.values()].sort((a, b) =>
      (a.repuesto + a.key).localeCompare(b.repuesto + b.key)
    );
  }

  // ── Eliminar entrada ──────────────────────────────────────────────
  async function eliminarEntrada(key, modeloToRemove) {
    const entry = _memMap.get(key);
    if (!entry) return;
    if (modeloToRemove) {
      entry.modelos = entry.modelos.filter(m => m.modelo !== modeloToRemove);
    }
    if (!modeloToRemove || entry.modelos.length === 0) {
      _memMap.delete(key);
      try { await LocalCache.del('repuestos_db', key); } catch {}
    } else {
      entry.pn = entry.modelos[0]?.pn || '';
      _memMap.set(key, entry);
      try { await LocalCache.put('repuestos_db', entry); } catch {}
    }
    _scheduleSyncToSheets();
  }

  // ── Editar PN de una entrada ──────────────────────────────────────
  async function editarPN(key, modelo, nuevoPn) {
    const entry = _memMap.get(key);
    if (!entry) return;
    const m = entry.modelos.find(m => m.modelo === modelo);
    if (m) m.pn = nuevoPn;
    entry.pn = nuevoPn;
    entry.updatedAt = new Date().toISOString();
    _memMap.set(key, entry);
    try { await LocalCache.put('repuestos_db', entry); } catch {}
    _scheduleSyncToSheets();
  }

  // ── Panel UI (sticky) ─────────────────────────────────────────────
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
        <!-- Modo toggle -->
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

        <!-- Técnico -->
        <div style="display:flex;align-items:center;gap:4px;flex:0 1 170px;min-width:120px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">👨‍🔧 Técnico</label>
          <input type="text" id="sticky-tecnico" class="form-control"
            value="${_esc(_state.tecnico)}" placeholder="Nombre…"
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
            value="${_esc(_state.pn)}" placeholder="Código repuesto…"
            list="pn-suggestions-list"
            oninput="ModoRapido.updateField('pn',this.value)"
            style="font-size:0.75rem;padding:4px 8px;height:28px">
          <datalist id="pn-suggestions-list"></datalist>
        </div>

        <!-- Falla rápida -->
        <div id="sticky-falla-wrap" style="display:${_state.modo==='soporte'?'flex':'none'};align-items:center;gap:4px;flex:1;min-width:140px">
          <label style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;font-weight:600">⚠️ Falla</label>
          <input type="text" id="sticky-falla" class="form-control"
            value="${_esc(_state.falla)}" placeholder="Descripción de falla…"
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
        <button onclick="ModoRapido.limpiar()" title="Limpiar valores sticky"
          style="flex-shrink:0;padding:4px 8px;font-size:0.68rem;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;color:var(--text-muted)">↺</button>
      </div>

      <!-- Indicador modo activo -->
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

  // ── Acciones panel ────────────────────────────────────────────────
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

  // Rellena el <datalist> de sugerencias de PN para el repuesto seleccionado
  function _actualizarSugerenciasPN(repuesto) {
    const datalist = document.getElementById('pn-suggestions-list');
    if (!datalist) return;
    const pns = getSugerenciasPN(repuesto);
    datalist.innerHTML = pns.map(pn => `<option value="${_esc(pn)}">`).join('');
  }

  // ── Autocompletar PN al escanear un equipo con modelo conocido ────
  // Llamado desde ingreso.view.js después de identificar el equipo
  async function autocompletarParaEquipo(modelo) {
    if (!_state.repuesto || !modelo) return null;
    const pn = buscarPN(_state.repuesto, modelo);
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
          // Buscar PN: sticky primero, luego DB fuzzy
          let pn = _state.pn || buscarPN(_state.repuesto, eq.MODELO) || '';

          // Si se encontró en DB y no estaba en sticky, actualizar sticky
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
          // Guardar en DB de PNs (solo si hay PN)
          if (pn) await guardarPN(_state.repuesto, eq.MODELO, pn);
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

  // ── Getters ───────────────────────────────────────────────────────
  function getModo()     { return _state.modo; }
  function getTecnico()  { return _state.tecnico; }
  function getRepuesto() { return _state.repuesto; }
  function getPN()       { return _state.pn; }

  // ── Compatibilidad con código anterior ───────────────────────────
  async function mostrarDBPNs() {
    // Redirige al tab de Admin → Repuestos DB
    if (window.Views) Views.go('admin');
    Toast.info('Abre el tab 🗄️ Repuestos en Administración');
  }

  async function eliminarEntradaPN(key, modelo) {
    await eliminarEntrada(key, modelo);
    Toast.success('Entrada eliminada');
  }

  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    // Panel sticky
    renderPanel, setModo, updateField, onRepuestoChange, limpiar,
    aplicarASiHayModo, getModo, getTecnico, getRepuesto, getPN,
    autocompletarParaEquipo,
    // DB de repuestos/PN
    guardarPN, buscarPN, getSugerenciasPN,
    getAll, eliminarEntrada, editarPN,
    loadFromRemote,
    // Compatibilidad
    mostrarDBPNs, eliminarEntradaPN,
  };
})();

window.ModoRapido = ModoRapido;
