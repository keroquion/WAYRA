/**
 * modulo-2-reportes/plantillas/ticket-soporte.js
 * Genera el HTML de un ticket de soporte técnico individual.
 * Versión rediseñada: Estándar corporativo bilingüe e internacional (ES/EN) para inspección y pedido de repuestos (China).
 */

const PlantillaTicketSoporte = (() => {

  // Opciones por defecto — todas activas
  const DEFAULTS = {
    mostrarEncabezado:   true,
    mostrarDatosEquipo:  true,
    mostrarCamposEquipo: {
      CODIGO: true, MARCA: true, MODELO: true, SERIE: true,
      TIP_EQUIP: true, PROCESADOR: true, RAM: true, HD_SSD: true, TECNICO: true,
    },
    mostrarFalla:        true,
    mostrarObservacion:  true,
    mostrarDiagnostico:  true,
    mostrarGemini:       true,
    mostrarRepuestos:    true,
    mostrarFotos:        true,
    mostrarLote:         true,
    mostrarFecha:        true,
  };

  function generar(equipo, lote, opcionesUsuario) {
    const opc = _merge(DEFAULTS, opcionesUsuario || {});
    const eq  = equipo;
    const ahora    = new Date().toLocaleDateString('es-PE', { year:'numeric', month:'long', day:'numeric' });
    const fechaMod = eq._lastModified ? new Date(eq._lastModified).toLocaleString('es-PE') : '—';
    const estado   = eq._estadoSoporte || 'Pendiente';

    // Configuración de estados de soporte
    const estadoMap = {
      'Listo para entrega': { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅', labelEN: 'Ready for Delivery' },
      'En diagnóstico':     { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '🔍', labelEN: 'In Diagnosis' },
      'En reparación':      { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '🔧', labelEN: 'Under Repair' },
      'Esperando repuesto': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '⏳', labelEN: 'Awaiting Spare Part' },
      'Sin solución':       { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '❌', labelEN: 'No Solution' },
      'Pendiente':          { color: '#4b5563', bg: '#f9fafb', border: '#e5e7eb', icon: '⏸️', labelEN: 'Pending' },
    };
    const est = estadoMap[estado] || estadoMap['Pendiente'];

    // ── FOTOS: usar URL original o preview, con fallback ──────
    const fotosArr = opc.mostrarFotos
      ? (eq._fotos || []).slice(0, 6).filter(f => f.url || f.thumbUrl || f.preview)
      : [];

    const hasFotos = fotosArr.length > 0;
    const fotosSrc = fotosArr.map(f => f.url || f.preview || f.thumbUrl || '');

    // ── CABECERA Y METADATOS ─────────────────────────────────
    const headerHtml = opc.mostrarEncabezado ? `
      <div style="
        background:#1e293b;
        border-bottom:3px solid #0f172a;
        padding:12px 18px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        flex-wrap:wrap;
        gap:10px;
      ">
        <div>
          <div style="font-size:14px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;text-transform:uppercase;">
            🛠️ TECHNICAL SUPPORT &amp; PARTS REPLACEMENT REPORT
          </div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px;font-weight:500;">
            Reporte Técnico de Soporte y Diagnóstico de Equipos (Inspección y Garantía)
          </div>
        </div>
        <div style="
          background:${est.bg};
          border:1px solid ${est.border};
          border-radius:4px;
          padding:4px 10px;
          font-size:10px;
          font-weight:700;
          color:${est.color};
          white-space:nowrap;
          text-align:right;
        ">
          <span style="font-size:11px;margin-right:3px;">${est.icon}</span> 
          <span>${_esc(estado).toUpperCase()} / ${est.labelEN.toUpperCase()}</span>
        </div>
      </div>
      
      <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:6px 18px;display:flex;justify-content:space-between;font-size:9.5px;color:#64748b;flex-wrap:wrap;gap:8px;">
        ${opc.mostrarLote ? `<span><strong>LOTE / BATCH:</strong> <span style="color:#334155">${_esc(lote?.titulo || '—')}</span></span>` : ''}
        ${opc.mostrarFecha ? `<span><strong>EMISIÓN / ISSUED:</strong> <span style="color:#334155">${ahora}</span></span>` : ''}
        <span><strong>ÚLTIMA MODIFICACIÓN / UPDATED:</strong> <span style="color:#334155">${fechaMod}</span></span>
      </div>
    ` : '';

    // ── SECCIÓN 1: DETALLES DEL EQUIPO ──────────────────────
    let infoTableHtml = '';
    if (opc.mostrarDatosEquipo) {
      infoTableHtml = `
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10.5px;font-family:inherit;">
          <thead>
            <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
              <th colspan="4" style="text-align:left;padding:6px 10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;font-size:9px;">
                💻 INFORMACIÓN DEL EQUIPO / DEVICE SPECIFICATIONS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="width:25%;padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">CÓDIGO / DEVICE CODE</td>
              <td style="width:25%;padding:6px 10px;border:1px solid #e2e8f0;font-weight:700;color:#0f172a;${eq.CODIGO?'border-left:3px solid #7c3aed;':''}">
                ${_esc(eq.CODIGO || '—')}
              </td>
              <td style="width:25%;padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">TIPO / DEVICE TYPE</td>
              <td style="width:25%;padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;color:#0f172a;">
                ${_esc(eq.TIP_EQUIP || eq.TIPO_EQUIPO || '—').toUpperCase()}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">MARCA / BRAND</td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;color:#0f172a;">
                ${_esc(eq.MARCA || '—').toUpperCase()}
              </td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">MODELO / MODEL</td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;color:#0f172a;">
                ${_esc(eq.MODELO || '—')}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">N° SERIE / SERIAL NUMBER (S/N)</td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:700;color:#000000;font-family:monospace;font-size:11.5px;background:#fbfbfe;${eq.SERIE?'border-left:3px solid #0891b2;':''}">
                ${_esc(eq.SERIE || '—').toUpperCase()}
              </td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">TÉCNICO / TECHNICIAN</td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;color:#0f172a;">
                ${_esc(eq._tecnico || '—')}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">PROCESADOR / CPU</td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;color:#334155;">
                ${_esc(eq.PROCESADOR || '—')}
              </td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#475569;">RAM / ALMACENAMIENTO (STORAGE)</td>
              <td style="padding:6px 10px;border:1px solid #e2e8f0;color:#334155;">
                ${_esc(eq.RAM || '—')} / ${_esc(eq.HD_SSD || eq.DISCO || '—')}
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    // ── SECCIÓN 2: FALLAS Y DIAGNÓSTICO ─────────────────────
    let diagnosisTableHtml = '';
    if (opc.mostrarFalla || opc.mostrarObservacion || opc.mostrarDiagnostico) {
      const geminiData = eq._geminiData;
      const geminiHtml = (opc.mostrarGemini && geminiData) ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:3px solid #16a34a;border-radius:4px;padding:8px 12px;margin-top:10px;font-size:10.5px;">
          <div style="font-size:9px;font-weight:700;color:#15803d;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.5px;">🤖 ANÁLISIS INTELIGENTE IA / SMART AI ANALYSIS</div>
          ${geminiData.descripcion ? `<div style="color:#166534"><strong>Repuesto Sugerido / Proposed Spare Part:</strong> ${_esc(geminiData.descripcion)}</div>` : ''}
          ${geminiData.marca || geminiData.modelo ? `<div style="color:#166534;margin-top:2px"><strong>Marca &amp; Modelo / Brand &amp; Model:</strong> ${_esc([geminiData.marca, geminiData.modelo].filter(Boolean).join(' '))}</div>` : ''}
          ${geminiData.especificaciones ? `<div style="color:#166534;margin-top:2px"><strong>Especificaciones / Specs:</strong> ${_esc(geminiData.especificaciones)}</div>` : ''}
          ${_buildCodigosHtml(geminiData.codigos)}
          ${geminiData.diagnostico_resumen ? `<div style="color:#166534;margin-top:4px;border-top:1px dashed #bbf7d0;padding-top:4px;"><strong>Resumen Análisis / Analysis Summary:</strong> ${_esc(geminiData.diagnostico_resumen)}</div>` : ''}
        </div>` : '';

      const reportedFalla = eq._fallaReportada || 'Sin falla reportada / No issue reported';
      const finalObs = eq._obsSoporte || eq._obsPersonal || '—';
      const techDiag = eq._diagnostico || '';

      diagnosisTableHtml = `
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10.5px;font-family:inherit;">
          <thead>
            <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
              <th colspan="2" style="text-align:left;padding:6px 10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;font-size:9px;">
                🔍 DIAGNÓSTICO TÉCNICO / TECHNICAL INSPECTION &amp; DIAGNOSIS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="width:50%;padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;">
                <div style="font-size:8.5px;font-weight:700;color:#b45309;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.3px;">⚠️ FALLA REPORTADA / REPORTED ISSUE</div>
                <div style="font-size:10.5px;color:#78350f;line-height:1.4;background:#fffbeb;border:1px solid #fde68a;border-left:3px solid #f59e0b;padding:6px 8px;border-radius:3px;">
                  ${_esc(reportedFalla)}
                </div>
              </td>
              <td style="width:50%;padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;">
                <div style="font-size:8.5px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.3px;">📝 OBSERVACIÓN / COMMENTS</div>
                <div style="font-size:10.5px;color:#334155;line-height:1.4;background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #64748b;padding:6px 8px;border-radius:3px;">
                  ${_esc(finalObs)}
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;background:#fbfbfb;">
                <div style="font-size:8.5px;font-weight:700;color:#6d28d9;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.3px;">🔧 EVALUACIÓN TÉCNICA / TECHNICAL DIAGNOSIS</div>
                <div style="font-size:10.5px;color:#334155;line-height:1.5;white-space:pre-wrap;word-break:break-word;font-family:inherit;background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #7c3aed;padding:8px 10px;border-radius:3px;">
                  ${techDiag ? _esc(techDiag) : '<span style="color:#94a3b8;font-style:italic">Sin diagnóstico registrado / No technical diagnosis recorded</span>'}
                </div>
                ${geminiHtml}
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    // ── SECCIÓN 3: REPUESTOS SOLICITADOS (CRÍTICO) ────────────
    let repuestosTableHtml = '';
    if (opc.mostrarRepuestos) {
      const repuestosArr = eq._repuestosUsados || [];
      if (repuestosArr.length > 0) {
        repuestosTableHtml = `
          <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10.5px;font-family:inherit;">
            <thead>
              <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
                <th colspan="3" style="text-align:left;padding:6px 10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;font-size:9px;">
                  🔩 REPUESTOS SOLICITADOS / REPLACEMENT PARTS &amp; PART NUMBERS (PN)
                </th>
              </tr>
              <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                <th style="text-align:left;padding:5px 10px;font-weight:600;color:#475569;font-size:9px;width:50%;">REPUESTO / PART DESCRIPTION</th>
                <th style="text-align:left;padding:5px 10px;font-weight:600;color:#475569;font-size:9px;width:30%;">PART NUMBER (PN)</th>
                <th style="text-align:left;padding:5px 10px;font-weight:600;color:#475569;font-size:9px;width:20%;">FECHA SOLICITADA / DATE REQUESTED</th>
              </tr>
            </thead>
            <tbody>
              ${repuestosArr.map(r => `
                <tr>
                  <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;color:#0f172a;">
                    ${_esc(r.repuesto || r.nombre).toUpperCase()}
                  </td>
                  <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:800;color:#5b21b6;font-family:monospace;font-size:12px;background:#f5f3ff;border-left:3px solid #7c3aed;">
                    ${_esc(r.pn || '—').toUpperCase()}
                  </td>
                  <td style="padding:6px 10px;border:1px solid #e2e8f0;color:#64748b;font-size:9.5px;">
                    ${r.timestamp ? new Date(r.timestamp).toLocaleDateString('es-PE') : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        repuestosTableHtml = `
          <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10.5px;font-family:inherit;">
            <thead>
              <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
                <th style="text-align:left;padding:6px 10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;font-size:9px;">
                  🔩 REPUESTOS SOLICITADOS / REPLACEMENT PARTS
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-style:italic;">
                  Sin repuestos registrados para este equipo / No replacement parts requested for this device
                </td>
              </tr>
            </tbody>
          </table>
        `;
      }
    }

    // ── SECCIÓN 4: EVIDENCIA FOTOGRÁFICA (VISTA COMPLETA) ─────
    let fotosHtml = '';
    if (hasFotos) {
      const numFotos = fotosArr.length;
      let gridCols = '1fr';
      if (numFotos === 2) gridCols = '1fr 1fr';
      else if (numFotos >= 3) gridCols = '1fr 1fr 1fr';

      fotosHtml = `
        <div style="margin-top:14px;page-break-inside:avoid;break-inside:avoid;">
          <div style="font-size:9px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;
            display:flex;align-items:center;gap:6px">
            <span style="flex:1;height:1px;background:#cbd5e1"></span>
            <span>📷 EVIDENCIA FOTOGRÁFICA / PHOTOGRAPHIC EVIDENCE</span>
            <span style="background:#0284c7;color:#ffffff;border-radius:10px;padding:1px 6px;font-size:9px;font-weight:700">${numFotos}</span>
            <span style="flex:1;height:1px;background:#cbd5e1"></span>
          </div>
          <div style="display:grid;grid-template-columns:${gridCols};gap:8px;">
            ${fotosSrc.map((src) => `
              <div style="
                border-radius:6px;
                overflow:hidden;
                border:1px solid #cbd5e1;
                background:#f8fafc;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:4px;
                height:260px;
              ">
                <img src="${src}" referrerpolicy="no-referrer" crossorigin="anonymous"
                  style="max-width:100%;max-height:100%;object-fit:contain;display:block;"
                  onerror="this.onerror=null;this.src='${src.replace('/uc?','/thumbnail?sz=s800&')}';this.onerror=function(){this.style.display='none'}">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // ── FOOTER DE DOCUMENTO ──────────────────────────────────
    const footerHtml = `
      <div style="
        background:#f8fafc;
        border-top:1px solid #e2e8f0;
        padding:8px 18px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        font-size:9px;
        color:#94a3b8;
      ">
        <span>${_esc(lote?.titulo || '')} · INVENTARIO PRO v2.0 · PETULAP S.A.C.</span>
        <span>REGISTRY ID: <strong style="color:#64748b;font-family:monospace;font-size:9.5px">${_esc(eq._registroId)}</strong></span>
      </div>
    `;

    // ── RENDER COMPLETO DEL TICKET (DISEÑO VERTICAL ESTRUCTURADO) ──
    return `
      <div id="ticket-soporte-${eq._registroId}" class="ticket-soporte-doc" style="
        background:#ffffff;
        border-radius:8px;
        overflow:hidden;
        font-family:'Segoe UI',system-ui,Arial,sans-serif;
        color:#1e293b;
        font-size:11px;
        border:1px solid #cbd5e1;
        box-shadow:0 1px 3px rgba(0,0,0,0.05);
        margin-bottom:6px;
        page-break-inside:avoid;
        break-inside:avoid;
      ">
        ${headerHtml}
        <div style="padding:14px 18px;">
          ${infoTableHtml}
          ${diagnosisTableHtml}
          ${repuestosTableHtml}
          ${fotosHtml}
        </div>
        ${footerHtml}
      </div>
    `;
  }

  function _buildCodigosHtml(codigos) {
    if (!codigos || typeof codigos !== 'object') return '';
    const pairs = Object.entries(codigos).filter(([,v]) => v);
    if (!pairs.length) return '';
    return `
      <div style="font-size:9.5px;margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">
        ${pairs.map(([k,v]) => `
          <span style="background:#ede9fe;border:1px solid #cbd5e1;border-radius:3px;padding:2px 6px;font-size:9px;color:#5b21b6;display:inline-block;">
            <strong>${_esc(k)}:</strong> ${_esc(v).toUpperCase()}
          </span>
        `).join('')}
      </div>
    `;
  }

  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _merge(defaults, user) {
    const result = { ...defaults, ...user };
    if (defaults.mostrarCamposEquipo && user.mostrarCamposEquipo) {
      result.mostrarCamposEquipo = { ...defaults.mostrarCamposEquipo, ...user.mostrarCamposEquipo };
    }
    return result;
  }

  return { generar, DEFAULTS };
})();

window.PlantillaTicketSoporte = PlantillaTicketSoporte;
