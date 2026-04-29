/**
 * modulo-2-reportes/plantillas/reporte-lote.js
 * Plantilla de reporte general de lote.
 */

const PlantillaReporteLote = (() => {

  function generar(lote) {
    const emp = APP_CONFIG.empresa;
    const equipos = lote.equipos || [];
    const stats = AgrupadorLotes.agrupar(equipos);
    const fecha = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' });

    return `
      <div class="report-doc" id="doc-reporte-lote">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--accent)">
          <div>
            <div style="font-size:1.3rem;font-weight:800;color:var(--accent)">${emp.nombre}</div>
            ${emp.ruc ? `<div style="font-size:0.75rem;color:var(--text-secondary)">RUC: ${emp.ruc}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">REPORTE DE LOTE</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">${fecha}</div>
            <div style="font-size:0.78rem;font-weight:600">${lote.titulo}</div>
          </div>
        </div>

        <!-- Resumen visual -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
          <div style="text-align:center;padding:10px;background:var(--bg-hover);border-radius:var(--radius-sm)">
            <div style="font-size:1.6rem;font-weight:800">${equipos.length}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary)">TOTAL</div>
          </div>
          ${Object.entries(stats.porEstado).map(([k,v])=>{
            const cfg = APP_CONFIG.estados[k]||{label:k};
            return `<div style="text-align:center;padding:10px;background:var(--bg-hover);border-radius:var(--radius-sm)">
              <div style="font-size:1.6rem;font-weight:800">${v}</div>
              <div style="font-size:0.7rem;color:var(--text-secondary)">${cfg.label.toUpperCase()}</div>
            </div>`;
          }).join('')}
        </div>

        <!-- Tabla completa -->
        <table>
          <thead>
            <tr>
              <th>#</th><th>Código</th><th>Marca</th><th>Modelo</th>
              <th>Tipo</th><th>Procesador</th><th>RAM</th><th>HD/SSD</th>
              <th>Sucursal</th><th>Estado</th><th>Observación</th><th>Hora Registro</th>
            </tr>
          </thead>
          <tbody>
            ${equipos.map((e,i)=>`<tr>
              <td>${i+1}</td>
              <td><strong>${Formatters.safe(e.CODIGO)}</strong></td>
              <td>${Formatters.safe(e.MARCA)}</td>
              <td>${Formatters.safe(e.MODELO)}</td>
              <td>${Formatters.safe(e.TIP_EQUIP)}</td>
              <td>${Formatters.safe(e.PROCESADOR)}</td>
              <td>${Formatters.safe(e.RAM)}</td>
              <td>${Formatters.safe(e.HD_SSD)}</td>
              <td>${Formatters.safe(e.SUCURSAL)}</td>
              <td>${Formatters.safe(e.ESTADO)}</td>
              <td>${Formatters.safe(e._obsPersonal||e.OBSERVACION)}</td>
              <td style="font-size:0.7rem">${e._timestamp?new Date(e._timestamp).toLocaleTimeString('es-PE'):''}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <div style="margin-top:14px;font-size:0.75rem;color:var(--text-muted)">
          Total: ${equipos.length} equipos ·
          ${Object.entries(stats.porTipo).map(([t,n])=>`${n} ${t}(s)`).join(' · ')}
        </div>

        <div style="text-align:center;font-size:0.65rem;color:var(--text-muted);margin-top:16px;border-top:1px solid var(--border);padding-top:8px">
          ${emp.nombre} · RUC ${emp.ruc} · Inventario Pro v${APP_CONFIG.version} · ${new Date().toLocaleString('es-PE')}
        </div>
      </div>
    `;
  }

  return { generar };
})();

window.PlantillaReporteLote = PlantillaReporteLote;
