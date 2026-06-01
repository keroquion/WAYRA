/**
 * modulo-2-reportes/print-window.js — Inventario Pro v3
 * Ventana de impresión reutilizable para tickets de soporte.
 * Extraído de reportes.view.js L430-L556 para reutilización.
 */

const PrintWindow = (() => {

  /**
   * Abre una ventana de impresión con tickets renderizados.
   * @param {string} ticketsHtml — HTML de los tickets
   * @param {string} filename — nombre del documento
   * @param {number} cols — columnas por fila (1, 2 o 4)
   */
  function abrir(ticketsHtml, filename, cols = 2) {
    const win = window.open('', '_blank', 'width=1000,height=750');
    if (!win) { Toast.error('Activa las ventanas emergentes para imprimir'); return; }

    const bodyFontSize = cols >= 4 ? '9px' : cols === 2 ? '11px' : '12px';
    const initWidth = cols === 1 ? '100%' : cols === 4 ? 'calc(25% - 12px)' : 'calc(50% - 8px)';
    const printWidth = cols === 1 ? '100%' : cols === 4 ? 'calc(25% - 6px)' : 'calc(50% - 4px)';

    win.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', system-ui, Arial, sans-serif;
          background: #f1f5f9;
          color: #1e293b;
          font-size: ${bodyFontSize};
          padding: 16px;
        }
        .tickets-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .ticket-page {
          width: ${initWidth};
          break-inside: avoid;
          page-break-inside: avoid;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #cbd5e1;
        }
        .ticket-soporte-doc img { max-width: 100%; height: auto; }
        @media print {
          body { padding: 5mm; background: #fff; }
          .no-print { display: none !important; }
          .tickets-grid { gap: 8px; }
          .ticket-page {
            width: ${printWidth} !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          @page { margin: 6mm; size: A4; }
        }
        .no-print { display: flex; }
      </style>
    </head><body>
      <div class="no-print" style="
        position:sticky;top:0;
        background:linear-gradient(135deg,#0f172a,#1e293b);
        padding:10px 16px;
        display:flex;gap:10px;align-items:center;
        z-index:999;
        margin:-16px -16px 16px;
        flex-wrap:wrap;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
      ">
        <span style="font-size:13px;font-weight:700;color:#fff">🖨️ Tickets de Soporte</span>
        <button onclick="window.print()" style="
          background:linear-gradient(135deg,#7c3aed,#6d28d9);
          color:#fff;border:none;border-radius:8px;
          padding:8px 20px;font-size:12px;cursor:pointer;font-weight:700;
          box-shadow:0 2px 8px rgba(124,58,237,0.4);
        ">
          🖨️ Imprimir / Guardar PDF
        </button>
        <span style="font-size:10.5px;color:#94a3b8">
          Selecciona <strong style="color:#c4b5fd">"Guardar como PDF"</strong> en el diálogo para descargar.
        </span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <label style="font-size:10.5px;color:#94a3b8">Tickets por fila:</label>
          <select onchange="_cambiarDensidad(this.value)" style="
            padding:5px 10px;border-radius:6px;
            border:1px solid #334155;
            background:#1e293b;color:#e2e8f0;
            font-size:12px;cursor:pointer;
          ">
            <option value="1" ${cols===1?'selected':''}>1 — Grande</option>
            <option value="2" ${cols!==1&&cols!==4?'selected':''}>2 — Estándar</option>
            <option value="4" ${cols===4?'selected':''}>4 — Compacto</option>
          </select>
        </div>
        <button onclick="window.close()" style="
          background:#dc2626;color:#fff;border:none;
          border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;
        ">✕ Cerrar</button>
      </div>
      <div class="tickets-grid" id="tickets-grid">
        ${ticketsHtml}
      </div>
    </body></html>`);

    win.document.write(`<script>
      function _cambiarDensidad(v) {
        const g = document.getElementById('tickets-grid');
        if (!g) return;
        const n = parseInt(v);
        const items = g.querySelectorAll('.ticket-page');
        items.forEach(item => {
          if (n === 1) item.style.width = '100%';
          else if (n === 4) item.style.width = 'calc(25% - 12px)';
          else item.style.width = 'calc(50% - 8px)';
        });
        document.body.style.fontSize = n >= 4 ? '9px' : n === 2 ? '11px' : '12px';
      }
    <\/script>`);

    win.document.close();
    win.focus();
  }

  return { abrir };
})();

window.PrintWindow = PrintWindow;
