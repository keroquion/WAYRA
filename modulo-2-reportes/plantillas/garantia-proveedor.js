/**
 * modulo-2-reportes/plantillas/garantia-proveedor.js
 * Plantilla de documento formal para envío a proveedor.
 */

const PlantillaGarantiaProveedor = (() => {

  function generar(lote, proveedor = '') {
    const emp = APP_CONFIG.empresa;
    const equipos = (lote.equipos || []).filter(e =>
      e._estadoGarantia && e._estadoGarantia !== 'RECIBIDO'
    );
    const todos = equipos.length ? equipos : (lote.equipos || []);
    const stats = AgrupadorLotes.agrupar(todos);
    const fecha = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' });

    return `
      <div class="report-doc" id="doc-garantia-proveedor">
        <!-- Cabecera -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--accent)">
          <div>
            ${emp.logo ? `<img src="${emp.logo}" style="height:48px;margin-bottom:8px;display:block">` : `<div style="font-size:1.4rem;font-weight:800;color:var(--accent)">${emp.nombre}</div>`}
            <div style="font-size:0.78rem;color:var(--text-secondary)">
              ${emp.ruc ? `RUC: ${emp.ruc}` : ''}<br>
              ${emp.direccion || ''}<br>
              ${emp.telefono || ''} ${emp.email ? `· ${emp.email}` : ''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1rem;font-weight:700">REMISIÓN DE GARANTÍA</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Fecha: ${fecha}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary)">Lote: <strong>${lote.titulo}</strong></div>
            ${proveedor ? `<div style="font-size:0.8rem;color:var(--text-secondary)">Proveedor: <strong>${proveedor}</strong></div>` : ''}
          </div>
        </div>

        <!-- Totales rápidos -->
        <div class="report-totals" style="margin-bottom:16px">
          <strong>RESUMEN:</strong> Total ${todos.length} equipo(s) —
          ${Object.entries(stats.porTipo).map(([t,n]) => `${n} ${t}`).join(', ')}
        </div>

        <!-- Tabla equipos -->
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Código</th>
              <th>Serie</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Procesador</th>
              <th>RAM</th>
              <th>HD/SSD</th>
              <th>Falla / Diagnóstico</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${todos.map((e, i) => `
              <tr>
                <td>${i+1}</td>
                <td><strong>${Formatters.safe(e.CODIGO)}</strong></td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:0.7rem">${Formatters.safe(e.SERIE)}</td>
                <td>${Formatters.safe(e.TIP_EQUIP)}</td>
                <td>${Formatters.safe(e.MARCA)}</td>
                <td>${Formatters.safe(e.MODELO)}</td>
                <td>${Formatters.safe(e.PROCESADOR)}</td>
                <td>${Formatters.safe(e.RAM)}</td>
                <td>${Formatters.safe(e.HD_SSD)}</td>
                <td>${Formatters.safe(e._fallaReportada || e.OBSERVACION)}</td>
                <td>${Formatters.safe(e._estadoGarantia || e.ESTADO)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totales por tipo -->
        <div class="report-totals" style="margin-top:16px">
          ${Object.entries(stats.porTipo).map(([t,n]) => `<span style="margin-right:16px"><strong>${n}</strong> ${t}(s)</span>`).join('')}
        </div>

        <!-- Firma -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;padding-top:14px;border-top:1px solid var(--border)">
          <div style="text-align:center">
            <div style="height:50px;border-bottom:1px solid var(--text-muted);margin-bottom:6px"></div>
            <div style="font-size:0.75rem;color:var(--text-secondary)">Entregado por — ${emp.nombre}</div>
          </div>
          <div style="text-align:center">
            <div style="height:50px;border-bottom:1px solid var(--text-muted);margin-bottom:6px"></div>
            <div style="font-size:0.75rem;color:var(--text-secondary)">Recibido por — ${proveedor || 'Proveedor'}</div>
          </div>
        </div>

        <div style="text-align:center;font-size:0.65rem;color:var(--text-muted);margin-top:20px">
          Documento generado el ${new Date().toLocaleString('es-PE')} · ${emp.nombre} · Inventario Pro v${APP_CONFIG.version}
        </div>
      </div>
    `;
  }

  return { generar };
})();

window.PlantillaGarantiaProveedor = PlantillaGarantiaProveedor;
