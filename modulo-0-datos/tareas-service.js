/**
 * modulo-0-datos/lotes-service.js — Inventario Pro v3
 * Capa de servicio centralizada para operaciones sobre lotes y equipos.
 *
 * PROBLEMA QUE RESUELVE:
 *   El patrón "buscar equipo iterando todos los lotes" se repetía en 8+ archivos:
 *     for (const lote of lotes) {
 *       const eq = lote.equipos?.find(e => e._registroId === regId);
 *       if (!eq) continue; ...
 *     }
 *   Ahora es: const { equipo, lote } = await LotesService.findEquipo(regId);
 */

const LotesService = (() => {

  /**
   * Busca un equipo por su _registroId en todos los lotes.
   * @param {string} registroId
   * @returns {Promise<{equipo: Object, lote: Object}|null>}
   */
  async function findEquipo(registroId) {
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const equipo = lote.equipos?.find(e => e._registroId === registroId);
      if (equipo) return { equipo, lote };
    }
    return null;
  }

  /**
   * Actualiza un equipo en su lote ejecutando una función de transformación.
   * Guarda automáticamente el lote en IndexedDB.
   * @param {string} registroId
   * @param {function} updateFn — recibe (equipo, lote) y modifica equipo in-place
   * @returns {Promise<{equipo: Object, lote: Object}|null>}
   */
  async function updateEquipo(registroId, updateFn) {
    const result = await findEquipo(registroId);
    if (!result) return null;

    const { equipo, lote } = result;
    updateFn(equipo, lote);
    equipo._lastModified = new Date().toISOString();
    await LocalCache.updateLote(lote);

    EventBus.emit('equipo:updated', { equipo, lote });
    return result;
  }

  /**
   * Obtiene el lote activo actual.
   * @returns {Promise<Object|null>}
   */
  async function getLoteActivo() {
    return LocalCache.getLoteActivo();
  }

  /**
   * Obtiene todos los equipos de todos los lotes que cumplen un filtro.
   * @param {function} filterFn — recibe (equipo, lote) → bool
   * @returns {Promise<Array<{equipo, lote}>>}
   */
  async function findEquipos(filterFn) {
    const lotes = await LocalCache.getLotes();
    const resultados = [];
    for (const lote of lotes) {
      for (const equipo of (lote.equipos || [])) {
        if (filterFn(equipo, lote)) {
          resultados.push({ equipo, lote });
        }
      }
    }
    return resultados;
  }

  /**
   * Busca en qué lotes aparece un equipo por CODIGO o SERIE.
   * Útil para el escáner que necesita mostrar historial.
   * @param {string} codigoOSerie
   * @returns {Promise<Array<{equipo, lote}>>}
   */
  async function findEnLotesPorCodigo(codigoOSerie) {
    if (!codigoOSerie) return [];
    const q = codigoOSerie.toString().trim().toUpperCase();
    return findEquipos((eq) =>
      (eq.CODIGO || '').toUpperCase() === q ||
      (eq.SERIE  || '').toUpperCase() === q
    );
  }

  /**
   * Obtiene las fotos de un equipo (por _registroId).
   * @param {string} registroId
   * @returns {Promise<Array>} array de fotos o []
   */
  async function getFotos(registroId) {
    const result = await findEquipo(registroId);
    return result?.equipo?._fotos || [];
  }

  /**
   * Cuenta equipos por estado en un lote.
   * @param {Object} lote
   * @returns {Object} { total, C, P, M, V, G, S }
   */
  function contarPorEstado(lote) {
    const equipos = lote?.equipos || [];
    const conteo = { total: equipos.length };
    for (const eq of equipos) {
      const estado = eq.ESTADO || '?';
      conteo[estado] = (conteo[estado] || 0) + 1;
    }
    return conteo;
  }

  return {
    findEquipo,
    updateEquipo,
    getLoteActivo,
    findEquipos,
    findEnLotesPorCodigo,
    getFotos,
    contarPorEstado,
  };
})();

window.LotesService = LotesService;
