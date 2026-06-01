/**
 * utils-helpers/event-bus.js — Inventario Pro v3
 * Bus de eventos desacoplado.
 * Permite que los módulos se comuniquen sin conocerse entre sí.
 *
 * Eventos principales:
 *   lote:created, lote:updated, lote:closed, lote:deleted
 *   equipo:added, equipo:removed, equipo:updated
 *   sync:started, sync:completed, sync:error
 *   view:changed
 *   foto:uploaded, foto:deleted
 */

const EventBus = (() => {
  const _listeners = {};

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
    // Retorna función de unsubscribe
    return () => { off(event, callback); };
  }

  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    for (const cb of _listeners[event]) {
      try { cb(data); } catch (err) {
        console.error(`[EventBus] Error en handler de "${event}":`, err);
      }
    }
  }

  /** Suscribirse a un evento una sola vez */
  function once(event, callback) {
    const wrapper = (data) => { off(event, wrapper); callback(data); };
    on(event, wrapper);
  }

  return { on, off, emit, once };
})();

window.EventBus = EventBus;
