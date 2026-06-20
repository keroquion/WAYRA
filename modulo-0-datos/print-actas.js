/**
 * modulo-0-datos/print-actas.js
 * Generador de PDF para Actas de Entrega y Reportes de Asignación (Mejorado para Megatech)
 */

const PrintActas = (() => {

  const cssGeneral = `
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; }
    .no-print { display: flex; gap: 10px; padding: 15px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; align-items: center; position: sticky; top: 0; z-index: 100; }
    .no-print button { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .no-print button:hover { background: #1d4ed8; }
    .no-print button.close { background: #ef4444; }
    .no-print button.close:hover { background: #b91c1c; }
    @media print { .no-print { display: none !important; } body { padding: 0 !important; } }
  `;

  function _getLogoHTML() {
    return `
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="background:#2563eb; color:white; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:24px; letter-spacing:-1px;">M</div>
        <div>
          <div style="font-size:18px; font-weight:900; color:#0f172a; letter-spacing:1px; line-height:1;">MEGATECH</div>
          <div style="font-size:10px; color:#64748b; font-weight:600; letter-spacing:2px;">ENTERPRISE</div>
        </div>
      </div>
    `;
  }

  function imprimirActa(equiposArray) {
    const equipos = Array.isArray(equiposArray) ? equiposArray : [equiposArray];
    const e = equipos[0] || {};
    const perifericos = equipos.slice(1);

    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) return alert('Permite las ventanas emergentes');

    const fechaGen = new Date().toLocaleDateString('es-PE');
    const docId = `ACT-${Math.floor(100000 + Math.random() * 900000)}`;

    const usuario = e.USUARIO_ASIGNADO || '________________________';
    const dni = e.DNI || '______________';
    const cargo = e.CARGO || '________________________';
    const area = e.AREA_DEPARTAMENTO || '________________________';

    const specs = [e.PROCESADOR, e.RAM, e.HD_SSD].filter(Boolean).join(' | ');

    let perifericosHtml = '';
    if (perifericos.length > 0) {
      perifericosHtml = `
        <div style="font-weight:800; margin-bottom:10px; color:#1e293b; font-size:11pt">🔌 Periféricos y Accesorios Adicionales Vinculados:</div>
        <table class="info-table" style="font-size:9.5pt; margin-bottom: 25px;">
          <thead>
            <tr>
              <th style="width:25%">Tipo</th>
              <th style="width:40%">Marca / Modelo</th>
              <th style="width:35%">N° Serie / Código</th>
            </tr>
          </thead>
          <tbody>
            ${perifericos.map(p => `<tr>
              <td>${p.TIP_EQUIP || '-'}</td>
              <td>${p.MARCA || '-'} / ${p.MODELO || '-'}</td>
              <td>SN: ${p.SERIE || '-'} &nbsp;|&nbsp; COD: ${p.CODIGO || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Acta de Entrega - ${e.CODIGO || e.SERIE || 'Equipo'}</title>
      <style>
        ${cssGeneral}
        @page { margin: 15mm; size: A4 portrait; }
        .acta-page { max-width: 210mm; margin: 0 auto; padding: 20px; font-size: 10.5pt; line-height: 1.5; color: #334155; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
        .title-box { text-align: right; }
        .title-box h1 { margin: 0; font-size: 18pt; color: #0f172a; font-weight: 800; letter-spacing: 0.5px; }
        .doc-info { margin-top: 5px; font-size: 10pt; color: #64748b; font-weight: 600; }
        .doc-info span { color: #0f172a; }
        
        .legal-paragraph { text-align: justify; margin-bottom: 25px; font-size: 11pt; }
        .highlight { color: #2563eb; font-weight: 700; }
        
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .info-table th, .info-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        .info-table th { background-color: #f8fafc; width: 35%; font-size: 10pt; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-table td { font-weight: 600; color: #0f172a; }
        
        .obs-box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; background: #f8fafc; min-height: 70px; margin-bottom: 25px; font-style: italic; color: #475569; }
        .warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 15px; border-radius: 0 6px 6px 0; font-size: 9.5pt; color: #991b1b; margin-bottom: 30px; }
        
        .split-wrapper { display: flex; border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
        .split-col { flex: 1; padding: 20px; display: flex; flex-direction: column; }
        .left-col { border-right: 2px solid #cbd5e1; background: #f8fafc; }
        .col-header { font-weight: 800; text-align: center; color: #1e293b; margin-bottom: 20px; font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; }
        
        .check-item { display: flex; align-items: center; margin-bottom: 12px; font-size: 9.5pt; font-weight: 700; color: #334155; }
        .checkbox { width: 18px; height: 18px; border: 2px solid #64748b; border-radius: 3px; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #2563eb; background: white; }
        
        .signature-area { margin-top: 50px; }
        .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
        .sig-line-group { text-align: center; width: 65%; }
        .sig-line { border-top: 2px solid #cbd5e1; padding-top: 8px; font-weight: 700; font-size: 9pt; color: #475569; }
        .fingerprint { width: 60px; height: 80px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #94a3b8; font-weight: 600; text-transform: uppercase; background: white; }
      </style>
    </head><body>
      <div class="no-print">
        <strong style="font-size:15px; color:#0f172a">Vista de Impresión - Acta</strong>
        <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        <button class="close" onclick="window.close()">✕ Cerrar</button>
      </div>
      
      <div class="acta-page">
        <div class="header">
          ${_getLogoHTML()}
          <div class="title-box">
            <h1>ACTA DE ENTREGA / DEVOLUCIÓN</h1>
            <div class="doc-info">DOC: <span>${docId}</span> &nbsp;|&nbsp; FECHA: <span>${fechaGen}</span></div>
          </div>
        </div>

        <div class="legal-paragraph">
          Consta por el presente documento la entrega/devolución del equipo tecnológico detallado a continuación. 
          Yo, <span class="highlight">${usuario}</span>, identificado(a) con DNI/CE N° <span class="highlight">${dni}</span>, 
          en mi calidad de <span class="highlight">${cargo}</span> del área de <span class="highlight">${area}</span>, 
          declaro bajo firma las siguientes características del bien:
        </div>

        <div style="font-weight:800; margin-bottom:10px; color:#1e293b; font-size:11pt">🖥️ Equipo Principal:</div>
        <table class="info-table">
          <tbody>
            <tr><th>Tipo / Descripción</th><td>${e.TIP_EQUIP || 'Equipo Informático'}</td></tr>
            <tr><th>Marca / Modelo</th><td>${e.MARCA || 'N/A'} / ${e.MODELO || 'N/A'}</td></tr>
            <tr><th>N° Serie / Código</th><td>SN: ${e.SERIE || '---'} &nbsp;|&nbsp; COD: ${e.CODIGO || '---'}</td></tr>
            <tr><th>Especificaciones</th><td>${specs || 'No detalladas'}</td></tr>
            <tr><th>IP / Perfil Red</th><td>IP: ${e.IP || 'DHCP'} &nbsp;|&nbsp; Perfil: ${e.PERFIL_RED || 'Estándar'}</td></tr>
          </tbody>
        </table>

        ${perifericosHtml}

        <div style="font-weight:700; margin-bottom:8px; color:#1e293b; font-size:11pt">Observaciones Adicionales:</div>
        <div class="obs-box">${e.OBSERVACION || 'Ninguna observación registrada al momento de la asignación.'}</div>

        <div class="warning-box">
          <strong>⚠️ TÉRMINOS Y CONDICIONES:</strong> El usuario asume total responsabilidad por el cuidado y salvaguarda del equipo entregado. En caso de robo, extravío, destrucción o averías ocasionadas por negligencia, el usuario deberá asumir la reposición o el pago de la penalidad establecida por MEGATECH.
        </div>

        <div class="split-wrapper">
          <div class="split-col left-col">
            <div class="col-header">1. Asignación Inicial</div>
            <div class="check-item"><div class="checkbox">✓</div> ENTREGA DE EQUIPO AL COLABORADOR</div>
            <div class="signature-area">
              <div class="sig-row">
                <div class="sig-line-group" style="width:100%"><div class="sig-line">ENTREGUÉ CONFORME (SOPORTE TI)</div></div>
              </div>
              <div class="sig-row">
                <div class="sig-line-group"><div class="sig-line">RECIBÍ CONFORME (TRABAJADOR)</div><div style="margin-top:4px; font-size:10px">${usuario}</div></div>
                <div class="fingerprint">Huella</div>
              </div>
            </div>
          </div>

          <div class="split-col">
            <div class="col-header">2. Devolución / Cese</div>
            <div class="check-item"><div class="checkbox"></div> DEVOLUCIÓN POR CESE</div>
            <div class="check-item"><div class="checkbox"></div> REPOSICIÓN O RENOVACIÓN</div>
            <div class="signature-area">
              <div class="sig-row">
                <div class="sig-line-group"><div class="sig-line">ENTREGUÉ CONFORME (TRABAJADOR)</div><div style="margin-top:4px; font-size:10px">${usuario}</div></div>
                <div class="fingerprint">Huella</div>
              </div>
              <div class="sig-row">
                <div class="sig-line-group" style="width:100%"><div class="sig-line">RECIBÍ CONFORME (SOPORTE TI)</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
  }

  function imprimirReporteGeneral(equipos) {
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return alert('Permite las ventanas emergentes');

    const fechaGen = new Date().toLocaleString('es-PE');
    
    const rows = equipos.map((e, index) => {
      let fotoHtml = '<div style="width:60px;height:60px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px">Sin foto</div>';
      if (e._fotos && e._fotos.length > 0) {
        let fUrl = e._fotos[0].url || e._fotos[0].preview || e._fotos[0];
        if (typeof fUrl === 'object' && fUrl.url) fUrl = fUrl.url;
        fotoHtml = `<img src="${fUrl}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1">`;
      }

      const estadoColor = e.ESTADO === 'M' ? '#ef4444' : (e.ESTADO === 'P' ? '#f59e0b' : '#22c55e');

      return `
        <tr>
          <td style="text-align:center; font-weight:bold; color:#64748b">${index + 1}</td>
          <td style="text-align:center">${fotoHtml}</td>
          <td>
            <div style="font-weight:700; color:#0f172a; margin-bottom:2px">${e.TIP_EQUIP || 'N/A'}</div>
            <div style="font-size:9pt; color:#475569">M: ${e.MARCA || '-'} | Mod: ${e.MODELO || '-'}</div>
            <div style="font-size:9pt; color:#475569; margin-top:4px"><span style="background:#e2e8f0; padding:2px 4px; border-radius:3px">SN: ${e.SERIE || '-'}</span></div>
          </td>
          <td>
            <div style="display:inline-block; background:#2563eb; color:white; padding:2px 6px; border-radius:4px; font-size:8pt; font-weight:bold; margin-bottom:4px">${e.AREA_DEPARTAMENTO || e.SUCURSAL || 'Sin Área'}</div>
            <div style="font-weight:600; color:#0f172a; font-size:9.5pt">${e.USUARIO_ASIGNADO || 'Sin Asignar'}</div>
            <div style="font-size:8.5pt; color:${estadoColor}; font-weight:700; margin-top:2px">Estado: ${e.ESTADO || '-'}</div>
          </td>
          <td>
            <ul class="data-list">
              <li><strong>CPU:</strong> ${e.PROCESADOR || '-'}</li>
              <li><strong>RAM:</strong> ${e.RAM || '-'}</li>
              <li><strong>Disco:</strong> ${e.HD_SSD || '-'}</li>
            </ul>
          </td>
          <td>
            <ul class="data-list">
              <li><strong>Perfil:</strong> ${e.PERFIL_RED || '-'}</li>
              <li><strong>IP:</strong> <span style="font-family:monospace; background:#f1f5f9; padding:1px 4px; border-radius:3px; border:1px solid #cbd5e1">${e.IP || 'DHCP'}</span></li>
              <li><strong>Obs:</strong> ${e.OBSERVACION || '-'}</li>
            </ul>
          </td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Asignaciones - Megatech</title>
      <style>
        ${cssGeneral}
        @page { margin: 10mm; size: A4 landscape; }
        .report-page { padding: 20px; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
        .report-title h1 { color: #0f172a; margin: 0 0 5px 0; font-size: 18pt; font-weight: 800; letter-spacing: 0.5px; }
        .report-meta { text-align: right; font-size: 10pt; color: #475569; }
        .report-meta strong { color: #0f172a; }
        
        .report-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        .report-table th { background: #1e293b; color: white; padding: 10px; text-align: left; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; font-size: 8.5pt; border: 1px solid #334155; }
        .report-table td { border: 1px solid #cbd5e1; padding: 10px; vertical-align: top; }
        .report-table tr:nth-child(even) td { background: #f8fafc; }
        
        ul.data-list { list-style: none; padding: 0; margin: 0; }
        ul.data-list li { margin-bottom: 4px; color: #475569; }
        ul.data-list strong { color: #1e293b; }
      </style>
    </head><body>
      <div class="no-print">
        <strong style="font-size:15px; color:#0f172a">Vista de Impresión - Reporte Asignaciones</strong>
        <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        <button class="close" onclick="window.close()">✕ Cerrar</button>
      </div>
      <div class="report-page">
        <div class="report-header">
          <div class="report-title">
            ${_getLogoHTML()}
            <h1 style="margin-top:15px">REPORTE GENERAL DE ASIGNACIONES</h1>
            <div style="color:#64748b; font-weight:600">INVENTARIO TECNOLÓGICO Y RESPONSABLES</div>
          </div>
          <div class="report-meta">
            <div style="margin-bottom:5px">Generado: <strong>${fechaGen}</strong></div>
            <div>Total Registros: <strong style="font-size:14pt; color:#2563eb">${equipos.length}</strong></div>
          </div>
        </div>
        
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:4%; text-align:center">N°</th>
              <th style="width:7%; text-align:center">Foto</th>
              <th style="width:20%">Identificación</th>
              <th style="width:22%">Área y Usuario</th>
              <th style="width:22%">Especificaciones</th>
              <th style="width:25%">Red y Accesos</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </body></html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
  }

  return { imprimirActa, imprimirReporteGeneral };
})();

window.PrintActas = PrintActas;
