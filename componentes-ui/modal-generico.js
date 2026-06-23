/**
 * componentes-ui/modal-generico.js
 * Modal reutilizable con slots de contenido dinámico.
 * Protegido contra cierre accidental por clic fuera del modal.
 */

const ModalGenerico = (() => {
  const OVERLAY_ID = 'modal-generico-overlay';
  let _closeOnOutsideClick = false;

  function _ensure() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `<div class="modal" id="modal-generico-box">
        <button class="modal-close" onclick="ModalGenerico.close()">✕</button>
        <div id="modal-generico-content"></div>
      </div>`;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          if (_closeOnOutsideClick) {
            close();
          } else {
            // Feedback visual: el modal vibra para indicar que no se puede cerrar así
            const box = document.getElementById('modal-generico-box');
            if (box) {
              box.classList.remove('modal-shake');
              // Force reflow para reiniciar la animación
              void box.offsetWidth;
              box.classList.add('modal-shake');
            }
          }
        }
      });
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function open(html, options = {}) {
    const overlay = _ensure();
    const box = document.getElementById('modal-generico-box');
    const content = document.getElementById('modal-generico-content');
    if (!box || !content) return;

    // Guardar opción de cierre por clic externo (por defecto: NO cerrar)
    _closeOnOutsideClick = options.closeOnOutsideClick === true;

    // Tamaño
    box.className = `modal ${options.size || ''}`;
    content.innerHTML = html;
    overlay.classList.add('open');

    // Focus en primer input
    setTimeout(() => {
      const first = content.querySelector('input,select,textarea');
      if (first) first.focus();
    }, 150);
  }

  function close() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.classList.remove('open');
  }

  return { open, close };
})();

window.ModalGenerico = ModalGenerico;
