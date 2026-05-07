/**
 * modulo-0-datos/sheets-api.js
 * Lectura de datos del inventario — OFFLINE-FIRST con IndexedDB.
 *
 * Flujo:
 *   1. fetchAll() → lee de IndexedDB (< 5ms, sin red)
 *   2. syncFromRemote() → descarga de Sheets y guarda en IDB (solo al abrir o manual)
 *   3. findByCodigoOSerie() → busca en el array en memoria (instantáneo)
 *
 * La llamada getRowCount() fue ELIMINADA del flujo de scan.
 * Sync se hace por TTL de 4 horas O al presionar el botón manual.
 */

const SheetsAPI = (() => {
  const MEMORY_TTL  = 5 * 60 * 1000;       // 5 min — caché en memoria
  const REMOTE_TTL  = 4 * 60 * 60 * 1000;  // 4 horas — re-sync remoto
  const IDB_STORE   = 'equipos';
  const CFG_KEY     = 'equipos_last_sync';

  let _cache  = { data: null, ts: 0 };     // RAM — sobrevive mientras la tab está abierta
  let _status = 'disconnected';
  let _syncing = false;                     // evita llamadas paralelas de syncFromRemote

  function init(cfg) { _updateChip('disconnected'); }

  // ── Leer datos (siempre de IDB/memoria, NUNCA de red en scan normal) ───────
  async function fetchAll(force = false) {
    const now = Date.now();

    // 1. Caché en memoria — la más rápida
    if (!force && _cache.data && (now - _cache.ts) < MEMORY_TTL) {
      _updateChip('connected');
      return _cache.data;
    }

    // 2. IndexedDB — < 50ms, sin red
    if (!force) {
      try {
        const idbData   = await LocalCache.getAll(IDB_STORE);
        const lastSync  = await LocalCache.getConfig(CFG_KEY, 0);
        const stale     = (now - lastSync) > REMOTE_TTL;

        if (idbData.length > 0) {
          _cache = { data: idbData, ts: now };
          _updateChip('connected');
          if (stale) {
            // Datos viejos: sincronizar en background sin bloquear el scan
            console.log('[SheetsAPI] Datos en IDB pero viejos (> 4h). Sync en background…');
            syncFromRemote(true).catch(e => console.warn('[SheetsAPI] Background sync error:', e.message));
          }
          return idbData;
        }
      } catch (e) {
        console.warn('[SheetsAPI] Error leyendo IDB:', e.message);
      }
    }

    // 3. Sin datos locales O force=true → descargar de Sheets
    return syncFromRemote(force);
  }

  // ── Sincronizar desde Sheets y guardar en IDB ──────────────────────────────
  async function syncFromRemote(force = false) {
    if (!APP_CONFIG.appsScript.webAppUrl) {
      throw new Error('Configura la URL de Apps Script primero en ⚙️ Configuración');
    }
    if (window.location.protocol === 'file:') {
      throw new Error('Abre la app con Live Server (no desde file://)');
    }
    if (_syncing && !force) return _cache.data || [];
    _syncing = true;
    _updateChip('connecting');

    const sheetName = APP_CONFIG.sheets.sheetName || 'Buscador Historial';

    try {
      const json = await AppsScriptBridge.readSheet(sheetName, '');
      const rows = json.values || [];
      if (rows.length === 0) { _syncing = false; return []; }

      const headers = rows[0] || [];
      const data = rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((h, i) => {
          const key = h.replace(/[.\s/]/g, '_').toUpperCase();
          obj[key] = (row[i] || '').toString().trim();
        });
        // _id requerido por el keyPath del store 'equipos'
        obj._id = obj.CODIGO || obj.SERIE || `row_${index + 2}`;
        return obj;
      });

      // Guardar en IndexedDB (reemplazar todo)
      try {
        await LocalCache.clear(IDB_STORE);
        // Insertar en batches para no bloquear el hilo
        const BATCH = 200;
        for (let i = 0; i < data.length; i += BATCH) {
          const batch = data.slice(i, i + BATCH);
          await Promise.all(batch.map(eq => LocalCache.put(IDB_STORE, eq)));
        }
        await LocalCache.setConfig(CFG_KEY, Date.now());
        console.log(`✅ [SheetsAPI] ${data.length} equipos guardados en IndexedDB`);
      } catch (e) {
        console.warn('[SheetsAPI] Error guardando en IDB:', e.message);
      }

      _cache = { data, ts: Date.now() };
      _status = 'connected';
      _updateChip('connected');
      _syncing = false;
      return data;

    } catch (err) {
      _syncing = false;
      _updateChip('error');
      throw err;
    }
  }

  // ── Búsqueda por código o serie ────────────────────────────────────────────
  async function findByCodigoOSerie(codigo) {
    const data = await fetchAll();
    const q = codigo.toString().trim().toUpperCase();
    return data.find(r =>
      (r.CODIGO || '').toUpperCase() === q ||
      (r.SERIE  || '').toUpperCase() === q
    ) || null;
  }

  // ── Búsqueda libre ─────────────────────────────────────────────────────────
  async function search(q) {
    const data = await fetchAll();
    if (!q) return data;
    const ql = q.toLowerCase().trim();
    return data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(ql)));
  }

  // ── Info de sincronización para mostrar en UI ──────────────────────────────
  async function getSyncInfo() {
    const lastSync = await LocalCache.getConfig(CFG_KEY, 0);
    const count    = _cache.data?.length || (await LocalCache.getAll(IDB_STORE)).length;
    return { lastSync, count, stale: lastSync && (Date.now() - lastSync) > REMOTE_TTL };
  }

  function invalidateCache() {
    _cache = { data: null, ts: 0 };
  }

  function _updateChip(state) {
    _status = state;
    const chip = document.getElementById('sheets-status-chip');
    if (!chip) return;
    const labels = {
      connected:    '✅ Base Local',
      disconnected: '🔗 Conectar',
      connecting:   '⏳ Sincronizando…',
      error:        '❌ Error',
    };
    chip.className = `sheets-status-chip ${state}`;
    chip.innerHTML = `<span class="dot"></span>${labels[state] || state}`;
  }

  return {
    init, fetchAll, syncFromRemote,
    findByCodigoOSerie, search,
    invalidateCache, getSyncInfo,
    getStatus: () => _status,
  };
})();

window.SheetsAPI = SheetsAPI;
