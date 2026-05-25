/**
 * modulo-2-reportes/plantillas/ticket-soporte.js
 * Genera el HTML de un ticket de soporte individual para vista previa y PDF.
 * v2.3: Diseño premium rediseñado, fotos usando URL original de Drive.
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

    const estadoMap = {
      'Listo para entrega': { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
      'En diagnóstico':     { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '🔍' },
      'En reparación':      { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '🔧' },
      'Esperando repuesto': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '⏳' },
      'Sin solución':       { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '❌' },
      'Pendiente':          { color: '#4b5563', bg: '#f9fafb', border: '#e5e7eb', icon: '⏸️' },
    };
    const est = estadoMap[estado] || estadoMap['Pendiente'];

    // ── FOTOS: usar URL original de Drive, thumbUrl solo como fallback ──────
    // f.url = URL completa de Google Drive (imagen real)
    // f.thumbUrl = miniatura reducida (evitar para PDF)
    const fotosArr = opc.mostrarFotos
      ? (eq._fotos || []).slice(0, 6).filter(f => f.url || f.thumbUrl || f.preview)
      : [];

    const hasFotos = fotosArr.length > 0;

    // Para PDF usamos la URL original. Si Drive requiere autenticación,
    // intentamos el export directo, si no, el thumbnail como fallback visual
    const fotosSrc = fotosArr.map(f => {
      // Prioridad: url original > preview base64 > thumbUrl (miniatura)
      return f.url || f.preview || f.thumbUrl || '';
    });

    // ── CAMPOS DE EQUIPO ──────────────────────────────────────────────────────
    const CAMPO_CONFIG = [
      { key: 'CODIGO',    label: 'CÓDIGO',        icon: '🔖', val: eq.CODIGO },
      { key: 'MARCA',     label: 'MARCA',          icon: '🏭', val: eq.MARCA },
      { key: 'MODELO',    label: 'MODELO',         icon: '📐', val: eq.MODELO },
      { key: 'SERIE',     label: 'SERIE',          icon: '🔢', val: eq.SERIE },
      { key: 'TIP_EQUIP', label: 'TIPO',           icon: '🖥️', val: eq.TIP_EQUIP || eq.TIPO_EQUIPO },
      { key: 'PROCESADOR',label: 'PROCESADOR',     icon: '⚙️', val: eq.PROCESADOR },
      { key: 'RAM',       label: 'RAM',            icon: '🧠', val: eq.RAM },
      { key: 'HD_SSD',    label: 'ALMACENAMIENTO', icon: '💾', val: eq.HD_SSD || eq.DISCO },
      { key: 'TECNICO',   label: 'TÉCNICO',        icon: '👨‍🔧', val: eq._tecnico },
    ].filter(c => opc.mostrarCamposEquipo?.[c.key] !== false);

    // ── REPUESTOS ──────────────────────────────────────────────────────────────
    const repuestosArr = eq._repuestosUsados || [];
    const repuestosHtml = opc.mostrarRepuestos
      ? (repuestosArr.length
          ? repuestosArr.map(r => `
              <span style="display:inline-flex;align-items:center;gap:5px;
                background:linear-gradient(135deg,#ede9fe,#f5f3ff);
                border:1px solid #c4b5fd;border-radius:6px;
                padding:4px 10px;font-size:11px;font-weight:600;color:#6d28d9">
                🔩 ${_esc(r.nombre)}
              </span>`).join('')
          : '<span style="color:#94a3b8;font-size:11px;font-style:italic">Sin repuestos registrados</span>')
      : null;

    // ── DIAGNÓSTICO ────────────────────────────────────────────────────────────
    const diagHtml = opc.mostrarDiagnostico
      ? (eq._diagnostico
          ? `<pre style="white-space:pre-wrap;word-break:break-word;font-family:'Segoe UI',Arial,sans-serif;
              font-size:11px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;
              border-left:3px solid #7c3aed;border-radius:0 6px 6px 0;
              padding:10px 12px;margin:0;line-height:1.5">${_esc(eq._diagnostico)}</pre>`
          : '<span style="color:#94a3b8;font-size:11px;font-style:italic">Sin diagnóstico registrado</span>')
      : null;

    // ── DATOS GEMINI ───────────────────────────────────────────────────────────
    const gemini = eq._geminiData;
    const geminiHtml = (opc.mostrarGemini && gemini) ? `
      <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:6px;padding:10px;margin-top:8px">
        <div style="font-size:10px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">🤖 Análisis IA</div>
        ${gemini.descripcion ? `<div style="font-size:11px;color:#166534"><strong>Repuesto:</strong> ${_esc(gemini.descripcion)}</div>` : ''}
        ${gemini.marca||gemini.modelo ? `<div style="font-size:11px;color:#166534"><strong>Marca/Modelo:</strong> ${_esc([gemini.marca,gemini.modelo].filter(Boolean).join(' '))}</div>` : ''}
        ${gemini.especificaciones ? `<div style="font-size:11px;color:#166534"><strong>Especificaciones:</strong> ${_esc(gemini.especificaciones)}</div>` : ''}
        ${_buildCodigosHtml(gemini.codigos)}
        ${gemini.diagnostico_resumen ? `<div style="font-size:11px;color:#166534;margin-top:4px"><strong>Análisis:</strong> ${_esc(gemini.diagnostico_resumen)}</div>` : ''}
      </div>` : '';

    // ══════════════════════════════════════════════════════════════════════════
    // GENERACIÓN DEL HTML DEL TICKET
    // ══════════════════════════════════════════════════════════════════════════
    return `
<div id="ticket-soporte-${eq._registroId}" class="ticket-soporte-doc" style="
  background:#ffffff;
  border-radius:10px;
  overflow:hidden;
  font-family:'Segoe UI',system-ui,Arial,sans-serif;
  color:#1e293b;
  font-size:12px;
  box-shadow:0 1px 4px rgba(0,0,0,0.08);
  border:1px solid #e2e8f0;
">

  ${opc.mostrarEncabezado ? `
  <!-- ═══════ HEADER ═══════ -->
  <div style="
    background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#1e3a5f 100%);
    padding:16px 20px;
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    flex-wrap:wrap;
    gap:10px;
  ">
    <div>
      <div style="font-size:15px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">
        🔧 Ticket de Soporte Técnico
      </div>
      <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">
        ${opc.mostrarLote ? `<span>📦 Lote: <strong style="color:#cbd5e1">${_esc(lote?.titulo || '—')}</strong></span>` : ''}
        ${opc.mostrarFecha ? `<span>📅 ${ahora}</span>` : ''}
        <span style="color:#64748b">·</span>
        <span>🕐 ${fechaMod}</span>
      </div>
    </div>
    <div style="
      background:${est.bg};
      border:1.5px solid ${est.border};
      border-radius:20px;
      padding:5px 14px;
      font-size:11px;
      font-weight:700;
      color:${est.color};
      white-space:nowrap;
      align-self:center;
    ">
      ${est.icon} ${_esc(estado)}
    </div>
  </div>` : ''}

  <!-- ═══════ CUERPO ═══════ -->
  <div style="padding:16px 20px;">

    ${hasFotos ? `
    <!-- ╔═════ LAYOUT 2 COL: INFO + FOTOS ════╗ -->
    <div style="display:grid;grid-template-columns:1fr 45%;gap:16px;align-items:start">

      <!-- Columna izquierda: datos del equipo + falla + diagnóstico + repuestos -->
      <div>
    ` : '<div>'}

    ${(opc.mostrarDatosEquipo && CAMPO_CONFIG.length) ? `
    <!-- DATOS EQUIPO -->
    <div style="margin-bottom:14px">
      <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;
        display:flex;align-items:center;gap:6px">
        <span style="flex:1;height:1px;background:#e2e8f0"></span>
        <span>Información del equipo</span>
        <span style="flex:1;height:1px;background:#e2e8f0"></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        ${CAMPO_CONFIG.map(c => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;${c.key==='CODIGO'?'border-left:3px solid #7c3aed;':c.key==='SERIE'?'border-left:3px solid #0891b2;':''}">
            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">${c.icon} ${_esc(c.label)}</div>
            <div style="font-size:12px;font-weight:700;color:#0f172a;word-break:break-word">${_esc(c.val || '—')}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${(opc.mostrarFalla || opc.mostrarObservacion) ? `
    <!-- FALLA + OBSERVACIÓN -->
    <div style="display:grid;grid-template-columns:${opc.mostrarFalla && opc.mostrarObservacion ? '1fr 1fr' : '1fr'};gap:8px;margin-bottom:12px">
      ${opc.mostrarFalla ? `
      <div>
        <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">⚠️ Falla Reportada</div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:8px 10px;font-size:11px;min-height:36px;color:#78350f;line-height:1.5">
          ${_esc(eq._fallaReportada || 'Sin falla reportada')}
        </div>
      </div>` : ''}
      ${opc.mostrarObservacion ? `
      <div>
        <div style="font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">📝 Observación Final</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #64748b;border-radius:0 6px 6px 0;padding:8px 10px;font-size:11px;min-height:36px;color:#374151;line-height:1.5">
          ${_esc(eq._obsSoporte || eq._obsPersonal || '—')}
        </div>
      </div>` : ''}
    </div>` : ''}

    ${diagHtml !== null ? `
    <!-- DIAGNÓSTICO -->
    <div style="margin-bottom:12px">
      <div style="font-size:9px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">🤖 Diagnóstico IA / Técnico</div>
      ${diagHtml}
      ${geminiHtml}
    </div>` : (geminiHtml ? `<div style="margin-bottom:12px">${geminiHtml}</div>` : '')}

    ${repuestosHtml !== null ? `
    <!-- REPUESTOS -->
    <div style="margin-bottom:4px">
      <div style="font-size:9px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">🔩 Repuestos Utilizados</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${repuestosHtml}</div>
    </div>` : ''}

    ${hasFotos ? `
      </div><!-- fin columna izquierda -->

      <!-- ═══ Columna derecha: FOTOS ═══ -->
      <div>
        <div style="font-size:9px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;
          display:flex;align-items:center;gap:5px">
          📷 Evidencia fotográfica
          <span style="background:#0284c7;color:#fff;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700">${fotosArr.length}</span>
        </div>
        <!-- Imagen principal grande -->
        <div style="border-radius:8px;overflow:hidden;border:2px solid #e0f2fe;margin-bottom:6px;background:#f0f9ff">
          <img src="${fotosSrc[0]}" referrerpolicy="no-referrer" crossorigin="anonymous"
            style="width:100%;max-height:260px;object-fit:cover;display:block"
            onerror="this.onerror=null;this.src='${fotosSrc[0].replace('/uc?','/thumbnail?sz=s800&')}';this.onerror=function(){this.style.display='none'}">
        </div>
        ${fotosArr.length > 1 ? `
        <!-- Miniaturas adicionales -->
        <div style="display:grid;grid-template-columns:repeat(${Math.min(fotosArr.length-1, 3)},1fr);gap:4px">
          ${fotosSrc.slice(1, 4).map((src, i) => `
            <div style="border-radius:5px;overflow:hidden;border:1px solid #e0f2fe;background:#f0f9ff;aspect-ratio:4/3">
              <img src="${src}" referrerpolicy="no-referrer" crossorigin="anonymous"
                style="width:100%;height:100%;object-fit:cover;display:block"
                onerror="this.onerror=null;this.src='${src.replace('/uc?','/thumbnail?sz=s400&')}';this.onerror=function(){this.style.display='none'}">
            </div>`).join('')}
          ${fotosArr.length > 4 ? `
            <div style="border-radius:5px;background:#e0f2fe;display:flex;align-items:center;justify-content:center;aspect-ratio:4/3">
              <span style="font-size:14px;font-weight:700;color:#0369a1">+${fotosArr.length - 4}</span>
            </div>` : ''}
        </div>` : ''}
      </div><!-- fin columna fotos -->
    </div><!-- fin grid 2 col -->
    ` : '</div><!-- fin columna única -->'}

  </div><!-- fin cuerpo -->

  <!-- ═══════ FOOTER ═══════ -->
  <div style="
    background:#f8fafc;
    border-top:1px solid #e2e8f0;
    padding:8px 20px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-size:9.5px;
    color:#94a3b8;
  ">
    <span>${_esc(lote?.titulo || '')} · Inventario Pro v2</span>
    <span>ID: ${_esc(eq._registroId?.slice(-8) || '—')}</span>
  </div>

</div>`;
  }

  function _buildCodigosHtml(codigos) {
    if (!codigos || typeof codigos !== 'object') return '';
    const pairs = Object.entries(codigos).filter(([,v]) => v);
    if (!pairs.length) return '';
    return `<div style="font-size:11px;margin-top:4px">${pairs.map(([k,v]) =>
      `<span style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:3px;padding:1px 6px;font-size:10px;margin-right:3px"><strong>${_esc(k)}:</strong> ${_esc(v)}</span>`
    ).join('')}</div>`;
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
