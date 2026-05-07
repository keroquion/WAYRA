/**
 * modulo-1-ingreso/ingreso.view.js
 * Vista principal Módulo 1: Scan + Grid dinámico + Lote activo.
 */

const IngresoView = (() => {
  let _loteActivo = null;

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
            <label class="form-label">💬 MI OBSERVACIÓN</label>
            <input type="text" class="form-control" id="ingreso-obs" placeholder="Observación personal…">
          </div>
          <button class="btn btn-primary" id="btn-ingreso-registrar" style="height:38px;align-self:end">⚡ Registrar</button>
          <button class="btn btn-secondary" id="btn-ingreso-limpiar" style="height:38px;align-self:end" title="Limpiar">✕</button>
        </div>
      </div>

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
            ${_loteActivo ? `<span style="color:var(--text-muted);font-weight:400;font-size:0.73rem"> · ${new Date(_loteActivo.fechaCreacion).toLocaleDateString('es-PE')}</span>` : ''}
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

      document.getElementById('ingreso-obs').value = '';
      _showPreview(equipo);
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
      return `<tr>
        <td style="color:var(--text-muted);font-size:0.7rem">${i+1}</td>
        ${cells}
        <td>${fotoCell}</td>
        <td>
          <div style="display:flex;gap:18px;align-items:center;justify-content:center">
            <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s" title="Garantía"
              onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
              onclick="_ingresoAbrirGarantia('${e._registroId}')">🛡️</button>
            <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s" title="Soporte"
              onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
              onclick="_ingresoAbrirSoporte('${e._registroId}')">🔩</button>
            <div style="width:1px;height:20px;background:var(--border)"></div>
            <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s;filter:grayscale(100%)" title="Quitar del lote"
              onmouseover="this.style.transform='scale(1.2)';this.style.filter='grayscale(0)'" onmouseout="this.style.transform='scale(1)';this.style.filter='grayscale(100%)'"
              onclick="_ingresoQuitarEquipo('${_loteActivo.id}','${e._registroId}')">🗑️</button>
          </div>
        </td>
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

  function _bindEvents() {
    document.getElementById('btn-ingreso-registrar')?.addEventListener('click', () => {
      const codigo = document.getElementById('ingreso-codigo').value.trim();
      if (codigo) _onScan(codigo);
    });
    document.getElementById('btn-ingreso-limpiar')?.addEventListener('click', () => {
      document.getElementById('ingreso-codigo').value = '';
      document.getElementById('ingreso-obs').value = '';
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
      <div class="modal-title">➕ Nuevo Lote</div>
      <div class="modal-subtitle">El lote anterior se conserva en el historial</div>
      <div class="form-group">
        <label class="form-label">Título del Lote</label>
        <input type="text" class="form-control" id="nuevo-lote-titulo" placeholder="LOTE 105">
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
    const titulo = document.getElementById('nuevo-lote-titulo')?.value?.trim();
    if (!titulo) { Toast.warning('Escribe un título'); return; }
    _loteActivo = await LocalCache.crearLote(titulo);
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
