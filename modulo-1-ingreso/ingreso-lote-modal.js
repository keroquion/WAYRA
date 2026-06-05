/**
 * modulo-1-ingreso/ingreso-lote-modal.js — Inventario Pro v3
 * Modal para crear nuevos lotes.
 */

const IngresoLoteModal = (() => {

  function abrir(onRenderCallback) {
    ModalGenerico.open(`
      <div class="modal-title">📦 Nuevo Lote</div>
      <div class="modal-subtitle">El lote anterior se conserva en el historial</div>
      <div class="form-group">
        <label class="form-label">Título del Lote</label>
        <input type="text" class="form-control" id="nuevo-lote-titulo" placeholder="LOTE 105">
      </div>
      <div class="form-group">
        <label class="form-label">👨‍🔧 Técnico Encargado</label>
        <input type="text" class="form-control" id="nuevo-lote-tecnico" placeholder="Nombre del técnico…" autocomplete="off">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="IngresoLoteModal.confirmar(IngresoView.render)">Crear Lote</button>
      </div>
    `);
    
    setTimeout(async () => {
      const lotes = await LocalCache.getLotes();
      const inp = document.getElementById('nuevo-lote-titulo');
      if (inp) { inp.value = `LOTE ${101 + lotes.length}`; inp.select(); }
    }, 100);
  }

  async function confirmar(onRenderCallback) {
    const titulo   = document.getElementById('nuevo-lote-titulo')?.value?.trim();
    const tecnico  = document.getElementById('nuevo-lote-tecnico')?.value?.trim() || '';
    if (!titulo) { Toast.warning('Escribe un título'); return; }
    
    window._loteActivo = await LocalCache.crearLote(titulo, tecnico);
    
    ModalGenerico.close();
    Toast.success(`Lote "${titulo}" creado`);
    if (onRenderCallback) onRenderCallback();
  }

  return { abrir, confirmar };
})();

window.IngresoLoteModal = IngresoLoteModal;
