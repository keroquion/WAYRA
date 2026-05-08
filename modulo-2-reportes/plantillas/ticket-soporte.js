/**
 * modulo-2-reportes/plantillas/ticket-soporte.js
 * Genera el HTML de un ticket de soporte individual para vista previa y PDF.
 * Acepta `opciones` para controlar qué secciones se muestran.
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

    const estadoColor = {
      'Listo para entrega': '#22c55e',
      'En diagnóstico':     '#f59e0b',
      'En reparación':      '#3b82f6',
      'Esperando repuesto': '#8b5cf6',
      'Sin solución':       '#ef4444',
      'Pendiente':          '#6b7280',
    }[estado] || '#6b7280';

    // Fotos
    const fotosHtml = opc.mostrarFotos
      ? (eq._fotos || []).slice(0, 6).map(f => {
          const src = f.thumbUrl || f.url || f.preview || '';
          if (!src) return '';
          return `<img src="${src}" referrerpolicy="no-referrer"
            style="width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0"
            onerror="this.style.display='none'">`;
        }).filter(Boolean).join('')
      : '';

    // Repuestos
    const repuestosHtml = opc.mostrarRepuestos
      ? ((eq._repuestosUsados || []).length
          ? (eq._repuestosUsados).map(r =>
              `<span style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:2px 8px;font-size:11px;margin:2px">${r.nombre}</span>`
            ).join('')
          : '<span style="color:#94a3b8;font-size:11px">Sin repuestos registrados</span>')
      : null;

    // Diagnóstico
    const diagHtml = opc.mostrarDiagnostico
      ? (eq._diagnostico
          ? `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:11px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:10px;margin:0;max-height:300px;overflow:auto">${_esc(eq._diagnostico)}</pre>`
          : '<span style="color:#94a3b8;font-size:11px">Sin diagnóstico registrado</span>')
      : null;

    // Datos Gemini
    const gemini = eq._geminiData;
    const geminiHtml = (opc.mostrarGemini && gemini) ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px;margin-top:8px">
        <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🤖 Datos Gemini IA</div>
        ${gemini.descripcion    ? `<div style="font-size:11px"><strong>Repuesto:</strong> ${_esc(gemini.descripcion)}</div>` : ''}
        ${gemini.marca||gemini.modelo ? `<div style="font-size:11px"><strong>Marca/Modelo:</strong> ${_esc([gemini.marca,gemini.modelo].filter(Boolean).join(' '))}</div>` : ''}
        ${gemini.especificaciones ? `<div style="font-size:11px"><strong>Especificaciones:</strong> ${_esc(gemini.especificaciones)}</div>` : ''}
        ${_buildCodigosHtml(gemini.codigos)}
        ${gemini.modelos_compatibles?.length ? `<div style="font-size:11px"><strong>Compatible con:</strong> ${_esc((Array.isArray(gemini.modelos_compatibles)?gemini.modelos_compatibles:[gemini.modelos_compatibles]).join(', '))}</div>` : ''}
        ${gemini.diagnostico_resumen ? `<div style="font-size:11px;margin-top:4px"><strong>Análisis:</strong> ${_esc(gemini.diagnostico_resumen)}</div>` : ''}
      </div>` : '';

    // Campos de equipo configurables
    const CAMPO_LABELS = {
      CODIGO: '💻 Código', MARCA: '🏭 Marca', MODELO: '📐 Modelo',
      SERIE: '🔢 Serie', TIP_EQUIP: '🖥️ Tipo', PROCESADOR: '⚙️ Procesador',
      RAM: '🧠 RAM', HD_SSD: '💾 Almacenamiento', TECNICO: '👨‍🔧 Técnico',
    };
    const CAMPO_VALS = {
      CODIGO: eq.CODIGO, MARCA: eq.MARCA, MODELO: eq.MODELO,
      SERIE: eq.SERIE, TIP_EQUIP: eq.TIP_EQUIP || eq.TIPO_EQUIPO,
      PROCESADOR: eq.PROCESADOR, RAM: eq.RAM,
      HD_SSD: eq.HD_SSD || eq.DISCO, TECNICO: eq._tecnico,
    };

    const camposActivos = Object.entries(CAMPO_LABELS)
      .filter(([key]) => opc.mostrarCamposEquipo?.[key] !== false)
      .map(([key, label]) => _infoCell(label, CAMPO_VALS[key]));

    // Determinar columnas de la grilla de campos
    const numCols = camposActivos.length <= 3 ? camposActivos.length : camposActivos.length <= 6 ? 3 : 3;

    return `
      <div id="ticket-soporte-${eq._registroId}" class="ticket-soporte-doc"
        style="background:#fff;border-radius:8px;padding:20px;margin-bottom:0;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:12px;max-width:900px">

        ${opc.mostrarEncabezado ? `
        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #f1f5f9">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a">🔧 Ticket de Soporte Técnico</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">
              ${opc.mostrarLote ? `Lote: <strong>${_esc(lote?.titulo || '—')}</strong> · ` : ''}
              ${opc.mostrarFecha ? `Generado: ${ahora}` : ''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="display:inline-block;background:${estadoColor}20;border:1px solid ${estadoColor};border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:${estadoColor}">
              ${_esc(estado)}
            </div>
            ${opc.mostrarFecha ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px">Actualizado: ${fechaMod}</div>` : ''}
          </div>
        </div>` : ''}

        ${(opc.mostrarDatosEquipo && camposActivos.length) ? `
        <!-- INFO EQUIPO -->
        <div style="display:grid;grid-template-columns:repeat(${numCols},1fr);gap:10px;margin-bottom:14px">
          ${camposActivos.join('')}
        </div>` : ''}

        ${(opc.mostrarFalla || opc.mostrarObservacion) ? `
        <!-- FALLA + OBSERVACIÓN -->
        <div style="display:grid;grid-template-columns:${opc.mostrarFalla && opc.mostrarObservacion ? '1fr 1fr' : '1fr'};gap:10px;margin-bottom:14px">
          ${opc.mostrarFalla ? `
          <div>
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">⚠️ Falla Reportada</div>
            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:4px;padding:8px;font-size:11px;min-height:40px">${_esc(eq._fallaReportada || 'Sin falla reportada')}</div>
          </div>` : ''}
          ${opc.mostrarObservacion ? `
          <div>
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📝 Observación Final</div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;font-size:11px;min-height:40px">${_esc(eq._obsSoporte || eq._obsPersonal || '—')}</div>
          </div>` : ''}
        </div>` : ''}

        ${diagHtml !== null ? `
        <!-- DIAGNÓSTICO -->
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">🤖 Diagnóstico IA / Técnico</div>
          ${diagHtml}
          ${geminiHtml}
        </div>` : (geminiHtml ? `<div style="margin-bottom:14px">${geminiHtml}</div>` : '')}

        ${repuestosHtml !== null ? `
        <!-- REPUESTOS -->
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🔩 Repuestos Utilizados</div>
          <div>${repuestosHtml}</div>
        </div>` : ''}

        ${(opc.mostrarFotos && fotosHtml) ? `
        <!-- FOTOS -->
        <div style="margin-bottom:8px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📷 Evidencia Fotográfica</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${fotosHtml}</div>
        </div>` : ''}

      </div>`;
  }

  function _infoCell(label, value) {
    return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:7px 10px">
      <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">${label}</div>
      <div style="font-size:12px;font-weight:600;color:#1e293b">${_esc(value || '—')}</div>
    </div>`;
  }

  function _buildCodigosHtml(codigos) {
    if (!codigos || typeof codigos !== 'object') return '';
    const pairs = Object.entries(codigos).filter(([,v]) => v);
    if (!pairs.length) return '';
    return `<div style="font-size:11px"><strong>Códigos:</strong> ${pairs.map(([k,v]) => `<span style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:3px;padding:1px 6px;font-size:10px"><strong>${k}:</strong> ${_esc(v)}</span>`).join(' ')}</div>`;
  }

  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Deep merge (solo 1 nivel profundo para mostrarCamposEquipo)
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
