/**
 * modulo-0-datos/lote-portable.js — Inventario Pro v3
 * Serialización/deserialización de lotes para exportación e importación.
 *
 * Formato: JSON (.json) con metadatos de integridad, versión y origen.
 *
 * CASOS DE USO:
 *   1. Backup/Recovery: Descargar lote completo para restaurar ante pérdida
 *   2. Multi-usuario: Compartir lote entre instancias de la app
 *   3. Auditoría: Archivo portable con todos los datos del lote
 *
 * INCLUYE:
 *   - Datos de todos los equipos (campos de Sheets + campos locales)
 *   - URLs de fotos (apuntan a Drive original, no se duplican)
 *   - Repuestos usados, datos de Gemini IA, estados soporte/garantía
 *   - Metadatos: empresa, versión de la app, hash de integridad
 */

const LotePortable = (() => {

  const FORMAT_VERSION = 'inventario-pro-lote-v1';

  /**
   * Exporta un lote como archivo JSON descargable.
   * @param {string} loteId — ID del lote a exportar
   * @param {Object} opciones — { incluirFotosBase64: false }
   * @returns {Promise<void>} descarga el archivo automáticamente
   */
  async function exportar(loteId, opciones = {}) {
    const lotes = await LocalCache.getLotes();
    const lote = lotes.find(l => l.id === loteId);
    if (!lote) throw new Error('Lote no encontrado');

    // Limpiar datos internos que no son necesarios en la exportación
    const equiposExport = (lote.equipos || []).map(eq => {
      const cleaned = { ...eq };
      // Las fotos: exportar solo URLs y metadatos, no los base64 de preview
      if (cleaned._fotos) {
        cleaned._fotos = cleaned._fotos.map(f => ({
          nombre: f.nombre || '',
          url: f.url || '',
          thumbUrl: f.thumbUrl || '',
          fileId: f.fileId || '',
          timestamp: f.timestamp || '',
          // Solo incluir preview base64 si se solicita explícitamente
          ...(opciones.incluirFotosBase64 && f.preview ? { preview: f.preview } : {}),
        }));
      }
      return cleaned;
    });

    const paquete = {
      _format: FORMAT_VERSION,
      _version: APP_CONFIG.version || '3.0.0',
      _exportedAt: new Date().toISOString(),
      _empresa: {
        nombre: APP_CONFIG.empresa?.nombre || '',
        ruc: APP_CONFIG.empresa?.ruc || '',
      },
      _stats: {
        totalEquipos: equiposExport.length,
        totalFotos: equiposExport.reduce((sum, eq) => sum + (eq._fotos?.length || 0), 0),
        totalRepuestos: equiposExport.reduce((sum, eq) => sum + (eq._repuestosUsados?.length || 0), 0),
      },
      lote: {
        id: lote.id,
        titulo: lote.titulo || '',
        tecnico: lote.tecnico || '',
        fechaCreacion: lote.fechaCreacion || '',
        fechaCierre: lote.fechaCierre || '',
        activo: false, // Al exportar siempre se marca como inactivo
        equipos: equiposExport,
      },
    };

    // Hash de integridad
    paquete._hash = await _computeHash(JSON.stringify(paquete.lote));

    // Descargar
    const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json' });
    const filename = `lote_${(lote.titulo || lote.id).replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    _descargar(blob, filename);

    Toast.success(`📦 Lote "${lote.titulo}" exportado como ${filename}`);
    return paquete;
  }

  /**
   * Importa un lote desde un archivo JSON.
   * @param {File} file — archivo .json seleccionado por el usuario
   * @returns {Promise<Object>} { lote, stats }
   */
  async function importar(file) {
    const text = await file.text();
    let paquete;

    try {
      paquete = JSON.parse(text);
    } catch {
      throw new Error('El archivo no es un JSON válido.');
    }

    // Validar formato
    if (!paquete._format || !paquete._format.startsWith('inventario-pro-lote')) {
      throw new Error('El archivo no tiene el formato de lote de Inventario Pro.');
    }
    if (!paquete.lote || !paquete.lote.equipos) {
      throw new Error('El archivo no contiene datos de lote válidos.');
    }

    // Verificar integridad (opcional — solo warning si falla)
    if (paquete._hash) {
      const currentHash = await _computeHash(JSON.stringify(paquete.lote));
      if (currentHash !== paquete._hash) {
        console.warn('[LotePortable] ⚠️ Hash de integridad no coincide — el archivo pudo haber sido modificado.');
      }
    }

    // Generar nuevo ID para evitar colisiones con lotes existentes
    const nuevoId = `lote_imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const loteImportado = {
      ...paquete.lote,
      id: nuevoId,
      activo: false,
      _importado: true,
      _importadoDesde: {
        archivo: file.name,
        empresa: paquete._empresa?.nombre || '?',
        version: paquete._version || '?',
        fechaExportacion: paquete._exportedAt || '?',
        idOriginal: paquete.lote.id || '?',
      },
      _importadoAt: new Date().toISOString(),
    };

    // Asegurar que cada equipo tenga _registroId único
    for (const eq of loteImportado.equipos) {
      if (!eq._registroId) {
        eq._registroId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      } else {
        // Prefijo para evitar colisión con registros locales
        eq._registroId = `imp_${eq._registroId}`;
      }
    }

    // Guardar en IndexedDB
    await LocalCache.updateLote(loteImportado);

    const stats = {
      equipos: loteImportado.equipos.length,
      fotos: loteImportado.equipos.reduce((s, eq) => s + (eq._fotos?.length || 0), 0),
      repuestos: loteImportado.equipos.reduce((s, eq) => s + (eq._repuestosUsados?.length || 0), 0),
      origenEmpresa: paquete._empresa?.nombre || '—',
    };

    EventBus.emit('lote:created', { lote: loteImportado });
    Toast.success(`📥 Lote "${loteImportado.titulo}" importado con ${stats.equipos} equipos`);

    return { lote: loteImportado, stats };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  async function _computeHash(str) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'sha256:unavailable';
    }
  }

  function _descargar(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  return { exportar, importar };
})();

window.LotePortable = LotePortable;
