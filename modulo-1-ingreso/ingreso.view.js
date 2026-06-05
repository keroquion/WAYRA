/**
 * modulo-1-ingreso/ingreso.view.js
 * Vista principal Módulo 1: Scan + Grid dinámico + Lote activo.
 * ORQUESTADOR (Refactorizado)
 */

const IngresoView = (() => {
  let _modo = localStorage.getItem('ingreso-modo-v1') || 'normal';

  function _setModo(m) {
    _modo = m;
    localStorage.setItem('ingreso-modo-v1', m);
    _actualizarModoUI();
    IngresoTabla.render();
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
    window._loteActivo = await LocalCache.getLoteActivo();
    const lotes = await LocalCache.getLotes();
    const el = document.getElementById('view-ingreso');
    if (!el) return;

    const lotesCerrados = lotes
      .filter(l => !l.activo)
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
      .slice(0, 3);

    let bannerHtml = '';
    if (window._loteActivo) {
      bannerHtml = `
        <div class="card" style="border-left: 4px solid var(--success); background: rgba(34,197,94,0.06); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">📂</span>
            <div>
              <div style="font-weight: 700; color: var(--success); font-size: 0.9rem;">Lote Activo: ${window._loteActivo.titulo}</div>
              <div style="font-size: 0.76rem; color: var(--text-secondary);">
                Técnico: <strong>${window._loteActivo.tecnico || 'Sin asignar'}</strong> · 
                Equipos: <strong>${window._loteActivo.equipos?.length || 0}</strong> · 
                Creado: <strong>${new Date(window._loteActivo.fechaCreacion).toLocaleDateString('es-PE')}</strong>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="Views.go('historial')">📋 Ver Historial</button>
            <button class="btn btn-danger btn-sm" id="btn-banner-cerrar-lote" style="background: var(--danger); color: #fff;">🔒 Cerrar Lote</button>
          </div>
        </div>
      `;
    } else {
      const shortcuts = lotesCerrados.length > 0 
        ? `<div style="margin-top: 8px; font-size: 0.76rem; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span>Continuar lote anterior:</span>
            ${lotesCerrados.map(l => `
              <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; min-height: 24px; font-size: 0.7rem; font-weight: normal;" onclick="IngresoView.continuarLoteRapido('${l.id}')">
                📦 ${l.titulo}
              </button>
            `).join('')}
           </div>`
        : '';

      bannerHtml = `
        <div class="card" style="border-left: 4px solid var(--warning); background: rgba(245,158,11,0.06); padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 1.4rem;">📭</span>
              <div>
                <div style="font-weight: 700; color: var(--warning); font-size: 0.9rem;">No hay ningún lote activo en curso</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                  Para registrar equipos y diagnosticar, debes iniciar un nuevo lote o continuar uno existente desde el historial.
                </div>
                ${shortcuts}
              </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <button class="btn btn-secondary btn-sm" onclick="Views.go('historial')">📋 Ir al Historial</button>
              <button class="btn btn-primary btn-sm" onclick="IngresoLoteModal.abrir(IngresoView.render)">➕ Nuevo Lote</button>
            </div>
          </div>
        </div>
      `;
    }

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

      ${bannerHtml}

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
              value="${window._loteActivo?.titulo || 'Sin lote activo'}" readonly
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

      <div id="modo-activo-strip" style="display:${_modo!=='normal'?'flex':'none'};align-items:center;gap:8px;padding:5px 12px;border-radius:var(--radius-sm);border:1px solid;margin-top:4px;margin-bottom:2px;transition:all .2s"></div>
      <div id="ingreso-sync-info" style="font-size:0.72rem;color:var(--text-muted);padding:4px 0 8px;display:flex;align-items:center;gap:8px"></div>
      <div id="ingreso-preview" style="display:none;margin-bottom:12px"></div>
      <div class="stats-grid" id="ingreso-stats">${await _renderStats()}</div>

      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span style="font-weight:700;font-size:0.85rem">
            📦 ${window._loteActivo?.titulo || 'Sin lote activo'}
            ${window._loteActivo ? `<span style="color:var(--text-muted);font-weight:400;font-size:0.73rem"> · ${new Date(window._loteActivo.fechaCreacion).toLocaleDateString('es-PE')}${window._loteActivo.tecnico?' · 👨‍🔧 '+window._loteActivo.tecnico:''}</span>` : ''}
          </span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" onclick="ImportExport.exportLote(window._loteActivo,'csv')" ${window._loteActivo ? '' : 'disabled'}>⬇️ CSV</button>
            <button class="btn btn-secondary btn-sm" onclick="ImportExport.exportLote(window._loteActivo,'xlsx')" ${window._loteActivo ? '' : 'disabled'}>📊 Excel</button>
            ${window._loteActivo ? `<button class="btn btn-secondary btn-sm" id="btn-ingreso-cerrar" style="color:var(--danger);border-color:rgba(239,68,68,0.2)">🔒 Cerrar Lote</button>` : ''}
            ${window._loteActivo && window.AuthService && AuthService.canEditLote(window._loteActivo) ? `<button class="btn btn-danger btn-sm" id="btn-ingreso-vaciar">🗑️ Vaciar Lote</button>` : ''}
          </div>
        </div>
        <div style="padding:8px 14px;border-bottom:1px solid var(--border)">
          <div class="col-toggle-row" id="ingreso-col-toggles"></div>
        </div>
        <div id="ingreso-tabla" style="overflow-x:auto"></div>
      </div>
    `;

    IngresoSoporteInline.init();
    IngresoTabla.buildColToggles();
    IngresoTabla.render();
    _bindEvents();
    ScannerBarras.init('ingreso-codigo', _onScan);
    ScannerBarras.setGlobalActive(true);
    _renderSyncInfo();
  }

  async function _onScan(codigo) {
    if (!window._loteActivo) {
      Toast.error('Crea un lote primero');
      IngresoLoteModal.abrir(render);
      return;
    }
    if (window.AuthService && !AuthService.canEditLote(window._loteActivo)) {
      Toast.error('🔒 Este lote es de solo lectura (No eres el propietario).');
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

      if (window._loteActivo.equipos?.find(e => e.CODIGO === equipo.CODIGO)) {
        Toast.warning(`Código ${codigo} ya registrado en este lote`);
        _showPreview(equipo);
        return;
      }

      const obs = document.getElementById('ingreso-obs')?.value || '';
      const registro = await LocalCache.agregarEquipoALote(window._loteActivo.id, equipo, obs);
      window._loteActivo = await LocalCache.getLoteActivo();

      await AuditTrail.log('CREATE', 'EQUIPO_LOTE', { codigo, lote: window._loteActivo.titulo });
      SyncEngine.enqueue('writeRow', { sheetName: '_Registros', rowData: registro });

      _showPreview(equipo);
      IngresoTabla.render();
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

  const quitarEquipo = async (loteId, regId) => {
    if (window.AuthService && !AuthService.canEditLote(window._loteActivo)) { Toast.error('🔒 Este lote es de solo lectura.'); return; }
    if (!confirm('¿Deseas quitar este equipo del lote? Esta acción no se puede deshacer.')) return;
    await LocalCache.eliminarEquipoDeLote(loteId, regId);
    window._loteActivo = await LocalCache.getLoteActivo();
    IngresoTabla.render();
    _renderStatsInline();
    Toast.info('Equipo quitado del lote');
  };

  const abrirGarantia = (regId) => {
    if (window.AuthService && !AuthService.canEditLote(window._loteActivo)) { Toast.error('🔒 Este lote es de solo lectura.'); return; }
    const eq = window._ingresoEquiposMap?.[regId];
    if (!eq) { Toast.error('Registro no encontrado'); return; }
    FlujoGarantia.openModal(eq);
  };

  const abrirSoporte = (regId) => {
    if (window.AuthService && !AuthService.canEditLote(window._loteActivo)) { Toast.error('🔒 Este lote es de solo lectura.'); return; }
    const eq = window._ingresoEquiposMap?.[regId];
    if (!eq) { Toast.error('Registro no encontrado'); return; }
    FlujoSoporte.openModal(eq);
  };

  function _bindEvents() {
    const safeBind = (id, evt, handler) => {
      const el = document.getElementById(id);
      if(el) { el.removeEventListener(evt, handler); el.addEventListener(evt, handler); }
    };
    safeBind('btn-ingreso-registrar', 'click', () => {
      const v = document.getElementById('ingreso-codigo')?.value;
      if (v) _onScan(v);
    });
    safeBind('btn-ingreso-limpiar', 'click', () => {
      const el = document.getElementById('ingreso-codigo');
      if(el){ el.value=''; el.focus(); }
    });
    safeBind('btn-nuevo-lote-ingreso', 'click', () => IngresoLoteModal.abrir(render));
    safeBind('btn-ingreso-cerrar', 'click', () => IngresoLoteModal.cerrarLoteActivo(render));
    safeBind('btn-ingreso-vaciar', 'click', async () => {
      if (!window.AuthService || AuthService.canEditLote(window._loteActivo)) {
        if (!confirm('¿Seguro que deseas eliminar TODOS los equipos de este lote?')) return;
        window._loteActivo.equipos = [];
        await LocalCache.updateLote(window._loteActivo);
        Toast.warning('Lote vaciado');
        render();
      }
    });
  }

  async function _cerrarLoteActivo() {
    if (!window._loteActivo) return;
    if (!confirm(`¿Deseas cerrar el lote "${window._loteActivo.titulo}"? Ya no podrás agregar más equipos a este lote a menos que lo vuelvas a abrir.`)) return;
    window._loteActivo.activo = false;
    await LocalCache.updateLote(window._loteActivo);
    Toast.success(`Lote "${window._loteActivo.titulo}" cerrado`);
    window._loteActivo = null;
    render();
  }

  async function continuarLoteRapido(loteId) {
    const lote = await LocalCache.continuarLote(loteId);
    if (lote) {
      Toast.success(`Lote "${lote.titulo}" reactivado`);
      render();
    } else {
      Toast.error('No se pudo encontrar el lote');
    }
  }

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

  function onLeave() {
    ScannerBarras.setGlobalActive(false);
  }

  return { render, syncBase, onLeave, continuarLoteRapido, refreshStats: _renderStatsInline, quitarEquipo, abrirGarantia, abrirSoporte };
})();

window.IngresoView = IngresoView;
