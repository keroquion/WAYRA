/**
 * modulo-0-datos/local-cache.js
 * IndexedDB wrapper — reemplaza localStorage para datos de negocio.
 * Stores: 'equipos', 'lotes', 'audit', 'sync_queue', 'config', 'catalogos'
 */

const LocalCache = (() => {
  const DB_NAME = 'inventario-pro-v2';
  const DB_VERSION = 2;  // v2: added repuestos_db store
  let _db = null;
  let _syncTimer = null;

  const STORES = {
    equipos:      { keyPath: '_id' },
    lotes:        { keyPath: 'id' },
    audit:        { keyPath: 'id', autoIncrement: true },
    sync_queue:   { keyPath: 'id', autoIncrement: true },
    config:       { keyPath: 'key' },
    catalogos:    { keyPath: 'key' },
    repuestos_db: { keyPath: 'key' },   // DB interna: repuesto+modelo → PN
  };

  // ── Inicializar DB ───────────────────────────────────────────────
  async function init() {
    if (_db) return _db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        Object.entries(STORES).forEach(([name, opts]) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, opts);
          }
        });
      };
      req.onsuccess = (e) => { 
        _db = e.target.result; 
        
        // MIGRACIÓN MULTIUSUARIO: Asignar lotes antiguos a admin
        try {
          const t = _db.transaction('lotes', 'readwrite');
          const s = t.objectStore('lotes');
          const reqAll = s.getAll();
          reqAll.onsuccess = () => {
            const lotes = reqAll.result;
            let mods = false;
            for (const l of lotes) {
              if (!l._ownerId) {
                l._ownerId = 'admin';
                s.put(l);
                mods = true;
              }
            }
            if (mods) console.log('[LocalCache] ✅ Migrados lotes antiguos a owner: admin');
          };
        } catch(err) { console.warn(err); }

        resolve(_db); 
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ── TX helper ───────────────────────────────────────────────────
  async function tx(store, mode, fn) {
    const db = await init();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const req = fn(s);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  // ── Generic CRUD ─────────────────────────────────────────────────
  async function getAll(store) {
    const db = await init();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, 'readonly');
      const req = t.objectStore(store).getAll();
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  async function get(store, key) {
    return tx(store, 'readonly', s => s.get(key));
  }

  async function put(store, value) {
    return tx(store, 'readwrite', s => s.put(value));
  }

  async function del(store, key) {
    return tx(store, 'readwrite', s => s.delete(key));
  }

  async function clear(store) {
    return tx(store, 'readwrite', s => s.clear());
  }

  // ── CONFIG helpers ───────────────────────────────────────────────
  async function getConfig(key, defaultVal = null) {
    try {
      const r = await get('config', key);
      return r ? r.value : defaultVal;
    } catch { return defaultVal; }
  }

  async function setConfig(key, value) {
    await put('config', { key, value });
  }

  // ── CATÁLOGOS ────────────────────────────────────────────────────
  async function getCatalogos() {
    const rows = await getAll('catalogos');
    const result = { ...APP_CONFIG.catalogos };
    rows.forEach(r => { result[r.key] = r.value; });
    return result;
  }

  async function setCatalogo(key, value) {
    await put('catalogos', { key, value });
    APP_CONFIG.catalogos[key] = value;
  }

  // ── LOTES ────────────────────────────────────────────────────────
  async function getLotes() { return getAll('lotes'); }

  async function getLoteActivo() {
    const lotes = await getLotes();
    return lotes.find(l => l.activo) || null;
  }

  async function crearLote(titulo, tecnico) {
    const lotes = await getLotes();
    // Desactivar anteriores
    for (const l of lotes) { if(l.activo) { l.activo=false; await put('lotes', l); } }
    const nuevo = {
      id: `lote_${Date.now()}`,
      titulo: titulo || `LOTE ${101 + lotes.length}`,
      tecnico: tecnico || '',
      _ownerId: (window.AuthService && AuthService.getUsuarioActual()) ? AuthService.getUsuarioActual().username : 'admin',
      fechaCreacion: new Date().toISOString(),
      activo: true,
      equipos: [],
      synced: false,
    };
    await put('lotes', nuevo);
    _syncLotesRemoto();
    return nuevo;
  }

  async function updateLote(lote) {
    lote.synced = false;
    await put('lotes', lote);
    _syncLotesRemoto();
  }

  async function deleteLote(loteId) {
    await del('lotes', loteId);

    // Registrar ID del lote eliminado localmente para evitar re-importación rápida
    let deletedIds = await getConfig('deleted_lote_ids', []);
    if (!deletedIds.includes(loteId)) {
      deletedIds.push(loteId);
      await setConfig('deleted_lote_ids', deletedIds);
    }

    // Eliminado: auto-activar el primer lote si no hay activo
    // (A petición del usuario, si se borra el activo no debe abrirse otro automáticamente)
    // Sincronizar inmediatamente
    await syncLotesRemotoInmediato();
  }

  async function continuarLote(loteId) {
    const lotes = await getLotes();
    let targetLote = null;
    for (const l of lotes) {
      if (l.id === loteId) {
        l.activo = true;
        l.synced = false;
        await put('lotes', l);
        targetLote = l;
      } else if (l.activo) {
        l.activo = false;
        l.synced = false;
        await put('lotes', l);
      }
    }
    _syncLotesRemoto();
    return targetLote;
  }

  async function agregarEquipoALote(loteId, equipo, obsPersonal='') {
    const lotes = await getLotes();
    const lote = lotes.find(l=>l.id===loteId);
    if (!lote) return null;
    const registro = {
      ...equipo,
      _obsPersonal: obsPersonal,
      _timestamp: new Date().toISOString(),
      _registroId: `reg_${Date.now()}`,
      _fotos: [],
    };
    lote.equipos.unshift(registro);
    lote.synced = false;
    await put('lotes', lote);
    _syncLotesRemoto();
    return registro;
  }

  async function eliminarEquipoDeLote(loteId, registroId) {
    const lotes = await getLotes();
    const lote = lotes.find(l=>l.id===loteId);
    if (!lote) return;
    lote.equipos = lote.equipos.filter(e=>e._registroId!==registroId);
    lote.synced = false;
    await put('lotes', lote);
    _syncLotesRemoto();
  }

  // ── SYNC LOTES A REMOTO (debounced) ──────────────────────────────
  function _syncLotesRemoto() {
    if (!APP_CONFIG.appsScript.webAppUrl) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(async () => {
      try {
        const lotes = await getLotes();
        await AppsScriptBridge.saveLotes(lotes);
        // Marcar los lotes como sincronizados localmente
        for (const l of lotes) {
          if (!l.synced) {
            l.synced = true;
            await put('lotes', l);
          }
        }
        // Eliminado: await setConfig('deleted_lote_ids', []); // NO LIMPIAR, para evitar que lotes borrados vuelvan de Sheets
        console.log('✅ Lotes sincronizados a Sheets (' + lotes.length + ')');
      } catch (err) {
        console.warn('[LocalCache] Error sincronizando lotes:', err.message);
      }
    }, 2000); // esperar 2s para agrupar cambios rápidos
  }

  // ── SYNC LOTES A REMOTO INMEDIATO ────────────────────────────────
  async function syncLotesRemotoInmediato() {
    if (!APP_CONFIG.appsScript.webAppUrl) return;
    clearTimeout(_syncTimer);
    try {
      const lotes = await getLotes();
      await AppsScriptBridge.saveLotes(lotes);
      // Marcar los lotes como sincronizados localmente
      for (const l of lotes) {
        if (!l.synced) {
          l.synced = true;
          await put('lotes', l);
        }
      }
      // Eliminado: await setConfig('deleted_lote_ids', []); // NO LIMPIAR
      console.log('✅ Lotes sincronizados a Sheets inmediatamente (' + lotes.length + ')');
    } catch (err) {
      console.warn('[LocalCache] Error sincronizando lotes inmediatamente:', err.message);
    }
  }

  // ── CARGAR LOTES DESDE REMOTO ────────────────────────────────────
  // SHEETS = FUENTE DE VERDAD.
  // Al cargar, reemplazamos el estado local con exactamente lo que hay en Sheets,
  // respetando solo deleted_lote_ids (lotes que se eliminaron explícitamente en este dispositivo).
  // Esto evita que dispositivos con datos viejos (teléfono, otra PC) resuciten lotes borrados.
  async function loadLotesFromRemote() {
    if (!APP_CONFIG.appsScript.webAppUrl) return { added: 0, total: 0 };
    try {
      const result = await AppsScriptBridge.loadLotes();
      const remoteLotes = (result.lotes || []).map(l => ({ ...l, synced: true }));
      const deletedIds  = await getConfig('deleted_lote_ids', []);

      // Filtrar: ignorar cualquier lote que fue eliminado explícitamente en este dispositivo
      const lotesValidos = remoteLotes.filter(l => !deletedIds.includes(l.id));

      // ── Reemplazar el store 'lotes' COMPLETO con los remotos válidos ──
      // Así no quedan fantasmas de sesiones antiguas en ningún dispositivo.
      await clear('lotes');
      for (const lote of lotesValidos) {
        await put('lotes', lote);
      }

      await syncCatalogTiposFromLotes(lotesValidos);

      console.log(`✅ Lotes sincronizados desde Sheets: ${lotesValidos.length} activos (${deletedIds.length} ignorados por borrado local)`);
      return { added: lotesValidos.length, total: remoteLotes.length };
    } catch (err) {
      console.warn('[LocalCache] Error cargando lotes remotos:', err.message);
      throw err;
    }
  }

  // ── EXTRACT REPUESTOS FROM LOTES ─────────────────────────────────
  async function syncCatalogTiposFromLotes(lotes) {
    if (!lotes) lotes = await getLotes();
    const currentTipos = new Set(APP_CONFIG.catalogos?.tiposRepuesto || []);
    let changed = false;
    for (const lote of lotes) {
      for (const eq of (lote.equipos || [])) {
        for (const r of (eq._repuestosUsados || [])) {
          if (r.repuesto && !currentTipos.has(r.repuesto)) {
            currentTipos.add(r.repuesto);
            changed = true;
          }
        }
      }
    }
    if (changed) {
      const arr = [...currentTipos].sort((a,b) => a.localeCompare(b));
      APP_CONFIG.catalogos.tiposRepuesto = arr;
      try { await setCatalogo('tiposRepuesto', arr); } catch {}
      console.log('[LocalCache] 🔄 Catálogo de tipos de repuesto reconstruido desde Lotes');
    }
  }

  // ── SYNC QUEUE ───────────────────────────────────────────────────
  async function enqueue(operation) {
    const db = await init();
    return new Promise((resolve, reject) => {
      const t = db.transaction('sync_queue', 'readwrite');
      const req = t.objectStore('sync_queue').add({
        ...operation,
        timestamp: new Date().toISOString(),
        retries: 0,
      });
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function getQueue()        { return getAll('sync_queue'); }
  async function removeFromQueue(id) { return del('sync_queue', id); }

  // ── AUDIT ────────────────────────────────────────────────────────
  async function addAudit(entry) {
    const db = await init();
    return new Promise((resolve, reject) => {
      const t = db.transaction('audit', 'readwrite');
      const req = t.objectStore('audit').add({
        ...entry,
        timestamp: new Date().toISOString(),
      });
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function getAudit() { return getAll('audit'); }

  // ── EXPORT JSON backup ────────────────────────────────────────────
  async function exportBackup() {
    const [lotes, audit, cfg] = await Promise.all([getLotes(), getAudit(), getAll('config')]);
    const blob = new Blob([JSON.stringify({lotes,audit,config:cfg,exportedAt:new Date().toISOString()},null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`inv-pro-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return {
    init, getAll, get, put, del, clear,
    getConfig, setConfig,
    getCatalogos, setCatalogo,
    getLotes, getLoteActivo, crearLote, updateLote, deleteLote, continuarLote,
    agregarEquipoALote, eliminarEquipoDeLote,
    enqueue, getQueue, removeFromQueue,
    addAudit, getAudit,
    exportBackup,
    loadLotesFromRemote,
    syncLotesRemotoInmediato,
    syncCatalogTiposFromLotes,
  };
})();

window.LocalCache = LocalCache;
// Alias para compatibilidad con código v1
window.LocalDB = LocalCache;

// Utilidad de emergencia para depurar lotes "fantasma" que se quedan pegados
// Ahora usa el enfoque: Sheets = fuente de verdad. Borra local y recarga desde remoto.
window.depurarLotesBugeados = async () => {
  if (!confirm('⚠️ Esto limpiará los lotes locales y recargará solo lo que hay en Google Sheets.\n\n¿Continuar?')) return;
  try {
    // 1. Borrar TODO el store de lotes local
    await LocalCache.clear('lotes');
    console.log('[Depurar] 🗑️ Store de lotes local borrado');

    // 2. Recargar desde Sheets (fuente de verdad)
    if (APP_CONFIG.appsScript.webAppUrl) {
      const stats = await LocalCache.loadLotesFromRemote();
      console.log(`[Depurar] ✅ Recargados ${stats.added} lotes desde Sheets`);
      alert(`✅ Limpieza completa.\n${stats.added} lote(s) cargado(s) desde Google Sheets.\n\nLa página se recargará.`);
    } else {
      alert('✅ Lotes locales limpiados.\n\nNota: No hay URL de Sheets configurada. No se recargaron lotes remotos.');
    }
    location.reload();
  } catch (err) {
    alert('❌ Error durante depuración: ' + err.message);
    console.error('[Depurar]', err);
  }
};

