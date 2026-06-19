/**
 * modulo-2-reportes/plantillas/reporte-tarea.js
 * Plantilla de reporte para Tareas y Actividades.
 */

const PlantillaReporteTarea = (() => {

  function generar(lote) {
    const emp = APP_CONFIG.empresa;
    const actividades = lote.equipos || []; // "equipos" is internally the activities
    const fecha = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' });

    // Contar tipos de actividad
    const stats = {};
    actividades.forEach(a => {
      const tipo = a.TIP_EQUIP || 'Otro';
      stats[tipo] = (stats[tipo] || 0) + 1;
    });

    return `
      <div class="report-doc" id="doc-reporte-lote" style="font-family: Arial, sans-serif;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--accent)">
          <div>
            <div style="font-size:1.3rem;font-weight:800;color:var(--accent)">${emp.nombre}</div>
            ${emp.ruc ? `<div style="font-size:0.75rem;color:var(--text-secondary)">RUC: ${emp.ruc}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">REPORTE DE ACTIVIDADES / TAREAS</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">${fecha}</div>
            <div style="font-size:0.78rem;font-weight:600">Tarea: ${lote.titulo}</div>
            <div style="font-size:0.78rem;font-weight:600">Técnico: ${lote.tecnico || 'No especificado'}</div>
          </div>
        </div>

        <!-- Resumen visual -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
          <div style="text-align:center;padding:10px;background:var(--bg-hover);border-radius:var(--radius-sm)">
            <div style="font-size:1.6rem;font-weight:800">${actividades.length}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary)">TOTAL ACTIVIDADES</div>
          </div>
          ${Object.entries(stats).slice(0,3).map(([k,v])=>{
            return `<div style="text-align:center;padding:10px;background:var(--bg-hover);border-radius:var(--radius-sm)">
              <div style="font-size:1.6rem;font-weight:800">${v}</div>
              <div style="font-size:0.7rem;color:var(--text-secondary)">${k.toUpperCase().substring(0, 20)}</div>
            </div>`;
          }).join('')}
        </div>

        <!-- Tabla completa -->
        <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="padding: 8px 4px;">#</th>
              <th style="padding: 8px 4px;">Hora</th>
              <th style="padding: 8px 4px;">Tipo de Actividad</th>
              <th style="padding: 8px 4px;">Descripción / Detalle</th>
              <th style="padding: 8px 4px; text-align: center;">Evidencia</th>
            </tr>
          </thead>
          <tbody>
            ${actividades.map((e,i)=>`
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 8px 4px;">${i+1}</td>
              <td style="padding: 8px 4px;">${e._timestamp ? new Date(e._timestamp).toLocaleTimeString('es-PE') : ''}</td>
              <td style="padding: 8px 4px; font-weight: bold;">${Formatters.safe(e.TIP_EQUIP || 'Actividad')}</td>
              <td style="padding: 8px 4px;">${Formatters.safe(e.OBSERVACION || e._obsPersonal)}</td>
              <td style="padding: 8px 4px; text-align: center;">
                ${e._fotos && e._fotos.length > 0 
                  ? `<img src="${e._fotos[0]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;">`
                  : `<span style="color:var(--text-muted); font-size: 0.7rem;">Sin foto</span>`}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>

        <!-- Firmas -->
        <div style="display:flex; justify-content: space-around; margin-top: 60px;">
          <div style="text-align:center; border-top: 1px solid #000; width: 200px; padding-top: 5px;">
            <div style="font-weight: 600; font-size: 0.8rem;">Técnico Responsable</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${lote.tecnico || ''}</div>
          </div>
          <div style="text-align:center; border-top: 1px solid #000; width: 200px; padding-top: 5px;">
            <div style="font-weight: 600; font-size: 0.8rem;">V° B° Conformidad (Usuario)</div>
          </div>
        </div>

        <div style="text-align:center;font-size:0.65rem;color:var(--text-muted);margin-top:40px;border-top:1px solid var(--border);padding-top:8px">
          ${emp.nombre} · RUC ${emp.ruc} · ${new Date().toLocaleString('es-PE')}
        </div>
      </div>
    `;
  }

  return { generar };
})();

window.PlantillaReporteTarea = PlantillaReporteTarea;
