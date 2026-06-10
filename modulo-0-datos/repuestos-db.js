/**
 * modulo-0-datos/repuestos-db.js — Inventario Pro v3
 * Base de datos de Repuestos y Part Numbers (PN).
 *
 * ARQUITECTURA DE LA DB:
 *   Memory Map (O(1)) ←→ IndexedDB (offline) ←→ Sheets _RepuestosDB (compartida)
 */

const RepuestosDB = (() => {

  let _memMap = new Map(); // key="repuesto|modelo_norm" → { pn, usos, modelos, repuesto }
  let _syncTimer = null;
  let _loaded = false;

  const _BRAND_PREFIXES = /\b(hp|dell|lenovo|asus|acer|toshiba|samsung|lg|msi|fujitsu|sony|panasonic|huawei|microsoft|apple|mac)\b/gi;

  function _norm(str) {
    return (str || '')
      .toLowerCase()
      .replace(_BRAND_PREFIXES, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  function _makeKey(repuesto, modelo) {
    return (repuesto || '') + '|' + _norm(modelo);
  }

  async function _syncCatalogTipos() {
    const tiposDB = new Set();
    for (const entry of _memMap.values()) {
      if (entry.repuesto) tiposDB.add(entry.repuesto);
    }
    const currentTipos = new Set(APP_CONFIG.catalogos?.tiposRepuesto || []);
    let changed = false;
    for (const t of tiposDB) {
      if (!currentTipos.has(t)) {
        currentTipos.add(t);
        changed = true;
      }
    }
    if (changed) {
      const arr = [...currentTipos].sort((a,b) => a.localeCompare(b));
      APP_CONFIG.catalogos.tiposRepuesto = arr;
      try { await LocalCache.setCatalogo('tiposRepuesto', arr); } catch {}
      console.log(`[RepuestosDB] 🔄 Catálogo de tipos de repuesto actualizado automáticamente`);
    }
  }

  async function loadFromRemote() {
    if (!APP_CONFIG.appsScript.webAppUrl) return;
    try {
      const res = await AppsScriptBridge.loadRepuestosDB();
      const entries = res.entries || [];
      for (const entry of entries) {
        await LocalCache.put('repuestos_db', entry);
        _memMap.set(entry.key, entry);
      }
      _loaded = true;
      await _syncCatalogTipos();
      console.log(`[RepuestosDB] ✅ Cargados ${entries.length} entradas desde Sheets`);
    } catch (e) {
      console.warn('[RepuestosDB] Error cargando desde Sheets:', e.message);
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
      await _syncCatalogTipos();
      console.log(`[RepuestosDB] 📦 ${_memMap.size} entradas cargadas desde IDB local`);
    } catch (e) {
      console.warn('[RepuestosDB] Error cargando IDB:', e.message);
    }
  }

  async function guardarPN(repuesto, modelo, pn) {
    if (!repuesto || !modelo) return;
    const key = _makeKey(repuesto, modelo);

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

    try { await LocalCache.put('repuestos_db', entry); } catch {}

    if (repuesto && !(APP_CONFIG.catalogos?.tiposRepuesto || []).includes(repuesto)) {
      await _syncCatalogTipos();
    }

    _scheduleSyncToSheets();
    console.log(`[RepuestosDB] 💾 ${repuesto} + ${modelo}${pn?' → PN: '+pn:' (sin PN)'}`);
  }

  function buscarPN(repuesto, modelo) {
    if (!repuesto || !modelo) return null;
    const keyExact = _makeKey(repuesto, modelo);
    const modeloNorm = _norm(modelo);

    const exact = _memMap.get(keyExact);
    if (exact?.pn) return exact.pn;

    let bestPn = null;
    let bestUsos = 0;
    for (const [k, entry] of _memMap) {
      if (entry.repuesto !== repuesto) continue;
      const entryNorm = k.split('|')[1] || '';
      const isSimilar = entryNorm === modeloNorm ||
        (entryNorm.length > 4 && modeloNorm.includes(entryNorm)) ||
        (modeloNorm.length > 4 && entryNorm.includes(modeloNorm));
      if (!isSimilar) continue;
      for (const m of (entry.modelos || [])) {
        if (m.pn && m.usos > bestUsos) { bestPn = m.pn; bestUsos = m.usos; }
      }
      if (!bestPn && entry.pn) bestPn = entry.pn;
    }
    return bestPn || null;
  }

  function getSugerenciasPN(repuesto) {
    if (!repuesto) return [];
    const pns = new Set();
    for (const [, entry] of _memMap) {
      if (entry.repuesto !== repuesto) continue;
      for (const m of (entry.modelos || [])) { if (m.pn) pns.add(m.pn); }
    }
    return [...pns];
  }

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

  function getAll() {
    return [..._memMap.values()].sort((a, b) =>
      (a.repuesto + a.key).localeCompare(b.repuesto + b.key)
    );
  }

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

  return {
    loadFromRemote, guardarPN, buscarPN, getSugerenciasPN,
    getAll, eliminarEntrada, editarPN
  };
})();

window.RepuestosDB = RepuestosDB;
