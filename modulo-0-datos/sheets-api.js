/**
 * modulo-0-datos/sheets-api.js
 * Lectura directa de Google Sheets (solo lectura, no requiere Apps Script).
 * Para escritura, usar AppsScriptBridge.
 */

const SheetsAPI = (() => {
  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
  let _cfg = null;
  let _status = 'disconnected';
  let _cache = { data: null, ts: 0 };
  const MEMORY_TTL = 5 * 60 * 1000; // 5 minutes

  function init(cfg) { _cfg = cfg; _updateChip('disconnected'); }

  async function fetchAll(force = false) {
    if (!APP_CONFIG.appsScript.webAppUrl) throw new Error('Configura la URL de Apps Script primero en Configuración');
    if (window.location.protocol === 'file:') throw new Error('No se puede conectar desde un archivo local (file://). Abre la app con Live Server.');
    
    const now = Date.now();
    if (!force && _cache.data && (now - _cache.ts) < MEMORY_TTL) {
      _status = 'connected';
      _updateChip('connected');
      return _cache.data;
    }

    _updateChip('connecting');
    const sheetName = APP_CONFIG.sheets.sheetName || 'Buscador Historial';
    
    try {
      // 1. Intentar cargar desde caché local (IndexedDB/localStorage)
      let localData = null;
      let localRowCount = 0;
      try {
        const cachedStr = localStorage.getItem('inv-pro-full-data');
        const countStr = localStorage.getItem('inv-pro-row-count');
        if (cachedStr && countStr) {
          localData = JSON.parse(cachedStr);
          localRowCount = parseInt(countStr, 10);
        }
      } catch (e) { console.warn('Cache invalida', e); }

      // 2. Verificar si hubo cambios en Sheets (rápido)
      if (!force && localData && localData.length > 0) {
        try {
          const remoteStats = await AppsScriptBridge.getRowCount(sheetName);
          if (remoteStats.rowCount === localRowCount) {
            _cache = { data: localData, ts: Date.now() };
            _status = 'connected';
            _updateChip('connected');
            console.log('✅ Cargado desde caché local (Filas coinciden: ' + localRowCount + ')');
            return localData;
          }
          console.log(`⚠️ Filas cambiaron (Local: ${localRowCount}, Remoto: ${remoteStats.rowCount}). Descargando todo...`);
        } catch (e) { console.warn('Error verificando filas, descargando...', e); }
      }

      // 3. Descargar todo
      const json = await AppsScriptBridge.readSheet(sheetName, '');
      const rows = json.values || [];
      if (rows.length === 0) return [];

      const headers = rows[0] || [];
      const data = rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((h,i) => {
          const key = h.replace(/[.\s/]/g,'_').toUpperCase();
          obj[key] = (row[i]||'').toString().trim();
        });
        return obj;
      });

      _cache = { data, ts: Date.now() };
      _status = 'connected';
      _updateChip('connected');
      
      // Guardar en caché
      try {
        localStorage.setItem('inv-pro-full-data', JSON.stringify(data));
        localStorage.setItem('inv-pro-row-count', rows.length.toString());
      } catch (e) { console.warn('No se pudo guardar caché', e); }

      return data;
    } catch (err) {
      _status = 'error';
      _updateChip('error');
      throw err;
    }
  }

  async function findByCodigoOSerie(codigo) {
    const data = await fetchAll();
    const q = codigo.toString().trim().toUpperCase();
    return data.find(r => (r.CODIGO||'').toUpperCase() === q || (r.SERIE||'').toUpperCase() === q) || null;
  }

  async function search(q) {
    const data = await fetchAll();
    if (!q) return data;
    const ql = q.toLowerCase().trim();
    return data.filter(r => Object.values(r).some(v => v.toLowerCase().includes(ql)));
  }

  function invalidateCache() { _cache = { data: null, ts: 0 }; }

  function _updateChip(state) {
    _status = state;
    const chip = document.getElementById('sheets-status-chip');
    if (!chip) return;
    const labels = { connected:'✅ Google Sheets', disconnected:'🔗 Conectar', connecting:'⏳ Cargando…', error:'❌ Error' };
    chip.className = `sheets-status-chip ${state}`;
    chip.innerHTML = `<span class="dot"></span>${labels[state]||state}`;
  }

  return { init, fetchAll, findByCodigoOSerie, search, invalidateCache, getStatus: () => _status };
})();

window.SheetsAPI = SheetsAPI;
