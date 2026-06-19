/**
 * modulo-1-ingreso/tarea-modal.js — Inventario Pro v3
 * Modal para crear nuevas Tareas/Actividades.
 */

const TareaModal = (() => {

  function abrir(onRenderCallback) {
    ModalGenerico.open(`
      <div class="modal-title">📝 Nueva Tarea / Registro</div>
      <div class="modal-subtitle">Agrupa tus actividades diarias o entregas</div>
      <div class="form-group">
        <label class="form-label">Título de la Tarea</label>
        <input type="text" class="form-control" id="nueva-tarea-titulo" placeholder="Ej: Entregas Laptops Contabilidad">
      </div>
      <div class="form-group">
        <label class="form-label">👨‍🔧 Técnico Responsable</label>
        <input type="text" class="form-control" id="nueva-tarea-tecnico" placeholder="Tu nombre…" autocomplete="off">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="TareaModal.confirmar(TareasView.render)">Crear Tarea</button>
      </div>
    `);
    
    setTimeout(async () => {
      const lotes = await LocalCache.getLotes();
      const inp = document.getElementById('nueva-tarea-titulo');
      if (inp) { inp.value = `Actividades del ${new Date().toLocaleDateString('es-PE')}`; inp.select(); }
    }, 100);
  }

  async function confirmar(onRenderCallback) {
    const titulo   = document.getElementById('nueva-tarea-titulo')?.value?.trim();
    const tecnico  = document.getElementById('nueva-tarea-tecnico')?.value?.trim() || '';
    if (!titulo) { Toast.warning('Escribe un título'); return; }
    
    window._loteActivo = await LocalCache.crearLote(titulo, tecnico);
    
    ModalGenerico.close();
    Toast.success(`Tarea "${titulo}" creada`);
    if (onRenderCallback) onRenderCallback();
  }

  return { abrir, confirmar };
})();

window.TareaModal = TareaModal;
