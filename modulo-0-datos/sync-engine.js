/**
 * modulo-0-datos/sync-engine.js
 * Motor de sincronización offline-first.
 * Estrategia: IndexedDB como fuente verdad → sync async con Sheets.
 * Resolución de conflictos: timestamp más reciente gana.
 */

const SyncEngine = (() => {
  let _running = false;
  let _intervalId = null;
  let _pendingCount = 0;

  // ── Iniciar motor ────────────────────────────────────────────────
  function start() {
    if (_intervalId) return;
    _intervalId = setInterval(_tick, APP_CONFIG.syncIntervalMs || 30000);
    window.addEventListener('online', () => { Toast.info('Conexión restaurada. Sincronizando…'); _tick(); });
    _tick(); // primera pasada inmediata
  }

  function stop() {
    clearInterval(_intervalId);
    _intervalId = null;
  }

  // ── Ciclo de sync ────────────────────────────────────────────────
  async function _tick() {
    if (_running || !navigator.onLine) return;

    _running = true;
    _setStatus('connecting');

    try {
      const queue = await LocalCache.getQueue();
      _pendingCount = queue.length;
      _updateChip();

      if (queue.length === 0) {
        _setStatus('connected');
        return;
      }

      for (const op of queue) {
        await _processOp(op);
      }

      _pendingCount = 0;
      _setStatus('connected');
    } catch (err) {
      _setStatus('error');
      console.warn('[SyncEngine]', err.message);
      // Notificar al usuario visiblemente sobre el error de conexión
      if (window.Toast) {
        Toast.error('Problema de conexión o subida con Supabase: ' + err.message);
      }
    } finally {
      _running = false;
      _updateChip();
    }
  }

  // ── Procesar una operación de la cola ────────────────────────────
  async function _processOp(op) {
    try {
      switch (op.action) {
        case 'writeRow':
        case 'writeAsset':
        case 'updateRow':
          // Si hay una foto adjunta en la cola, la subimos a Supabase Storage primero
          if (op.base64Photo && op.rowData.DOC_COMPRA && !op.rowData.DOC_COMPRA.startsWith('http')) {
            try {
              const publicUrl = await DriveUpload.uploadDataURL(op.base64Photo, `${op.rowData.CODIGO}_evidencia_${Date.now()}.jpg`);
              op.rowData.DOC_COMPRA = publicUrl;
            } catch (uploadErr) {
              console.error('[SyncEngine] Error al subir foto, guardando registro sin foto:', uploadErr);
              op.rowData.DOC_COMPRA = ''; // Limpiamos para evitar intentar guardar un base64 gigante en DB
            }
          }
          await SupabaseAPI.upsert(op.rowData);
          break;
        case 'deleteRow':
          console.warn('[SyncEngine] deleteRow no soportado en Supabase via sync. Usa Supabase Dashboard.');
          break;
        case 'uploadFile':
          // Aún no migrado a Supabase Storage, ignorar o manejar si es necesario.
          console.warn('[SyncEngine] uploadFile no está conectado a Supabase Storage aún.');
          break;
        case 'appendAudit':
          // Podríamos crear una tabla de auditoría en Supabase si quisiéramos.
          console.log('[SyncEngine] audit omitido en Supabase', op.auditRow);
          break;
      }
      await LocalCache.removeFromQueue(op.id);
    } catch (err) {
      op.retries = (op.retries || 0) + 1;
      if (op.retries >= 5) {
        // Descartar después de 5 intentos, loguear
        await LocalCache.removeFromQueue(op.id);
        await LocalCache.addAudit({ accion: 'SYNC_FAIL', detalle: op, error: err.message });
        console.error('[SyncEngine] Op descartada tras 5 intentos:', op);
      }
      throw err;
    }
  }

  // ── Encolar operación ────────────────────────────────────────────
  async function enqueue(action, payload) {
    await LocalCache.enqueue({ action, ...payload });
    _pendingCount++;
    _setStatus('pending');
    _updateChip();
    // Intentar sync inmediato si hay conexión
    if (navigator.onLine && !_running) setTimeout(_tick, 500);
  }

  // ── Encolar escritura con audit trail ────────────────────────────
  async function syncWrite(sheetName, rowData, auditInfo = {}) {
    // Guardar audit local
    await LocalCache.addAudit({
      accion: auditInfo.accion || 'CREATE',
      entidad: auditInfo.entidad || sheetName,
      datos: rowData,
      usuario: auditInfo.usuario || 'Sistema',
    });
    // Encolar para Sheets / Supabase
    await enqueue('writeRow', { sheetName, rowData, base64Photo: auditInfo.base64Photo });
    // Encolar audit en Sheets también
    await enqueue('appendAudit', { auditRow: [new Date().toISOString(), auditInfo.accion, auditInfo.entidad, JSON.stringify(rowData)] });
  }

  // ── Estado del chip ──────────────────────────────────────────────
  let _currentStatus = 'disconnected';

  function _setStatus(s) { _currentStatus = s; }

  function _updateChip() {
    const chip = document.getElementById('sync-chip');
    if (!chip) return;
    const labels = {
      connected:    'Sync OK',
      pending:      `Pendientes (${_pendingCount})`,
      connecting:   'Sincronizando…',
      error:        'Error sync',
      disconnected: 'Sin conexión',
    };
    chip.className = `sync-chip ${_currentStatus}`;
    chip.innerHTML = `<span class="dot"></span>${labels[_currentStatus]}`;
  }

  // ── Forzar sync manual ───────────────────────────────────────────
  async function forceSync() {
    _running = false;
    await _tick();
  }

  return { start, stop, enqueue, syncWrite, forceSync, getStatus: () => _currentStatus, getPendingCount: () => _pendingCount };
})();

window.SyncEngine = SyncEngine;
