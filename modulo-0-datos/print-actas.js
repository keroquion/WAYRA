/**
 * modulo-0-datos/print-actas.js
 * Generador de PDF para Actas de Entrega y Reportes de Asignación (Mejorado para Megatech)
 */

const PrintActas = (() => {

  /* ─────────────────────────────────────────────────────────────
   *  BARRA DE HERRAMIENTAS (no se imprime)
   * ───────────────────────────────────────────────────────────── */
  const cssNoPrint = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; padding: 2rem 1rem; }
    .toolbar {
      position: sticky; top: 0; z-index: 200;
      display: flex; gap: 10px; align-items: center;
      padding: 12px 20px;
      background: #0b2253; color: white;
      font-family: 'Inter', sans-serif;
      font-size: 14px; font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .toolbar span { flex: 1; }
    .toolbar button {
      border: none; cursor: pointer; border-radius: 6px;
      padding: 7px 18px; font-weight: 700; font-size: 13px;
    }
    .btn-print { background: white; color: #0b2253; }
    .btn-close { background: #ef4444; color: white; }
    .a4-container {
      max-width: 900px; margin: 0 auto; background-color: white;
      padding: 3rem 4rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      border: 1px solid #e5e7eb;
    }
    @media print {
      .toolbar { display: none !important; }
      body { background: white !important; padding: 0 !important; }
      .a4-container { box-shadow: none !important; border: none !important; padding: 20mm 15mm !important; }
    }
    /* checkbox custom */
    input[type="checkbox"] { width: 1.1rem; height: 1.1rem; accent-color: #0b2253; cursor: default; }
  `;

  /* ─────────────────────────────────────────────────────────────
   *  FUNCIÓN PRINCIPAL - ACTA DE ENTREGA / DEVOLUCIÓN
   * ───────────────────────────────────────────────────────────── */
  function imprimirActa(equiposArray, isDevolucion = false) {
    const equipos  = Array.isArray(equiposArray) ? equiposArray : [equiposArray];
    const e        = equipos[0] || {};
    const perifericos = equipos.slice(1);

    const win = window.open('', '_blank', 'width=960,height=920');
    if (!win) return alert('Permite las ventanas emergentes para generar el acta.');

    const fechaGen = new Date().toLocaleDateString('es-PE');
    const docId    = `ACT-${Math.floor(100000 + Math.random() * 900000)}`;

    const usuario = e.USUARIO_ASIGNADO || '________________________';
    const dni     = e.DNI             || '______________';
    const cargo   = e.CARGO           || '________________________';
    const area    = e.AREA_DEPARTAMENTO || '________________________';

    const specs = [e.PROCESADOR, e.RAM, e.HD_SSD].filter(Boolean).join(' | ');

    /* ── Filas de periféricos ── */
    const perifRows = perifericos.length > 0
      ? perifericos.map(p => `
          <tr>
            <td style="padding:10px 12px 10px 20px; color:#111827; font-size:0.75rem; text-transform:uppercase; border-right:1px solid #d1d5db; text-align:left;">${p.TIP_EQUIP || '-'}</td>
            <td style="padding:10px 12px; color:#111827; font-size:0.75rem; text-transform:uppercase; border-right:1px solid #d1d5db; text-align:center;">${p.MARCA || '-'} / ${p.MODELO || '-'}</td>
            <td style="padding:10px 12px; color:#111827; font-size:0.75rem; text-transform:uppercase; text-align:center;">SN: ${p.SERIE || 'N/A'} <span style="color:#d1d5db; margin:0 6px;">|</span> COD: ${p.CODIGO || '-'}</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding:12px; color:#9ca3af; font-style:italic; font-size:0.8rem; text-align:center;">Sin periféricos adicionales vinculados.</td></tr>`;

    /* ══════════════════════════════════════════════════════════
     *  HTML GENERADO — misma estructura que acta_de_entrega.html
     * ══════════════════════════════════════════════════════════ */
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acta de Entrega - ${docId}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${cssNoPrint}</style>
</head>
<body>

  <!-- Barra de herramientas (no se imprime) -->
  <div class="toolbar">
    <span>📄 ${isDevolucion ? 'Acta de Devolución' : 'Acta de Entrega'} — ${docId}</span>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
  </div>

  <!-- ════ HOJA A4 ════ -->
  <div class="a4-container border border-gray-200">

    <!-- Header -->
    <div class="flex justify-between items-end border-b border-gray-300 pb-3 mb-6">
      <div class="flex items-center gap-4">
        <div class="bg-[#0b2253] text-white text-4xl font-bold w-14 h-14 flex items-center justify-center rounded-sm">M</div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-[#0b2253] leading-none">MEGATECH</span>
          <span class="text-[0.7rem] tracking-[0.3em] text-gray-500 mt-1">ENTERPRISE</span>
        </div>
      </div>
      <div class="text-right">
        <h1 class="text-[1.65rem] font-bold text-[#0b2253] mb-2 tracking-tight">ACTA DE ENTREGA / DEVOLUCIÓN</h1>
        <div class="text-xs font-bold text-gray-800 tracking-wide">
          DOC: ${docId} <span class="mx-2 text-gray-300 font-normal">|</span> FECHA: ${fechaGen}
        </div>
      </div>
    </div>

    <!-- Introducción -->
    <p class="text-[0.9rem] text-gray-800 mb-6 text-justify leading-relaxed">
      Consta por el presente documento la entrega/devolución del equipo tecnológico detallado a continuación. Yo,
      <span class="font-bold text-[#0b2253]">${usuario}</span> identificado(a) con DNI/CE N° <span class="font-bold text-[#0b2253]">${dni}</span>,
      en mi calidad de <span class="font-bold text-[#0b2253]">${cargo}</span> del área de <span class="font-bold text-[#0b2253]">${area}</span>,
      declaro bajo firma las siguientes características del bien:
    </p>

    <!-- ── SECCIÓN 1: EQUIPO PRINCIPAL ── -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-3">
        <div class="bg-[#0b2253] text-white font-bold w-7 h-7 flex items-center justify-center rounded-sm text-sm">1.</div>
        <h2 class="font-bold text-[#0b2253] text-[0.95rem]">EQUIPO PRINCIPAL</h2>
      </div>
      <div class="border border-gray-300 rounded-sm overflow-hidden">
        <table class="w-full text-sm text-left border-collapse">
          <tbody>
            <tr class="border-b border-gray-300">
              <th class="bg-[#f8f9fa] w-[30%] p-3 text-gray-700 font-bold border-r border-gray-300 text-xs">TIPO / DESCRIPCIÓN</th>
              <td class="p-3 text-gray-800">${e.TIP_EQUIP || 'Equipo Informático'}</td>
            </tr>
            <tr class="border-b border-gray-300">
              <th class="bg-[#f8f9fa] p-3 text-gray-700 font-bold border-r border-gray-300 text-xs">MARCA / MODELO</th>
              <td class="p-3 text-gray-800">${e.MARCA || 'N/A'} / ${e.MODELO || 'N/A'}</td>
            </tr>
            <tr class="border-b border-gray-300">
              <th class="bg-[#f8f9fa] p-3 text-gray-700 font-bold border-r border-gray-300 text-xs">N° SERIE / CÓDIGO</th>
              <td class="p-3 text-gray-800">SN: ${e.SERIE || 'N/A'} <span class="mx-2 text-gray-300">|</span> COD: ${e.CODIGO || 'N/A'}</td>
            </tr>
            <tr class="border-b border-gray-300">
              <th class="bg-[#f8f9fa] p-3 text-gray-700 font-bold border-r border-gray-300 text-xs">ESPECIFICACIONES</th>
              <td class="p-3 text-gray-800">${specs || 'No detalladas'}</td>
            </tr>
            <tr>
              <th class="bg-[#f8f9fa] p-3 text-gray-700 font-bold border-r border-gray-300 text-xs">IP / PERFIL RED</th>
              <td class="p-3 text-gray-800">IP: ${e.IP || 'DHCP'} <span class="mx-2 text-gray-300">|</span> Perfil: ${e.PERFIL_RED || 'Estándar'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── SECCIÓN 2: PERIFÉRICOS ── -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-3">
        <div class="bg-[#0b2253] text-white font-bold w-7 h-7 flex items-center justify-center rounded-sm text-sm">2.</div>
        <h2 class="font-bold text-[#0b2253] text-[0.95rem]">PERIFÉRICOS Y ACCESORIOS ADICIONALES VINCULADOS</h2>
      </div>
      <div class="border border-gray-300 rounded-sm overflow-hidden">
        <table class="w-full text-sm text-center border-collapse">
          <thead>
            <tr class="bg-[#f8f9fa] border-b border-gray-300">
              <th class="p-3 text-gray-700 font-bold border-r border-gray-300 text-xs w-[30%] text-left pl-6">TIPO</th>
              <th class="p-3 text-gray-700 font-bold border-r border-gray-300 text-xs w-[35%]">MARCA / MODELO</th>
              <th class="p-3 text-gray-700 font-bold text-xs w-[35%]">N° SERIE / CÓDIGO</th>
            </tr>
          </thead>
          <tbody>${perifRows}</tbody>
        </table>
      </div>
    </div>

    <!-- ── SECCIÓN 3: OBSERVACIONES ── -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-3">
        <div class="bg-[#0b2253] text-white font-bold w-7 h-7 flex items-center justify-center rounded-sm text-sm">3.</div>
        <h2 class="font-bold text-[#0b2253] text-[0.95rem]">OBSERVACIONES ADICIONALES</h2>
      </div>
      <div class="border border-gray-300 bg-[#f8f9fa] p-4 text-[0.9rem] text-gray-800 rounded-sm min-h-[60px]">
        ${e.OBSERVACION || '<span class="text-gray-400 italic">Sin observaciones registradas.</span>'}
      </div>
    </div>

    <!-- ── TÉRMINOS Y CONDICIONES ── -->
    <div class="bg-[#fff5f5] border-l-4 border-red-600 p-4 flex gap-4 mb-8 rounded-r-sm">
      <div class="text-red-600 mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <div class="text-[0.85rem] text-gray-800 leading-relaxed">
        <span class="font-bold text-red-600 uppercase">Términos y Condiciones:</span> El usuario asume total responsabilidad por el cuidado y salvaguarda del equipo entregado.
        En caso de robo, extravío, destrucción o averías ocasionadas por negligencia, el usuario deberá asumir la reposición o el pago de la penalidad establecida por MEGATECH.
      </div>
    </div>

    <!-- ── SECCIONES 4 y 5: ASIGNACIÓN / DEVOLUCIÓN ── -->
    <div class="flex border border-gray-300 rounded-lg overflow-hidden">

      <!-- Columna izquierda: Asignación Inicial -->
      <div class="w-1/2 border-r border-gray-300 flex flex-col">
        <div class="bg-[#0b2253] text-white text-center font-bold text-[0.85rem] py-2.5">
          4. ASIGNACIÓN INICIAL
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <div style="min-height:72px;">
            <label class="flex items-center gap-3 text-xs font-bold text-[#0b2253]">
              <input type="checkbox" ${!isDevolucion ? 'checked' : ''} disabled class="border-gray-400 rounded-sm">
              ENTREGA DE EQUIPO AL COLABORADOR
            </label>
          </div>
          <div class="flex flex-col gap-8 mt-auto">
            <!-- Firma 1 -->
            <div class="flex items-end justify-between gap-6">
              <div class="flex-grow text-center text-[0.7rem] pt-2 border-t border-gray-400 h-[4rem]">
                <div class="font-semibold text-gray-800 mb-0.5">ENTREGUÉ CONFORME (SOPORTE TI)</div>
              </div>
              <div class="w-[4.5rem] h-[4.5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-1">HUELLA</div>
            </div>
            <!-- Firma 2 -->
            <div class="flex items-end justify-between gap-6">
              <div class="flex-grow text-center text-[0.7rem] pt-2 border-t border-gray-400 h-[4rem]">
                <div class="font-semibold text-gray-800 mb-0.5">RECIBÍ CONFORME (TRABAJADOR)</div>
                <div class="text-gray-600">${usuario}</div>
              </div>
              <div class="w-[4.5rem] h-[4.5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-1">HUELLA</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna derecha: Devolución / Cese -->
      <div class="w-1/2 flex flex-col">
        <div class="bg-[#0b2253] text-white text-center font-bold text-[0.85rem] py-2.5">
          5. DEVOLUCIÓN / CESE
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <div style="min-height:72px;">
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-3 text-xs font-bold text-[#0b2253]">
                <input type="checkbox" ${isDevolucion ? 'checked' : ''} disabled class="border-gray-400 rounded-sm"> DEVOLUCIÓN POR CESE
              </label>
              <label class="flex items-center gap-3 text-xs font-bold text-[#0b2253]">
                <input type="checkbox" disabled class="border-gray-400 rounded-sm"> REPOSICIÓN O RENOVACIÓN
              </label>
            </div>
          </div>
          <div class="flex flex-col gap-8 mt-auto">
            <!-- Firma 3 -->
            <div class="flex items-end justify-between gap-6">
              <div class="flex-grow text-center text-[0.7rem] pt-2 border-t border-gray-400 h-[4rem]">
                <div class="font-semibold text-gray-800 mb-0.5">ENTREGUÉ CONFORME<br>(TRABAJADOR)</div>
                <div class="text-gray-600">${usuario}</div>
              </div>
              <div class="w-[4.5rem] h-[4.5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-1">HUELLA</div>
            </div>
            <!-- Firma 4 -->
            <div class="flex items-end justify-between gap-6">
              <div class="flex-grow text-center text-[0.7rem] pt-2 border-t border-gray-400 h-[4rem]">
                <div class="font-semibold text-gray-800 mb-0.5">RECIBÍ CONFORME (SOPORTE TI)</div>
              </div>
              <div class="w-[4.5rem] h-[4.5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-1">HUELLA</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="mt-6 text-center text-[0.75rem] text-gray-400">
      Este documento es válido únicamente con firmas y huellas completas.
    </div>

  </div><!-- /a4-container -->

</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
  }

  /* ─────────────────────────────────────────────────────────────
   *  REPORTE GENERAL DE ASIGNACIONES (sin cambios)
   * ───────────────────────────────────────────────────────────── */
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
            <div style="display:inline-block; background:#0b2253; color:white; padding:2px 6px; border-radius:4px; font-size:8pt; font-weight:bold; margin-bottom:4px">${e.AREA_DEPARTAMENTO || e.SUCURSAL || 'Sin Área'}</div>
            <div style="font-weight:600; color:#0f172a; font-size:9.5pt">${e.USUARIO_ASIGNADO || 'Sin Asignar'}</div>
            <div style="font-size:8.5pt; color:${estadoColor}; font-weight:700; margin-top:2px">Estado: ${e.ESTADO || '-'}</div>
          </td>
          <td>
            <ul style="list-style:none;padding:0;margin:0;">
              <li style="margin-bottom:4px;color:#475569"><strong style="color:#1e293b">CPU:</strong> ${e.PROCESADOR || '-'}</li>
              <li style="margin-bottom:4px;color:#475569"><strong style="color:#1e293b">RAM:</strong> ${e.RAM || '-'}</li>
              <li style="margin-bottom:4px;color:#475569"><strong style="color:#1e293b">Disco:</strong> ${e.HD_SSD || '-'}</li>
            </ul>
          </td>
          <td>
            <ul style="list-style:none;padding:0;margin:0;">
              <li style="margin-bottom:4px;color:#475569"><strong style="color:#1e293b">Perfil:</strong> ${e.PERFIL_RED || '-'}</li>
              <li style="margin-bottom:4px;color:#475569"><strong style="color:#1e293b">IP:</strong> <span style="font-family:monospace;background:#f1f5f9;padding:1px 4px;border-radius:3px;border:1px solid #cbd5e1">${e.IP || 'DHCP'}</span></li>
              <li style="margin-bottom:4px;color:#475569"><strong style="color:#1e293b">Obs:</strong> ${e.OBSERVACION || '-'}</li>
            </ul>
          </td>
        </tr>
      `;
    }).join('');

    const cssReport = `
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; }
      .no-print { display: flex; gap: 10px; padding: 15px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; align-items: center; position: sticky; top: 0; z-index: 100; }
      .no-print button { background: #0b2253; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }
      .no-print button.close { background: #ef4444; }
      @media print { .no-print { display: none !important; } }
      @page { margin: 10mm; size: A4 landscape; }
      .report-page { padding: 20px; }
      .report-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #0b2253; padding-bottom: 15px; margin-bottom: 20px; }
      .report-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
      .report-table th { background: #0b2253; color: white; padding: 10px; text-align: left; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; font-size: 8.5pt; border: 1px solid #1e3a6e; }
      .report-table td { border: 1px solid #cbd5e1; padding: 10px; vertical-align: top; }
      .report-table tr:nth-child(even) td { background: #f8fafc; }
    `;

    const logoHtml = `
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="background:#0b2253; color:white; width:40px; height:40px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:24px;">M</div>
        <div>
          <div style="font-size:18px; font-weight:900; color:#0b2253; letter-spacing:1px; line-height:1;">MEGATECH</div>
          <div style="font-size:10px; color:#64748b; font-weight:600; letter-spacing:2px;">ENTERPRISE</div>
        </div>
      </div>`;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Asignaciones - Megatech</title>
      <style>${cssReport}</style>
    </head><body>
      <div class="no-print">
        <strong style="font-size:15px; color:#0b2253; flex:1">Vista de Impresión - Reporte Asignaciones</strong>
        <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        <button class="close" onclick="window.close()">✕ Cerrar</button>
      </div>
      <div class="report-page">
        <div class="report-header">
          <div>
            ${logoHtml}
            <h1 style="margin-top:15px; color:#0b2253; font-size:18pt; font-weight:800;">REPORTE GENERAL DE ASIGNACIONES</h1>
            <div style="color:#64748b; font-weight:600;">INVENTARIO TECNOLÓGICO Y RESPONSABLES</div>
          </div>
          <div style="text-align:right; font-size:10pt; color:#475569;">
            <div style="margin-bottom:5px">Generado: <strong style="color:#0b2253">${fechaGen}</strong></div>
            <div>Total Registros: <strong style="font-size:14pt; color:#0b2253">${equipos.length}</strong></div>
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

  /* ─────────────────────────────────────────────────────────────
   *  FORMATO DE CAPACITACIÓN (NUEVO)
   * ───────────────────────────────────────────────────────────── */
  function imprimirCapacitacion(usuarioData) {
    const win = window.open('', '_blank', 'width=960,height=920');
    if (!win) return alert('Permite las ventanas emergentes.');

    const fechaGen = new Date().toLocaleDateString('es-PE');
    const docId    = `CAP-${Math.floor(100000 + Math.random() * 900000)}`;

    const usuario = usuarioData.USUARIO_ASIGNADO || '________________________';
    const dni     = usuarioData.DNI             || '______________';
    const cargo   = usuarioData.CARGO           || '________________________';
    const area    = usuarioData.AREA_DEPARTAMENTO || '________________________';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Registro de Capacitación - ${docId}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${cssNoPrint}</style>
</head>
<body>
  <div class="toolbar">
    <span>📄 Registro de Capacitación — ${docId}</span>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
  </div>

  <div class="a4-container border border-gray-200" style="min-height: 297mm; display:flex; flex-direction:column;">
    
    <!-- Header -->
    <div class="flex justify-between items-end border-b border-gray-300 pb-3 mb-8">
      <div class="flex items-center gap-4">
        <div class="bg-[#0b2253] text-white text-4xl font-bold w-14 h-14 flex items-center justify-center rounded-sm">M</div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-[#0b2253] leading-none">MEGATECH</span>
          <span class="text-[0.7rem] tracking-[0.3em] text-gray-500 mt-1">ENTERPRISE</span>
        </div>
      </div>
      <div class="text-right">
        <h1 class="text-[1.65rem] font-bold text-[#0b2253] mb-2 tracking-tight">REGISTRO DE CAPACITACIÓN</h1>
        <div class="text-xs font-bold text-gray-800 tracking-wide">
          DOC: ${docId} <span class="mx-2 text-gray-300 font-normal">|</span> FECHA: ${fechaGen}
        </div>
      </div>
    </div>

    <!-- Introducción -->
    <p class="text-[0.95rem] text-gray-800 mb-8 text-justify leading-relaxed">
      Por medio del presente documento, yo, <span class="font-bold text-[#0b2253] border-b border-gray-300 pb-0.5 inline-block min-w-[200px] text-center">${usuario}</span> identificado(a) con DNI/CE N° <span class="font-bold text-[#0b2253] border-b border-gray-300 pb-0.5 inline-block min-w-[100px] text-center">${dni}</span>, en mi calidad de <span class="font-bold text-[#0b2253] border-b border-gray-300 pb-0.5 inline-block min-w-[150px] text-center">${cargo}</span> del área de <span class="font-bold text-[#0b2253] border-b border-gray-300 pb-0.5 inline-block min-w-[150px] text-center">${area}</span>, declaro haber recibido la inducción y capacitación correspondiente a mis funciones operativas y manejo de sistemas/equipos por parte del área de Soporte TI.
    </p>

    <!-- Tema de Capacitación -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-3">
        <div class="bg-[#0b2253] text-white font-bold w-7 h-7 flex items-center justify-center rounded-sm text-sm">1.</div>
        <h2 class="font-bold text-[#0b2253] text-[0.95rem] uppercase">Temas Impartidos y Evaluados</h2>
      </div>
      <div class="border border-gray-400 rounded-sm p-4 h-[250px] flex flex-col gap-6">
        <div class="border-b border-dashed border-gray-300 w-full pt-8"></div>
        <div class="border-b border-dashed border-gray-300 w-full pt-8"></div>
        <div class="border-b border-dashed border-gray-300 w-full pt-8"></div>
        <div class="border-b border-dashed border-gray-300 w-full pt-8"></div>
        <div class="border-b border-dashed border-gray-300 w-full pt-8"></div>
      </div>
    </div>

    <!-- Declaración Final -->
    <div class="bg-[#f8f9fa] border border-gray-300 p-5 text-[0.85rem] text-gray-700 leading-relaxed rounded-sm mb-auto">
      <strong class="text-[#0b2253]">Declaración del Trabajador:</strong> Entiendo completamente los procedimientos, normativas de seguridad y el uso correcto de los recursos tecnológicos que me han sido explicados. Me comprometo a cumplir con las políticas de uso establecidas por la empresa.
    </div>

    <!-- Firmas (pegadas al fondo) -->
    <div class="flex border border-gray-300 rounded-lg overflow-hidden mt-12">
      <!-- Columna 1 -->
      <div class="w-1/2 border-r border-gray-300 p-8 flex flex-col justify-end min-h-[220px]">
        <div class="flex items-end justify-between gap-6">
          <div class="flex-grow text-center text-[0.75rem] pt-3 border-t border-gray-400">
            <div class="font-semibold text-gray-800 mb-0.5">CAPACITADOR (SOPORTE TI)</div>
          </div>
          <div class="w-[5rem] h-[5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-2">HUELLA</div>
        </div>
      </div>
      <!-- Columna 2 -->
      <div class="w-1/2 p-8 flex flex-col justify-end min-h-[220px]">
        <div class="flex items-end justify-between gap-6">
          <div class="flex-grow text-center text-[0.75rem] pt-3 border-t border-gray-400">
            <div class="font-semibold text-gray-800 mb-0.5">RECIBÍ CONFORME (TRABAJADOR)</div>
            <div class="text-[#0b2253] font-bold mt-1">${usuario}</div>
          </div>
          <div class="w-[5rem] h-[5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-2">HUELLA</div>
        </div>
      </div>
    </div>
    
  </div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
  }

  /* ─────────────────────────────────────────────────────────────
   *  FORMATO DE REGULARIZACIÓN DE STOCK Y EXTRAORDINARIOS (NUEVO)
   * ───────────────────────────────────────────────────────────── */
  function imprimirRegularizacion(usuarioData) {
    const win = window.open('', '_blank', 'width=960,height=920');
    if (!win) return alert('Permite las ventanas emergentes.');

    const fechaGen = new Date().toLocaleDateString('es-PE');
    const docId    = `REG-${Math.floor(100000 + Math.random() * 900000)}`;

    const usuario  = usuarioData.USUARIO_ASIGNADO || '________________________';
    const dni      = usuarioData.DNI             || '______________';
    const sucursal = usuarioData.SUCURSAL        || '________________________';

    // Obtener periféricos vinculados para listarlos si existen
    const equipoPrincipalText = `${usuarioData.TIP_EQUIP || 'Equipo'} - ${usuarioData.MARCA || ''} ${usuarioData.MODELO || ''} (SN: ${usuarioData.SERIE || 'N/A'})`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Regularización de Stock - ${docId}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${cssNoPrint}</style>
</head>
<body>
  <div class="toolbar">
    <span>📄 Regularización de Stock / Extraordinarios — ${docId}</span>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
  </div>

  <div class="a4-container border border-gray-200" style="min-height: 297mm; display:flex; flex-direction:column;">
    
    <!-- Header -->
    <div class="flex justify-between items-end border-b border-gray-300 pb-3 mb-8">
      <div class="flex items-center gap-4">
        <div class="bg-[#0b2253] text-white text-4xl font-bold w-14 h-14 flex items-center justify-center rounded-sm">M</div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-[#0b2253] leading-none">MEGATECH</span>
          <span class="text-[0.7rem] tracking-[0.3em] text-gray-500 mt-1">ENTERPRISE</span>
        </div>
      </div>
      <div class="text-right">
        <h1 class="text-[1.35rem] font-bold text-[#0b2253] mb-2 tracking-tight">REGULARIZACIÓN / EXTRAORDINARIO</h1>
        <div class="text-xs font-bold text-gray-800 tracking-wide">
          DOC: ${docId} <span class="mx-2 text-gray-300 font-normal">|</span> FECHA: ${fechaGen}
        </div>
      </div>
    </div>

    <!-- Introducción -->
    <p class="text-[0.95rem] text-gray-800 mb-6 text-justify leading-relaxed">
      Conste por el presente documento la regularización de stock o evento extraordinario relacionado con el inventario tecnológico de la empresa. Yo, <span class="font-bold text-[#0b2253] border-b border-gray-300 pb-0.5 inline-block min-w-[200px] text-center">${usuario}</span> identificado(a) con DNI/CE N° <span class="font-bold text-[#0b2253] border-b border-gray-300 pb-0.5 inline-block min-w-[100px] text-center">${dni}</span>, laborando actualmente en la ubicación/sucursal <span class="font-bold text-[#0b2253] border-b border-gray-300 pb-0.5 inline-block min-w-[150px] text-center">${sucursal}</span>, declaro y justifico el siguiente suceso asociado al equipo <span class="font-bold text-gray-700">${equipoPrincipalText}</span>:
    </p>

    <!-- Detalle de Regularización -->
    <div class="mb-8 flex-grow">
      <div class="flex items-center gap-3 mb-3">
        <div class="bg-[#0b2253] text-white font-bold w-7 h-7 flex items-center justify-center rounded-sm text-sm">1.</div>
        <h2 class="font-bold text-[#0b2253] text-[0.95rem] uppercase">Detalle y Justificación del Evento</h2>
      </div>
      <div class="border border-gray-400 rounded-sm p-4 min-h-[350px] flex flex-col gap-8 relative bg-[#f8fafc]">
        <div class="absolute inset-0 p-4 flex flex-col gap-8 pointer-events-none">
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
          <div class="border-b border-dashed border-gray-300 w-full pt-6"></div>
        </div>
      </div>
    </div>

    <!-- Declaración Final -->
    <div class="bg-[#f8f9fa] border border-gray-300 p-5 text-[0.85rem] text-gray-700 leading-relaxed rounded-sm mb-auto">
      <strong class="text-[#0b2253]">Términos de la Regularización:</strong> El presente documento sirve como sustento para las auditorías de inventario de Soporte TI. El trabajador firmante da fe de que la información declarada en el bloque superior es verídica y asume la responsabilidad sobre la justificación presentada.
    </div>

    <!-- Firmas (pegadas al fondo) -->
    <div class="flex border border-gray-300 rounded-lg overflow-hidden mt-8">
      <!-- Columna 1 -->
      <div class="w-1/2 border-r border-gray-300 p-8 flex flex-col justify-end min-h-[220px]">
        <div class="flex items-end justify-between gap-6">
          <div class="flex-grow text-center text-[0.75rem] pt-3 border-t border-gray-400">
            <div class="font-semibold text-gray-800 mb-0.5">AUTORIZADO / RECIBIDO POR (SOPORTE TI)</div>
          </div>
          <div class="w-[5rem] h-[5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-2">HUELLA</div>
        </div>
      </div>
      <!-- Columna 2 -->
      <div class="w-1/2 p-8 flex flex-col justify-end min-h-[220px]">
        <div class="flex items-end justify-between gap-6">
          <div class="flex-grow text-center text-[0.75rem] pt-3 border-t border-gray-400">
            <div class="font-semibold text-gray-800 mb-0.5">DECLARANTE (TRABAJADOR)</div>
            <div class="text-[#0b2253] font-bold mt-1">${usuario}</div>
          </div>
          <div class="w-[5rem] h-[5rem] border-[1.5px] border-dashed border-gray-400 rounded-md flex items-center justify-center text-[0.65rem] text-gray-400 font-semibold mb-2">HUELLA</div>
        </div>
      </div>
    </div>
    
  </div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
  }

  return { imprimirActa, imprimirReporteGeneral, imprimirCapacitacion, imprimirRegularizacion };
})();

window.PrintActas = PrintActas;
