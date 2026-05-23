/**
 * modulo-1-ingreso/ingreso.view.js
 * Vista principal Módulo 1: Scan + Grid dinámico + Lote activo.
 */

const IngresoView = (() => {
  let _loteActivo = null;
  let _modo          = localStorage.getItem('ingreso-modo-v1')      || 'normal';
  let _stickyRepuesto = localStorage.getItem('sticky-repuesto-v1') || '';
  let _stickyPN       = localStorage.getItem('sticky-pn-v1')       || '';

  function _saveStickyRepuesto(r) { _stickyRepuesto = r; localStorage.setItem('sticky-repuesto-v1', r); }
  function _saveStickyPN(p)       { _stickyPN = p;       localStorage.setItem('sticky-pn-v1', p); }

  function _setModo(m) {
    _modo = m;
    localStorage.setItem('ingreso-modo-v1', m);
    _actualizarModoUI();
    _renderTabla();
  }

  function _actualizarModoUI() {
    ['normal','soporte','garantia'].forEach(m => {
      const btn = document.getElementById('modo-btn-' + m);
      if (!btn) return;
      const active = m === _modo;
      if (m === 'normal')    { btn.style.background = active ? 'var(--text-muted)' : 'var(--bg-hover)'; btn.style.color = active ? '#fff' : 'var(--text-muted)'; }
      if (m === 'soporte')   { btn.style.background = active ? '#7c3aed' : 'var(--bg-hover)'; btn.style.color = active ? '#fff' : 'var(--text-muted)'; }
      if (m === 'garantia')  { btn.style.background = active ? '#0891b2' : 'var(--bg-hover)'; btn.style.color = active ? '#fff' : 'var(--text-muted)'; }
    });
    // Show/hide the modo info strip
    const strip = document.getElementById('modo-activo-strip');
    if (strip) {
      if (_modo === 'normal') { strip.style.display = 'none'; return; }
      strip.style.display = 'flex';
      strip.style.background = _modo === 'soporte' ? 'rgba(124,58,237,0.08)' : 'rgba(8,145,178,0.08)';
      strip.style.borderColor = _modo === 'soporte' ? 'rgba(124,58,237,0.3)' : 'rgba(8,145,178,0.3)';
      strip.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:${_modo==='soporte'?'#7c3aed':'#0891b2'};flex-shrink:0"></span>
        <strong style="font-size:0.75rem">Modo ${_modo==='soporte'?'Soporte':'Garantía'} activo</strong>
        <span style="font-size:0.72rem;color:var(--text-muted)">— los campos inline se guardan al perder el foco</span>`;
    }
  }

  window.IngresoSetModo = _setModo;

  async function render() {
    _loteActivo = await LocalCache.getLoteActivo();
    const el = document.getElementById('view-ingreso');
    if (!el) return;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📝 Ingreso & Diagnóstico</div>
          <div class="page-subtitle">Registra equipos y gestiona flujos de trabajo</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="Views.go('historial')">📋 Historial</button>
          <button class="btn btn-secondary btn-sm" id="btn-sync-base" onclick="IngresoView.syncBase()">🔄 Sincronizar Base</button>
          <button class="btn btn-primary btn-sm" id="btn-nuevo-lote-ingreso">➕ Nuevo Lote</button>
        </div>
      </div>

      <!-- SCAN BAR -->
      <div class="scan-bar">
        <div class="scan-bar-row">
          <div class="form-group" style="margin:0">
            <label class="form-label">
              🔍 CÓDIGO
              <span class="scan-mode-toggle" style="margin-left:8px">
                <button id="scan-btn-auto" class="toggle-btn ${APP_CONFIG.scannerAutoMode?'active':''}" onclick="ScannerBarras.setMode('auto')">⚡ Auto</button>
                <button id="scan-btn-manual" class="toggle-btn ${!APP_CONFIG.scannerAutoMode?'active':''}" onclick="ScannerBarras.setMode('manual')">✋ Manual</button>
              </span>
            </label>
            <input type="text" class="form-control" id="ingreso-codigo"
              placeholder="${APP_CONFIG.scannerAutoMode?'Escanea el código (auto-submit)…':'Escribe el código y presiona Enter…'}"
              autocomplete="off" autofocus>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">📦 LOTE ACTIVO</label>
            <input type="text" class="form-control" id="ingreso-lote-titulo"
              value="${_loteActivo?.titulo || 'Sin lote activo'}" readonly
              style="background:var(--bg-hover);cursor:default">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">⚡ MODO DE INGRESO</label>
            <div style="display:flex;gap:0;border-radius:6px;overflow:hidden;border:1px solid var(--border);height:38px">
              <button id="modo-btn-normal" onclick="IngresoSetModo('normal')"
                style="padding:6px 12px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;transition:all .15s;
                  background:${_modo==='normal'?'var(--text-muted)':'var(--bg-hover)'};color:${_modo==='normal'?'#fff':'var(--text-muted)'}">
                ○ Normal
              </button>
              <button id="modo-btn-soporte" onclick="IngresoSetModo('soporte')"
                style="padding:6px 12px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;transition:all .15s;border-left:1px solid var(--border);
                  background:${_modo==='soporte'?'#7c3aed':'var(--bg-hover)'};color:${_modo==='soporte'?'#fff':'var(--text-muted)'}">
                🔧 Soporte
              </button>
              <button id="modo-btn-garantia" onclick="IngresoSetModo('garantia')"
                style="padding:6px 12px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;transition:all .15s;border-left:1px solid var(--border);
                  background:${_modo==='garantia'?'#0891b2':'var(--bg-hover)'};color:${_modo==='garantia'?'#fff':'var(--text-muted)'}">
                🛡️ Garantía
              </button>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-ingreso-registrar" style="height:38px;align-self:end">⚡ Registrar</button>
          <button class="btn btn-secondary" id="btn-ingreso-limpiar" style="height:38px;align-self:end" title="Limpiar">✕</button>
        </div>
      </div>

      <!-- Strip modo activo -->
      <div id="modo-activo-strip" style="display:${_modo!=='normal'?'flex':'none'};align-items:center;gap:8px;padding:5px 12px;border-radius:var(--radius-sm);border:1px solid;margin-top:4px;margin-bottom:2px;transition:all .2s"></div>

      <!-- Info de sincronización local -->
      <div id="ingreso-sync-info" style="font-size:0.72rem;color:var(--text-muted);padding:4px 0 8px;display:flex;align-items:center;gap:8px"></div>

      <!-- Preview equipo encontrado -->
      <div id="ingreso-preview" style="display:none;margin-bottom:12px"></div>

      <!-- Stats -->
      <div class="stats-grid" id="ingreso-stats">${await _renderStats()}</div>

      <!-- Tabla lote activo -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span style="font-weight:700;font-size:0.85rem">
            📦 ${_loteActivo?.titulo || 'Sin lote activo'}
            ${_loteActivo ? `<span style="color:var(--text-muted);font-weight:400;font-size:0.73rem"> · ${new Date(_loteActivo.fechaCreacion).toLocaleDateString('es-PE')}${_loteActivo.tecnico?' · 👨‍🔧 '+_loteActivo.tecnico:''}</span>` : ''}
          </span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" onclick="ImportExport.exportLote(window._loteActivo,'csv')">⬇️ CSV</button>
            <button class="btn btn-secondary btn-sm" onclick="ImportExport.exportLote(window._loteActivo,'xlsx')">📊 Excel</button>
            <button class="btn btn-danger btn-sm" id="btn-ingreso-vaciar">🗑️ Vaciar Lote</button>
          </div>
        </div>
        <!-- Toggle columnas -->
        <div style="padding:8px 14px;border-bottom:1px solid var(--border)">
          <div class="col-toggle-row" id="ingreso-col-toggles"></div>
        </div>
        <div id="ingreso-tabla"></div>
      </div>
    `;

    window._loteActivo = _loteActivo;
    _buildColToggles();
    _renderTabla();
    _bindEvents();
    ScannerBarras.init('ingreso-codigo', _onScan);
    _renderSyncInfo(); // mostrar info de última sync
  }

  // ── Scan callback ─────────────────────────────────────────────────
  async function _onScan(codigo) {
    if (!_loteActivo) {
      Toast.error('Crea un lote primero');
      _abrirModalNuevoLote();
      return;
    }

    const btn = document.getElementById('btn-ingreso-registrar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }

    try {
      const equipo = await SheetsAPI.findByCodigoOSerie(codigo);
      if (!equipo) {
        Toast.error(`Código o Serie "${codigo}" no encontrado`);
        return;
      }

      // Verificar duplicado
      if (_loteActivo.equipos?.find(e => e.CODIGO === equipo.CODIGO)) {
        Toast.warning(`Código ${codigo} ya registrado en este lote`);
        _showPreview(equipo);
        return;
      }

      const obs = document.getElementById('ingreso-obs')?.value || '';
      const registro = await LocalCache.agregarEquipoALote(_loteActivo.id, equipo, obs);
      _loteActivo = await LocalCache.getLoteActivo();
      window._loteActivo = _loteActivo;

      await AuditTrail.log('CREATE', 'EQUIPO_LOTE', { codigo, lote: _loteActivo.titulo });

      // Sync async
      SyncEngine.enqueue('writeRow', { sheetName: '_Registros', rowData: registro });

      // (ingreso-obs removed — replaced by mode switch)
      _showPreview(equipo);
      // ── Auto-apply sticky repuesto in soporte mode ──────────────────────
      if (_modo === 'soporte' && _stickyRepuesto && registro?._registroId) {
        try {
          const lotes2 = await LocalCache.getLotes();
          for (const l2 of lotes2) {
            const eq2 = l2.equipos?.find(e => e._registroId === registro._registroId);
            if (!eq2) continue;
            if (!eq2._repuestosUsados) eq2._repuestosUsados = [];
            let pn2 = _stickyPN;
            if (!pn2 && window.ModoRapido?.buscarPN) {
              pn2 = await ModoRapido.buscarPN(_stickyRepuesto, eq2.MODELO) || '';
              if (pn2) _saveStickyPN(pn2);
            }
            const nombre2 = _stickyRepuesto + (pn2 ? ' (PN: ' + pn2 + ')' : '');
            if (!eq2._repuestosUsados.find(r => r.repuesto === _stickyRepuesto)) {
              eq2._repuestosUsados.push({ nombre: nombre2, repuesto: _stickyRepuesto, pn: pn2, timestamp: new Date().toISOString() });
            }
            eq2._estadoSoporte  = eq2._estadoSoporte  || 'RECIBIDO';
            eq2._tecnico        = eq2._tecnico         || (_loteActivo?.tecnico || '');
            eq2._lastModified   = new Date().toISOString();
            await LocalCache.updateLote(l2);
            if (pn2 && window.ModoRapido?.guardarPN) await ModoRapido.guardarPN(_stickyRepuesto, eq2.MODELO, pn2);
            _loteActivo = await LocalCache.getLoteActivo();
            window._loteActivo = _loteActivo;
            break;
          }
        } catch(e2) { console.warn('Auto-apply sticky:', e2); }
      }

      _renderTabla();
      _renderStatsInline();
      Toast.success(`✅ ${equipo.MARCA} ${equipo.MODELO}`);
    } catch (err) {
      Toast.error(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '⚡ Registrar'; }
    }
  }

  function _showPreview(equipo) {
    const el = document.getElementById('ingreso-preview');
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = `
      <div class="card" style="border-color:var(--success);background:rgba(34,197,94,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;color:var(--success)">✅ ${equipo.MARCA} ${equipo.MODELO}</div>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('ingreso-preview').style.display='none'">✕</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;font-size:0.78rem">
          ${[['Código',equipo.CODIGO],['Serie',equipo.SERIE],['Tipo',equipo.TIP_EQUIP],['Procesador',equipo.PROCESADOR],['RAM',equipo.RAM],['HD/SSD',equipo.HD_SSD],['Estado',equipo.ESTADO],['Sucursal',equipo.SUCURSAL]]
            .map(([l,v])=>`<div style="background:var(--bg-hover);padding:4px 10px;border-radius:var(--radius-sm);border:1px solid var(--border)"><span style="color:var(--text-muted);font-size:0.65rem;display:block;font-weight:600">${l}</span>${Formatters.safe(v)}</div>`).join('')}
        </div>
      </div>
    `;
  }

  async function _renderStats() {
    const lote = await LocalCache.getLoteActivo();
    const eq = lote?.equipos || [];
    return `
      <div class="stat-card" style="--stat-color:var(--accent)"><div class="stat-label">En Lote</div><div class="stat-value">${eq.length}</div><div class="stat-icon">📦</div></div>
      <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-label">Correctos</div><div class="stat-value">${eq.filter(e=>e.ESTADO==='C').length}</div><div class="stat-icon">✅</div></div>
      <div class="stat-card" style="--stat-color:var(--warning)"><div class="stat-label">En Revisión</div><div class="stat-value">${eq.filter(e=>e.ESTADO==='P').length}</div><div class="stat-icon">🔧</div></div>
      <div class="stat-card" style="--stat-color:var(--danger)"><div class="stat-label">Malogrados</div><div class="stat-value">${eq.filter(e=>e.ESTADO==='M').length}</div><div class="stat-icon">⚠️</div></div>
    `;
  }

  async function _renderStatsInline() {
    const el = document.getElementById('ingreso-stats');
    if (el) el.innerHTML = await _renderStats();
  }

  let _colVis = {};
  function _buildColToggles() {
    _colVis = JSON.parse(localStorage.getItem('inv-col-vis-v2') || 'null') || {};
    APP_CONFIG.columns.forEach(c => { if(_colVis[c.key]===undefined) _colVis[c.key]=c.visible; });
    const row = document.getElementById('ingreso-col-toggles');
    if (!row) return;
    row.innerHTML = APP_CONFIG.columns.map(c=>`
      <span class="col-toggle ${_colVis[c.key]?'active':''}" data-col="${c.key}">${c.label}</span>
    `).join('');
    row.querySelectorAll('.col-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        _colVis[btn.dataset.col] = !_colVis[btn.dataset.col];
        btn.classList.toggle('active', _colVis[btn.dataset.col]);
        localStorage.setItem('inv-col-vis-v2', JSON.stringify(_colVis));
        _renderTabla();
      });
    });
  }

  function _renderTabla() {
    const el = document.getElementById('ingreso-tabla');
    if (!el) return;
    const equipos = _loteActivo?.equipos || [];
    if (!equipos.length) {
      el.innerHTML = `<div style="padding:36px;text-align:center;color:var(--text-muted)"><div style="font-size:2rem">📭</div><div style="margin-top:8px;font-size:0.85rem">Lote vacío. Escanea un equipo.</div></div>`;
      return;
    }

    const visCols = APP_CONFIG.columns.filter(c => _colVis[c.key]);

    const rows = equipos.map((e, i) => {
      const cells = visCols.map(c => {
        if (c.key==='ESTADO') return `<td>${Formatters.estadoBadge(e[c.key])}</td>`;
        return `<td title="${Formatters.safe(e[c.key])}">${Formatters.safe(e[c.key])}</td>`;
      }).join('');
      const fotoCell = EvidenciaFotos.renderFotoCell(e, null);
      const accionesCell = _getAccionesCell(e);
      return `<tr>
        <td style="color:var(--text-muted);font-size:0.7rem">${i+1}</td>
        ${cells}
        <td>${fotoCell}</td>
        ${accionesCell}
      </tr>`;
    }).join('');

    el.innerHTML = `<div style="overflow-x:auto"><table class="data-table">
      <thead><tr><th>#</th>${visCols.map(c=>`<th>${c.label}</th>`).join('')}<th>Evidencia</th><th style="white-space:nowrap">Acciones</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

    // Registrar los registros en un mapa global para que los handlers puedan acceder al objeto completo
    window._ingresoEquiposMap = {};
    equipos.forEach(e => { window._ingresoEquiposMap[e._registroId] = e; });
  }

  window._ingresoQuitarEquipo = async (loteId, regId) => {
    if (!confirm('¿Deseas quitar este equipo del lote? Esta acción no se puede deshacer.')) return;
    await LocalCache.eliminarEquipoDeLote(loteId, regId);
    _loteActivo = await LocalCache.getLoteActivo();
    window._loteActivo = _loteActivo;
    _renderTabla();
    _renderStatsInline();
    Toast.info('Equipo quitado del lote');
  };

  window._ingresoAbrirGarantia = (regId) => {
    const eq = window._ingresoEquiposMap?.[regId];
    if (!eq) { Toast.error('Registro no encontrado'); return; }
    FlujoGarantia.openModal(eq);
  };

  window._ingresoAbrirSoporte = (regId) => {
    const eq = window._ingresoEquiposMap?.[regId];
    if (!eq) { Toast.error('Registro no encontrado'); return; }
    FlujoSoporte.openModal(eq);
  };

  // ── Acciones column según modo ─────────────────────────────────────────
  function _getAccionesCell(eq) {
    if (_modo === 'soporte')  return _accionesSoporte(eq);
    if (_modo === 'garantia') return _accionesGarantia(eq);
    return _accionesNormal(eq);
  }

  function _accionesNormal(eq) {
    return `<td>
      <div style="display:flex;gap:14px;align-items:center;justify-content:center">
        <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s" title="Garantía"
          onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
          onclick="_ingresoAbrirGarantia('${eq._registroId}')">🛡️</button>
        <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s" title="Soporte"
          onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
          onclick="_ingresoAbrirSoporte('${eq._registroId}')">🔩</button>
        <div style="width:1px;height:20px;background:var(--border)"></div>
        <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s;filter:grayscale(100%)" title="Quitar"
          onmouseover="this.style.transform='scale(1.2)';this.style.filter='grayscale(0)'" onmouseout="this.style.transform='scale(1)';this.style.filter='grayscale(100%)'"
          onclick="_ingresoQuitarEquipo('${_loteActivo.id}','${eq._registroId}')">🗑️</button>
      </div>
    </td>`;
  }

  function _accionesSoporte(eq) {
    const tiposR = (APP_CONFIG.catalogos.tiposRepuesto || []);
    const repuestos = eq._repuestosUsados || [];
    // Chips de repuestos existentes
    const chipsHtml = repuestos.map((r, idx) =>
      `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:3px;padding:1px 5px;font-size:0.65rem;white-space:nowrap">
        <strong>${r.repuesto||r.nombre}</strong>${r.pn?' · '+r.pn:''}
        <button onclick="_sopQuitarRepuesto('${eq._registroId}',${idx})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:0.7rem;padding:0;line-height:1">✕</button>
      </span>`
    ).join('');

    return `<td style="min-width:340px">
      <div style="display:flex;flex-direction:column;gap:5px">
        <!-- Chips existentes -->
        ${chipsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:3px">${chipsHtml}</div>` : ''}

        <!-- Fila de nuevo repuesto -->
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap" id="sop-row-${eq._registroId}">
          <select id="sop-rep-${eq._registroId}" class="form-control" style="width:auto;min-width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            onchange="_sopOnRepuestoChange('${eq._registroId}','${(eq.MODELO||'').replace(/'/g,'')}')">
            <option value="">Repuesto…</option>
            ${tiposR.map(t => `<option value="${t}" ${!repuestos.length && t === _stickyRepuesto ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <input type="text" id="sop-pn-${eq._registroId}" class="form-control" placeholder="PN / código" list="pn-list-${eq._registroId}"
            value="${repuestos.length ? '' : (_stickyPN || '')}"
            style="width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            oninput="_sopOnPNInput('${eq._registroId}',this.value)">
          <datalist id="pn-list-${eq._registroId}"></datalist>
          <button onclick="_sopAgregarRepuesto('${eq._registroId}')"
            style="background:#7c3aed;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.7rem;cursor:pointer;height:26px;white-space:nowrap">
            ➕ Añadir
          </button>
          <div style="width:1px;height:20px;background:var(--border);flex-shrink:0"></div>
          <button class="btn btn-sm btn-icon" title="Soporte Avanzado" style="font-size:1.1rem"
            onclick="_ingresoAbrirSoporte('${eq._registroId}')">⚙️</button>
          <button class="btn btn-sm btn-icon" style="font-size:1.1rem;filter:grayscale(100%)" title="Quitar"
            onmouseover="this.style.filter='grayscale(0)'" onmouseout="this.style.filter='grayscale(100%)'"
            onclick="_ingresoQuitarEquipo('${_loteActivo.id}','${eq._registroId}')">🗑️</button>
        </div>
      </div>
    </td>`;
  }

  function _accionesGarantia(eq) {
    const proveedores = APP_CONFIG.catalogos.proveedores || [];
    return `<td style="min-width:340px">
      <div style="display:flex;flex-direction:column;gap:5px">
        ${eq._estadoGarantia ? `<span style="font-size:0.65rem;color:#0891b2;font-weight:600">${eq._estadoGarantia} · ${eq._proveedorGarantia||''}</span>` : ''}
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <select id="gar-prov-${eq._registroId}" class="form-control" style="width:auto;min-width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            onchange="_garGuardar('${eq._registroId}')">
            <option value="">Proveedor…</option>
            ${proveedores.map(p => `<option value="${p}" ${eq._proveedorGarantia===p?'selected':''}>${p}</option>`).join('')}
          </select>
          <input type="text" id="gar-falla-${eq._registroId}" class="form-control" placeholder="Falla…"
            value="${eq._fallaGarantia||''}"
            style="width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            onblur="_garGuardar('${eq._registroId}')">
          <input type="date" id="gar-fecha-${eq._registroId}" class="form-control"
            value="${eq._fechaEnvioGarantia||new Date().toISOString().slice(0,10)}"
            style="width:110px;font-size:0.72rem;padding:3px 6px;height:26px"
            onchange="_garGuardar('${eq._registroId}')">
          <div style="width:1px;height:20px;background:var(--border);flex-shrink:0"></div>
          <button class="btn btn-sm btn-icon" title="Garantía Avanzada" style="font-size:1.1rem"
            onclick="_ingresoAbrirGarantia('${eq._registroId}')">🛡️</button>
          <button class="btn btn-sm btn-icon" style="font-size:1.1rem;filter:grayscale(100%)" title="Quitar"
            onmouseover="this.style.filter='grayscale(0)'" onmouseout="this.style.filter='grayscale(100%)'"
            onclick="_ingresoQuitarEquipo('${_loteActivo.id}','${eq._registroId}')">🗑️</button>
        </div>
      </div>
    </td>`;
  }

  // ── Sticky handlers: save + propagate to all rows in DOM ─────────────────
  window._sopOnRepuestoChange = async (regId, modelo) => {
    const sel = document.getElementById('sop-rep-' + regId);
    if (!sel) return;
    _saveStickyRepuesto(sel.value);

    // Propagate to all OTHER repuesto selects that have NO saved repuestos yet
    document.querySelectorAll('select[id^="sop-rep-"]').forEach(s => {
      if (s.id === 'sop-rep-' + regId) return;
      const rowRegId = s.id.replace('sop-rep-', '');
      const rowEq = window._ingresoEquiposMap?.[rowRegId];
      // Only propagate if this row has NO chips (no repuestos saved yet)
      if (!rowEq?._repuestosUsados?.length) {
        s.value = sel.value;
      }
    });

    // Auto-fill PN from internal DB for this repuesto+modelo
    if (sel.value && modelo && window.ModoRapido?.buscarPN) {
      const pn = await ModoRapido.buscarPN(sel.value, modelo);
      if (pn) {
        _saveStickyPN(pn);
        // Fill this row's PN if empty
        const pnEl = document.getElementById('sop-pn-' + regId);
        if (pnEl && !pnEl.value) pnEl.value = pn;
        // Propagate PN to all empty PN inputs
        document.querySelectorAll('input[id^="sop-pn-"]').forEach(p => {
          if (!p.value) p.value = pn;
        });
      }
    }
  };

  window._sopOnPNInput = (regId, val) => {
    _saveStickyPN(val);
    // Propagate to all other rows that have NO saved repuestos yet
    document.querySelectorAll('input[id^="sop-pn-"]').forEach(p => {
      if (p.id === 'sop-pn-' + regId) return;
      const rowRegId = p.id.replace('sop-pn-', '');
      const rowEq = window._ingresoEquiposMap?.[rowRegId];
      if (!rowEq?._repuestosUsados?.length && !p.value) p.value = val;
    });
  };

  // ── Handlers inline soporte ────────────────────────────────────────────────
  window._sopAgregarRepuesto = async (regId) => {
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
      eq._tecnico = eq._tecnico || (_loteActivo?.tecnico || '');
      eq._lastModified = new Date().toISOString();
      await LocalCache.updateLote(lote);
      // Guardar en DB de PNs si está disponible
      if (pn && window.ModoRapido?.guardarPN) await ModoRapido.guardarPN(repuesto, eq.MODELO, pn);
      _loteActivo = await LocalCache.getLoteActivo();
      window._loteActivo = _loteActivo;
      _renderTabla();
      // Update sticky to the repuesto+PN just used
      if (repuesto) _saveStickyRepuesto(repuesto);
      if (pn)       _saveStickyPN(pn);
      Toast.success(repuesto + (pn ? ' · ' + pn : '') + ' añadido');
      return;
    }
    Toast.error('Equipo no encontrado');
  };

  window._sopQuitarRepuesto = async (regId, idx) => {
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === regId);
      if (!eq) continue;
      eq._repuestosUsados = (eq._repuestosUsados || []).filter((_, i) => i !== idx);
      await LocalCache.updateLote(lote);
      _loteActivo = await LocalCache.getLoteActivo();
      window._loteActivo = _loteActivo;
      _renderTabla();
      return;
    }
  };

  window._sopAutocompletarPN = async (regId, modelo) => {
    if (!window.ModoRapido?.buscarPN) return;
    const sel   = document.getElementById('sop-rep-' + regId);
    const pnEl  = document.getElementById('sop-pn-'  + regId);
    if (!sel || !pnEl || pnEl.value) return;
    const repuesto = sel?.value;
    if (!repuesto) return;
    const pn = await ModoRapido.buscarPN(repuesto, modelo);
    if (pn) { pnEl.value = pn; }
  };

  // ── Handlers inline garantía ───────────────────────────────────────────────
  window._garGuardar = async (regId) => {
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
      eq._tecnico            = eq._tecnico || (_loteActivo?.tecnico || '');
      eq._lastModified       = new Date().toISOString();
      await LocalCache.updateLote(lote);
      // Actualizar referencia local sin re-renderizar
      _loteActivo = await LocalCache.getLoteActivo();
      window._loteActivo = _loteActivo;
      return;
    }
  };

  // ── Sticky handlers exposed globally ───────────────────────────────────────
  window._sopOnRepuestoChange = async (regId, modelo) => {
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
  };

  window._sopOnPNInput = (val) => { _saveStickyPN(val); };

  function _bindEvents() {
    document.getElementById('btn-ingreso-registrar')?.addEventListener('click', () => {
      const codigo = document.getElementById('ingreso-codigo').value.trim();
      if (codigo) _onScan(codigo);
    });
    document.getElementById('btn-ingreso-limpiar')?.addEventListener('click', () => {
      document.getElementById('ingreso-codigo').value = '';
      document.getElementById('ingreso-preview').style.display = 'none';
      document.getElementById('ingreso-codigo').focus();
    });
    document.getElementById('btn-ingreso-vaciar')?.addEventListener('click', async () => {
      if (!_loteActivo) return;
      if (!confirm(`¿Vaciar "${_loteActivo.titulo}"? No se puede deshacer.`)) return;
      _loteActivo.equipos = [];
      await LocalCache.updateLote(_loteActivo);
      window._loteActivo = _loteActivo;
      _renderTabla();
      _renderStatsInline();
      Toast.warning('Lote vaciado');
    });
    document.getElementById('btn-nuevo-lote-ingreso')?.addEventListener('click', _abrirModalNuevoLote);
  }

  function _abrirModalNuevoLote() {
    const lotes = LocalCache.getLotes();
    ModalGenerico.open(`
      <div class="modal-title">📦 Nuevo Lote</div>
      <div class="modal-subtitle">El lote anterior se conserva en el historial</div>
      <div class="form-group">
        <label class="form-label">Título del Lote</label>
        <input type="text" class="form-control" id="nuevo-lote-titulo" placeholder="LOTE 105">
      </div>
      <div class="form-group">
        <label class="form-label">👨‍🔧 Técnico Encargado</label>
        <input type="text" class="form-control" id="nuevo-lote-tecnico" placeholder="Nombre del técnico…" autocomplete="off">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="IngresoView.confirmarNuevoLote()">Crear Lote</button>
      </div>
    `);
    setTimeout(async () => {
      const lotes = await LocalCache.getLotes();
      const inp = document.getElementById('nuevo-lote-titulo');
      if (inp) { inp.value = `LOTE ${101 + lotes.length}`; inp.select(); }
    }, 100);
  }

  async function confirmarNuevoLote() {
    const titulo   = document.getElementById('nuevo-lote-titulo')?.value?.trim();
    const tecnico  = document.getElementById('nuevo-lote-tecnico')?.value?.trim() || '';
    if (!titulo) { Toast.warning('Escribe un título'); return; }
    _loteActivo = await LocalCache.crearLote(titulo, tecnico);
    window._loteActivo = _loteActivo;
    ModalGenerico.close();
    Toast.success(`Lote "${titulo}" creado`);
    render();
  }

  // ── Info de sincronización local ──────────────────────────────────────────
  async function _renderSyncInfo() {
    const el = document.getElementById('ingreso-sync-info');
    if (!el) return;
    try {
      const info = await SheetsAPI.getSyncInfo();
      if (!info.lastSync) {
        el.innerHTML = `<span style="color:var(--warning)">⚠️ Sin base local — presiona 🔄 Sincronizar Base</span>`;
        return;
      }
      const mins = Math.floor((Date.now() - info.lastSync) / 60000);
      const timeStr = mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins/60)}h`;
      const staleColor = info.stale ? 'var(--warning)' : 'var(--success)';
      el.innerHTML = `
        <span style="color:${staleColor}">📦 ${info.count.toLocaleString()} equipos en base local</span>
        <span style="color:var(--text-muted)">·</span>
        <span style="color:${info.stale?'var(--warning)':'var(--text-muted)'}">Última sync: ${timeStr}${info.stale?' · ⚠️ Desactualizado — sincroniza':''}</span>
      `;
    } catch (e) {
      el.innerHTML = `<span style="color:var(--text-muted)">Base local no disponible</span>`;
    }
  }

  // ── Sincronizar base de equipos manualmente ─────────────────────────────────
  async function syncBase() {
    const btn = document.getElementById('btn-sync-base');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sincronizando…'; }
    try {
      const data = await SheetsAPI.syncFromRemote(true);
      Toast.success(`✅ Base actualizada: ${data.length.toLocaleString()} equipos`);
      SheetsAPI.invalidateCache();
      _renderSyncInfo();
    } catch (err) {
      Toast.error('Error al sincronizar: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Sincronizar Base'; }
    }
  }

  return { render, syncBase, confirmarNuevoLote };
})();

window.IngresoView = IngresoView;
