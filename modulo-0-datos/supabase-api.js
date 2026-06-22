/**
 * modulo-0-datos/supabase-api.js
 * Cliente REST directo para Supabase.
 * Reemplaza a sheets-api.js
 */

const SupabaseAPI = (() => {
  const IDB_STORE = 'equipos';
  const CFG_KEY = 'equipos_supabase_sync'; // Cambiado para forzar limpieza del caché de Excel
  const TTL = 5 * 60 * 1000;

  let _status = 'disconnected';

  function init(cfg) { _updateChip('disconnected'); }

  async function _request(endpoint, options = {}) {
    if (!APP_CONFIG.supabase.url || !APP_CONFIG.supabase.anonKey) {
      throw new Error('Supabase no está configurado en app.config.js');
    }
    const url = `${APP_CONFIG.supabase.url}/rest/v1/${endpoint}`;
    let authHeader = `Bearer ${APP_CONFIG.supabase.anonKey}`;
    if (window.AuthService && AuthService.getUsuarioActual() && AuthService.getUsuarioActual().access_token) {
      authHeader = `Bearer ${AuthService.getUsuarioActual().access_token}`;
    }

    const headers = {
      'apikey': APP_CONFIG.supabase.anonKey,
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Supabase Error: ${res.status} - ${errorText}`);
    }
    // Si la respuesta es vacía (ej. DELETE o INSERT sin return), devolvemos texto vacío
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // Descargar toda la tabla
  async function fetchAll(force = false) {
    const now = Date.now();
    if (!force) {
      try {
        const idbData = await LocalCache.getAll(IDB_STORE);
        const lastSync = await LocalCache.getConfig(CFG_KEY, 0);
        if (idbData.length > 0 && (now - lastSync) < TTL) {
          _updateChip('connected');
          return idbData;
        }
      } catch (e) {
        console.warn('IDB read error:', e);
      }
    }
    return syncFromRemote(force);
  }

  async function syncFromRemote(force = false) {
    _updateChip('connecting');
    try {
      const rawData = await _request('equipos?select=*&order=created_at.desc.nullslast');
      
      // Supabase devuelve columnas en minúsculas. Las convertimos a MAYÚSCULAS
      // para que todo el código de la app siga funcionando sin cambios.
      const data = (rawData || []).map(row => {
        const normalized = {};
        for (const [k, v] of Object.entries(row)) {
          normalized[k.toUpperCase()] = v;
        }
        return normalized;
      });

      // Guardar en IDB
      await LocalCache.clear(IDB_STORE);
      const BATCH = 200;
      for (let i = 0; i < data.length; i += BATCH) {
        const batch = data.slice(i, i + BATCH);
        await Promise.all(batch.map(eq => {
          const id = eq.CODIGO || eq.SERIE;
          if (id) return LocalCache.put(IDB_STORE, { ...eq, _id: id });
        }));
      }
      await LocalCache.setConfig(CFG_KEY, Date.now());
      _updateChip('connected');
      return data;
    } catch (err) {
      _updateChip('error');
      console.error(err);
      throw err;
    }
  }

  async function findByCodigoOSerie(codigo) {
    const data = await fetchAll();
    const q = codigo.toString().trim().toUpperCase();
    return data.find(r => 
      (r.CODIGO || '').toUpperCase() === q || 
      (r.SERIE || '').toUpperCase() === q
    ) || null;
  }

  async function search(q) {
    const data = await fetchAll();
    if (!q) return data;
    const ql = q.toLowerCase().trim();
    return data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(ql)));
  }

  function invalidateCache() {
    LocalCache.setConfig(CFG_KEY, 0);
  }

  async function getSyncInfo() {
    const lastSync = await LocalCache.getConfig(CFG_KEY, 0);
    const count = (await LocalCache.getAll(IDB_STORE)).length;
    return { lastSync, count, stale: lastSync && (Date.now() - lastSync) > TTL };
  }

  // ── Métodos de escritura directa para SyncEngine ──────────
  async function upsert(rowData) {
    // PostgreSQL guarda todos los nombres de columna en MINÚSCULAS cuando se crean sin comillas.
    // Convertimos las keys del objeto a minúsculas para que coincidan con el schema real.
    const cleanData = {};
    for (const [key, val] of Object.entries(rowData)) {
      // Solo enviamos campos con valor (no vacíos) para evitar errores de columnas inexistentes
      if (val !== '' && val !== null && val !== undefined) {
        cleanData[key.toLowerCase()] = val;
      }
    }
    return _request('equipos?on_conflict=codigo', {
      method: 'POST',
      headers: { 
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(cleanData)
    });
  }

  function _updateChip(state) {
    _status = state;
    const chip = document.getElementById('sheets-status-chip');
    if (!chip) return;
    const labels = {
      connected: '✅ Supabase Local',
      disconnected: '🔗 Conectar',
      connecting: '⏳ Sincronizando…',
      error: '❌ Error Supabase'
    };
    chip.className = `sheets-status-chip ${state}`;
    chip.innerHTML = `<span class="dot"></span>${labels[state] || state}`;
  }

  async function remove(codigo) {
    return _request(`equipos?codigo=eq.${encodeURIComponent(codigo)}`, {
      method: 'DELETE'
    });
  }

  return {
    init, fetchAll, syncFromRemote,
    findByCodigoOSerie, search,
    invalidateCache, getSyncInfo, upsert, remove,
    getStatus: () => _status
  };
})();

// Retrocompatibilidad
window.SupabaseAPI = SupabaseAPI;
window.SheetsAPI = SupabaseAPI; // Para que el resto de la app siga funcionando sin cambiar todo
