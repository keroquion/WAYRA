/**
 * modulo-0-datos/local-cache.js
 * IndexedDB wrapper — reemplaza localStorage para datos de negocio.
 * Stores: 'equipos', 'lotes', 'audit', 'sync_queue', 'config', 'catalogos'
 */

const LocalCache = (() => {
  const DB_NAME = 'inventario-pro-v2';
  const DB_VERSION = 1;
  let _db = null;
  let _syncTimer = null;

  const STORES = {
    equipos:    { keyPath: '_id' },
    lotes:      { keyPath: 'id' },
    audit:      { keyPath: 'id', autoIncrement: true },
    sync_queue: { keyPath: 'id', autoIncrement: true },
    config:     { keyPath: 'key' },
    catalogos:  { keyPath: 'key' },
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
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
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

  async function crearLote(titulo) {
    const lotes = await getLotes();
    // Desactivar anteriores
    for (const l of lotes) { if(l.activo) { l.activo=false; await put('lotes', l); } }
    const nuevo = {
      id: `lote_${Date.now()}`,
      titulo: titulo || `LOTE ${101 + lotes.length}`,
      fechaCreacion: new Date().toISOString(),
      activo: true,
      equipos: [],
    };
    await put('lotes', nuevo);
    _syncLotesRemoto();
    return nuevo;
  }

  async function updateLote(lote) {
    await put('lotes', lote);
    _syncLotesRemoto();
  }

  async function deleteLote(loteId) {
    await del('lotes', loteId);
    const lotes = await getLotes();
    if (lotes.length > 0 && !lotes.find(l=>l.activo)) {
      lotes[0].activo = true;
      await put('lotes', lotes[0]);
    }
    _syncLotesRemoto();
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
    await put('lotes', lote);
    _syncLotesRemoto();
    return registro;
  }

  async function eliminarEquipoDeLote(loteId, registroId) {
    const lotes = await getLotes();
    const lote = lotes.find(l=>l.id===loteId);
    if (!lote) return;
    lote.equipos = lote.equipos.filter(e=>e._registroId!==registroId);
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
        console.log('✅ Lotes sincronizados a Sheets (' + lotes.length + ')');
      } catch (err) {
        console.warn('[LocalCache] Error sincronizando lotes:', err.message);
      }
    }, 2000); // esperar 2s para agrupar cambios rápidos
  }

  // ── CARGAR LOTES DESDE REMOTO ────────────────────────────────────
  async function loadLotesFromRemote() {
    if (!APP_CONFIG.appsScript.webAppUrl) return { added: 0, total: 0 };
    try {
      const result = await AppsScriptBridge.loadLotes();
      const remoteLotes = result.lotes || [];
      if (remoteLotes.length === 0) return { added: 0, total: 0 };

      const localLotes = await getLotes();

      // Si no hay lotes locales, simplemente cargar los remotos
      if (localLotes.length === 0) {
        for (const lote of remoteLotes) {
          await put('lotes', lote);
        }
        console.log('✅ Cargados ' + remoteLotes.length + ' lotes desde Sheets');
        return { added: remoteLotes.length, total: remoteLotes.length };
      }

      // Merge: remotos que no existen localmente se agregan
      const localIds = new Set(localLotes.map(l => l.id));
      let added = 0;
      for (const remoteLote of remoteLotes) {
        if (!localIds.has(remoteLote.id)) {
          await put('lotes', remoteLote);
          added++;
        } else {
          // Si existe en ambos, el que tenga más equipos gana
          const local = localLotes.find(l => l.id === remoteLote.id);
          if (local && remoteLote.equipos.length > local.equipos.length) {
            await put('lotes', remoteLote);
            added++;
          }
        }
      }
      if (added > 0) console.log('✅ Mergeados ' + added + ' lotes desde Sheets');
      return { added, total: remoteLotes.length };
    } catch (err) {
      console.warn('[LocalCache] Error cargando lotes remotos:', err.message);
      throw err;
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
    getLotes, getLoteActivo, crearLote, updateLote, deleteLote,
    agregarEquipoALote, eliminarEquipoDeLote,
    enqueue, getQueue, removeFromQueue,
    addAudit, getAudit,
    exportBackup,
    loadLotesFromRemote,
  };
})();

window.LocalCache = LocalCache;
// Alias para compatibilidad con código v1
window.LocalDB = LocalCache;
