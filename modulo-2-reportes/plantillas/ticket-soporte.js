/**
 * modulo-2-reportes/plantillas/ticket-soporte.js
 * Genera el HTML de un ticket de soporte individual para vista previa y PDF.
 */

const PlantillaTicketSoporte = (() => {

  function generar(equipo, lote) {
    const eq       = equipo;
    const ahora    = new Date().toLocaleDateString('es-PE', { year:'numeric', month:'long', day:'numeric' });
    const fechaMod = eq._lastModified ? new Date(eq._lastModified).toLocaleString('es-PE') : '—';
    const estado   = eq._estadoSoporte || 'Pendiente';

    const estadoColor = {
      'Listo para entrega': '#22c55e',
      'En diagnóstico':     '#f59e0b',
      'En reparación':      '#3b82f6',
      'Esperando repuesto': '#8b5cf6',
      'Sin solución':       '#ef4444',
      'Pendiente':          '#6b7280',
    }[estado] || '#6b7280';

    // Fotos
    const fotosHtml = (eq._fotos || []).slice(0, 6).map(f => {
      const src = f.thumbUrl || f.url || f.preview || '';
      if (!src) return '';
      return `<img src="${src}" referrerpolicy="no-referrer"
        style="width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0"
        onerror="this.style.display='none'">`;
    }).filter(Boolean).join('');

    // Repuestos
    const repuestosHtml = (eq._repuestosUsados || []).length
      ? (eq._repuestosUsados).map(r =>
          `<span style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:2px 8px;font-size:11px;margin:2px">${r.nombre}</span>`
        ).join('')
      : '<span style="color:#94a3b8;font-size:11px">Sin repuestos registrados</span>';

    // Diagnóstico IA
    const diagHtml = eq._diagnostico
      ? `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:11px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:10px;margin:0;max-height:300px;overflow:auto">${_escHtml(eq._diagnostico)}</pre>`
      : '<span style="color:#94a3b8;font-size:11px">Sin diagnóstico registrado</span>';

    // Datos Gemini
    const gemini = eq._geminiData;
    const geminiHtml = gemini ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px;margin-top:8px">
        <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🤖 Datos Gemini IA</div>
        ${gemini.descripcion    ? `<div style="font-size:11px"><strong>Repuesto:</strong> ${_escHtml(gemini.descripcion)}</div>` : ''}
        ${gemini.marca||gemini.modelo ? `<div style="font-size:11px"><strong>Marca/Modelo:</strong> ${_escHtml([gemini.marca,gemini.modelo].filter(Boolean).join(' '))}</div>` : ''}
        ${gemini.especificaciones ? `<div style="font-size:11px"><strong>Especificaciones:</strong> ${_escHtml(gemini.especificaciones)}</div>` : ''}
        ${_buildCodigosHtml(gemini.codigos)}
        ${gemini.modelos_compatibles?.length ? `<div style="font-size:11px"><strong>Compatible con:</strong> ${_escHtml((Array.isArray(gemini.modelos_compatibles)?gemini.modelos_compatibles:[gemini.modelos_compatibles]).join(', '))}</div>` : ''}
        ${gemini.diagnostico_resumen ? `<div style="font-size:11px;margin-top:4px"><strong>Análisis:</strong> ${_escHtml(gemini.diagnostico_resumen)}</div>` : ''}
      </div>` : '';

    return `
      <div id="ticket-soporte-${eq._registroId}" class="ticket-soporte-doc"
        style="background:#fff;border-radius:8px;padding:20px;margin-bottom:0;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:12px;max-width:900px">

        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #f1f5f9">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a">🔧 Ticket de Soporte Técnico</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">Lote: <strong>${_escHtml(lote?.titulo || '—')}</strong> · Generado: ${ahora}</div>
          </div>
          <div style="text-align:right">
            <div style="display:inline-block;background:${estadoColor}20;border:1px solid ${estadoColor};border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:${estadoColor}">
              ${_escHtml(estado)}
            </div>
            <div style="font-size:10px;color:#94a3b8;margin-top:4px">Actualizado: ${fechaMod}</div>
          </div>
        </div>

        <!-- INFO EQUIPO -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          ${_infoCell('💻 Código', eq.CODIGO)}
          ${_infoCell('🏭 Marca', eq.MARCA)}
          ${_infoCell('📐 Modelo', eq.MODELO)}
          ${_infoCell('🔢 Serie', eq.SERIE)}
          ${_infoCell('🖥️ Tipo', eq.TIP_EQUIP || eq.TIPO_EQUIPO)}
          ${_infoCell('⚙️ Procesador', eq.PROCESADOR)}
          ${_infoCell('🧠 RAM', eq.RAM)}
          ${_infoCell('💾 Almacenamiento', eq.HD_SSD || eq.DISCO)}
          ${_infoCell('👨‍🔧 Técnico', eq._tecnico)}
        </div>

        <!-- FALLA + DIAGNÓSTICO -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div>
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">⚠️ Falla Reportada</div>
            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:4px;padding:8px;font-size:11px;min-height:40px">${_escHtml(eq._fallaReportada || 'Sin falla reportada')}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📝 Observación Final</div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;font-size:11px;min-height:40px">${_escHtml(eq._obsSoporte || eq._obsPersonal || '—')}</div>
          </div>
        </div>

        <!-- DIAGNÓSTICO IA -->
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">🤖 Diagnóstico IA / Técnico</div>
          ${diagHtml}
          ${geminiHtml}
        </div>

        <!-- REPUESTOS -->
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🔩 Repuestos Utilizados</div>
          <div>${repuestosHtml}</div>
        </div>

        <!-- FOTOS -->
        ${fotosHtml ? `
        <div style="margin-bottom:8px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📷 Evidencia Fotográfica</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${fotosHtml}</div>
        </div>` : ''}

      </div>`;
  }

  function _infoCell(label, value) {
    return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:7px 10px">
      <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">${label}</div>
      <div style="font-size:12px;font-weight:600;color:#1e293b">${_escHtml(value || '—')}</div>
    </div>`;
  }

  function _buildCodigosHtml(codigos) {
    if (!codigos || typeof codigos !== 'object') return '';
    const pairs = Object.entries(codigos).filter(([,v]) => v);
    if (!pairs.length) return '';
    return `<div style="font-size:11px"><strong>Códigos:</strong> ${pairs.map(([k,v]) => `<span style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:3px;padding:1px 6px;font-size:10px"><strong>${k}:</strong> ${_escHtml(v)}</span>`).join(' ')}</div>`;
  }

  function _escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { generar };
})();

window.PlantillaTicketSoporte = PlantillaTicketSoporte;
