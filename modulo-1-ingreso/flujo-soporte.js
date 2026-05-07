/**
 * modulo-1-ingreso/flujo-soporte.js
 * Tracking de soporte interno: fallas, repuestos usados, refacciones.
 * Estados: RECIBIDO → DIAGNOSTICO → ESPERANDO_REPUESTO → REPARANDO → LISTO → ENTREGADO
 *
 * v2.1: Persiste ticket completo (incluyendo fotos) a hoja _Soporte en Google Sheets.
 *       Botón de análisis OCR con Gemini para identificar repuestos desde foto de etiqueta.
 */

const FlujoSoporte = (() => {

  function renderStepper(estadoActual) {
    const estados = APP_CONFIG.estadosSoporte;
    const idx = estados.findIndex(e => e.key === estadoActual);
    return `
      <div class="workflow-stepper">
        ${estados.map((e, i) => `
          <div class="workflow-step ${i < idx ? 'done' : i === idx ? 'active' : ''}">
            <div class="step-dot">${i < idx ? '✓' : i + 1}</div>
            <div class="step-label">${e.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderModalSoporte(registro) {
    const estados = APP_CONFIG.estadosSoporte;
    const idxActual = estados.findIndex(e => e.key === registro._estadoSoporte);
    const repuestos = (registro._repuestosUsados || []);

    const hasGemini = !!APP_CONFIG.appsScript.webAppUrl;

    // Sección de Gemini OCR: botón que aparece cuando hay fotos
    const geminiSection = `
      <div style="background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(99,102,241,0.08));border:1px solid rgba(124,58,237,0.3);border-radius:var(--radius-md);padding:12px 14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:1.1rem">🤖</span>
          <span style="font-weight:700;font-size:0.82rem;color:var(--accent)">Gemini IA — Análisis de etiqueta</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:10px">
          Toma o adjunta una foto de la etiqueta del equipo para extraer automáticamente el Part Number (PN), modelo y datos de repuesto.
        </div>
        ${!hasGemini
          ? `<div style="font-size:0.72rem;color:var(--warning)">⚠️ Configura la URL de Apps Script en Admin → Conexión para usar esta función.</div>`
          : `<div class="gemini-btns">
              <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);border-radius:var(--radius-md);font-size:0.8rem">
                📷 Foto etiqueta → IA
                <input type="file" accept="image/*" capture="environment" style="display:none" onchange="FlujoSoporte.analizarEtiqueta(this,'${registro._registroId}')">
              </label>
              <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);border-radius:var(--radius-md);font-size:0.8rem">
                📁 Imagen → IA
                <input type="file" accept="image/*" style="display:none" onchange="FlujoSoporte.analizarEtiqueta(this,'${registro._registroId}')">
              </label>
            </div>
            <div id="gemini-results-stack-${registro._registroId}" style="margin-top:8px"></div>`
        }
      </div>
    `;

    // fotos section rendered dynamically by refreshFotosEnModal

    return `
      <div class="modal-title">🔩 Soporte Interno</div>
      <div class="modal-subtitle"><strong>${registro.MARCA} ${registro.MODELO}</strong> · ${registro.CODIGO}</div>

      ${renderStepper(registro._estadoSoporte || 'RECIBIDO')}

      ${geminiSection}

      <div class="grid-2" style="gap:10px">
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-control" id="modal-sop-estado">
            ${estados.map((e, i) => `<option value="${e.key}" ${i === idxActual ? 'selected' : ''}>${e.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Técnico</label>
          <input type="text" class="form-control" id="modal-sop-tecnico" placeholder="Nombre técnico" value="${registro._tecnico || ''}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Falla Reportada</label>
        <textarea class="form-control" id="modal-sop-falla" rows="2" placeholder="Descripción de la falla">${registro._fallaReportada || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Diagnóstico IA / Técnico</label>
        <textarea class="form-control" id="modal-sop-diagnostico" rows="3" placeholder="El análisis de IA se cargará aquí. También puedes escribir manualmente.">${registro._diagnostico || ''}</textarea>
      </div>

      <!-- Repuestos usados -->
      <div style="margin-bottom:10px">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
          Repuestos / Refacciones Usados
        </div>
        <div id="repuestos-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          ${repuestos.map((r, i) => `
            <span class="badge badge-accent" style="gap:6px">
              ${r.nombre}
              <button onclick="FlujoSoporte.quitarRepuesto('${registro._registroId}',${i})" style="background:none;border:none;cursor:pointer;color:inherit;font-size:0.8rem;line-height:1">✕</button>
            </span>
          `).join('')}
        </div>
        <div class="sop-repuesto-row">
          <select class="form-control form-control-sm" id="sop-repuesto-select">
            <option value="">— Tipo repuesto —</option>
            ${(APP_CONFIG.catalogos.tiposRepuesto||[]).map(r=>`<option value="${r}">${r}</option>`).join('')}
          </select>
          <input type="text" class="form-control form-control-sm" id="sop-repuesto-detalle" placeholder="PN u otros códigos">
          <button class="btn btn-secondary btn-sm" onclick="FlujoSoporte.agregarRepuesto('${registro._registroId}')">+ Agregar</button>
        </div>
      </div>

      <!-- Fotos del equipo con botón Analizar -->
      <div style="margin-bottom:12px">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">
          Fotos<span id="fotos-count-${registro._registroId}"></span>
          <span class="foto-hint-desktop"> — Pulsa 🤖 en cada foto para análisis independiente</span>
        </div>
        <div id="fotos-panel-${registro._registroId}" class="fotos-grid-soporte"></div>
      </div>

      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Observación Final</label>
        <textarea class="form-control" id="modal-sop-obs" rows="2" placeholder="Notas adicionales">${registro._obsSoporte || ''}</textarea>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="FlujoSoporte.confirmarSoporte('${registro._registroId}')">💾 Guardar y Sincronizar</button>
      </div>
    `;
  }

  async function confirmarSoporte(registroId) {
    const estado      = document.getElementById('modal-sop-estado')?.value;
    const tecnico     = document.getElementById('modal-sop-tecnico')?.value;
    const falla       = document.getElementById('modal-sop-falla')?.value;
    const diagnostico = document.getElementById('modal-sop-diagnostico')?.value;
    const obs         = document.getElementById('modal-sop-obs')?.value;

    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq) {
        const before = { ...eq };
        eq._estadoSoporte  = estado;
        eq._tecnico        = tecnico;
        eq._fallaReportada = falla;
        eq._diagnostico    = diagnostico;
        eq._obsSoporte     = obs;
        eq._lastModified   = new Date().toISOString();

        // ── 1. Guardar en IndexedDB — INSTANTÁNEO (< 10ms) ────────────
        await LocalCache.updateLote(lote);

        // ── 2. UI feedback inmediato — cerrar modal SIN esperar la red ─
        Toast.success('💾 Soporte guardado');
        ModalGenerico.close();

        // ── 3. Audit local (no bloqueante) ──────────────────────────────
        AuditTrail.log('UPDATE', 'SOPORTE', eq, before).catch(() => {});

        // ── 4. Sync a Sheets en BACKGROUND (fire-and-forget) ───────────
        // Una sola llamada HTTP — saveSoporte escribe en _Soporte y
        // _syncLotesRemoto (debounced) actualiza _Lotes por separado.
        if (APP_CONFIG.appsScript.webAppUrl) {
          const ticket = {
            id:         `sop_${registroId}`,
            fecha:      eq._lastModified,
            codigo:     eq.CODIGO     || '',
            marca:      eq.MARCA      || '',
            modelo:     eq.MODELO     || '',
            serie:      eq.SERIE      || '',
            tipoEquipo: eq.TIP_EQUIP  || '',
            procesador: eq.PROCESADOR || '',
            ram:        eq.RAM        || '',
            hdSsd:      eq.HD_SSD     || '',
            estado, tecnico, falla, diagnostico,
            repuestos:  eq._repuestosUsados || [],
            obs,
            fotos:      (eq._fotos || []).map(f => ({ url: f.url, thumbUrl: f.thumbUrl, fileId: f.fileId, timestamp: f.timestamp })),
            geminiData: eq._geminiData || null,
            lote:       lote.titulo || lote.id,
          };
          // No await — se ejecuta después de que la UI ya respondió
          AppsScriptBridge.saveSoporte(ticket)
            .then(() => {
              console.log('[Soporte] Ticket sincronizado con Sheets ✅');
              const chip = document.getElementById('sync-chip');
              if (chip) { chip.className = 'sync-chip connected'; chip.innerHTML = '<span class="dot"></span>Sync OK'; }
            })
            .catch(err => {
              console.warn('[Soporte] Error sync background:', err.message);
              Toast.warning('Sincronización pendiente — se reintentará', { duration: 3000 });
            });
        }
        return;
      }
    }
    Toast.error('Registro no encontrado');
  }

  // ── Gemini OCR — helpers compartidos ─────────────────────────────────────

  // Comprime una imagen (File o Blob) a base64 JPEG ≤ 1024px
  async function _compressToBase64(fileOrBlob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1024;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
            else { width = Math.round((width * maxDim) / height); height = maxDim; }
          }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          const [, b64] = canvas.toDataURL('image/jpeg', 0.8).split(',');
          res(b64);
        };
        img.onerror = () => rej(new Error('Error al procesar imagen'));
        img.src = e.target.result;
      };
      r.onerror = () => rej(new Error('Error leyendo imagen'));
      r.readAsDataURL(fileOrBlob);
    });
  }

  // Muestra resultado Gemini — acumula en el stack, mini-badge en la foto
  function _mostrarResultadoGemini(data, registroId, resultId) {
    const stackEl = document.getElementById(`gemini-results-stack-${registroId}`);
    const hayDatos = data.descripcion || data.codigos || data.marca || data.modelo || data.codigos_busqueda;
    if (!hayDatos) {
      const noDataHtml = `<div style="color:var(--warning);font-size:0.78rem;margin-top:6px">⚠️ No se pudieron extraer datos. Intenta con foto más clara.</div>`;
      if (stackEl) stackEl.insertAdjacentHTML('beforeend', noDataHtml);
      else if (typeof Toast !== 'undefined') Toast.warning('No se extrajeron datos de la imagen');
      if (resultId) { const b = document.getElementById(`btn-analizar-${resultId}`); if (b) { b.textContent = '⚠️ Sin datos'; b.disabled = true; } }
      return;
    }

    const pnEl = document.getElementById('sop-repuesto-detalle');
    let codigosStr = '';
    if (data.codigos && typeof data.codigos === 'object') {
      codigosStr = Object.entries(data.codigos).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' | ');
    } else if (data.codigos_busqueda) { codigosStr = data.codigos_busqueda; }
    if (!codigosStr && data.pn) codigosStr = `PN: ${data.pn}`;
    if (pnEl && codigosStr) { pnEl.value = codigosStr; pnEl.style.borderColor = 'var(--accent)'; setTimeout(() => pnEl.style.borderColor = '', 2500); }

    const selectEl = document.getElementById('sop-repuesto-select');
    let autoFilled = '';
    if (selectEl) {
      const tiposDisponibles = Array.from(selectEl.options).map(o => o.value).filter(Boolean);
      const texto = `${data.descripcion||''} ${data.modelo||''} ${data.notas_tecnicas||''} ${data.especificaciones||''}`.toLowerCase();
      const mapas = [
        { claves: ['pantalla','display','lcd','screen','monitor'], tipo: 'PANTALLA' },
        { claves: ['bateria','battery','bat','acumulador'],        tipo: 'BATERIA'  },
        { claves: ['teclado','keyboard','kb'],                     tipo: 'TECLADO'  },
        { claves: ['ram','memoria','memory','dimm','sodimm'],      tipo: 'RAM'      },
        { claves: ['ssd','hdd','disco','nvme','storage'],          tipo: 'DISCO'    },
        { claves: ['cargador','adaptador','charger','power'],      tipo: 'CARGADOR' },
        { claves: ['camara','camera','webcam'],                    tipo: 'CAMARA'   },
        { claves: ['ventilador','fan','cooling'],                  tipo: 'VENTILADOR'},
        { claves: ['tarjeta','card','gpu','grafica'],              tipo: 'TARJETA'  },
      ];
      for (const { claves, tipo } of mapas) {
        if (claves.some(c => texto.includes(c))) {
          const match = tiposDisponibles.find(t => t.toUpperCase() === tipo)
            || tiposDisponibles.find(t => t.toUpperCase().includes(tipo));
          if (match) { selectEl.value = match; selectEl.style.borderColor = 'var(--accent)'; setTimeout(() => selectEl.style.borderColor='',2500); autoFilled = match; break; }
        }
      }
    }

    const diagEl = document.getElementById('modal-sop-diagnostico');
    if (diagEl) {
      const prev = diagEl.value.trim();
      const sep  = prev ? '\n\n' + '─'.repeat(36) + '\n' : '';
      const iaLines = [`🤖 DIAGNÓSTICO IA — ${new Date().toLocaleDateString('es-PE')}`];
      if (data.descripcion)        iaLines.push(`📦 Repuesto: ${data.descripcion}`);
      if (data.marca || data.modelo) iaLines.push(`🏭 Marca/Modelo: ${[data.marca,data.modelo].filter(Boolean).join(' ')}`);
      if (codigosStr)              iaLines.push(`🔢 Códigos: ${codigosStr}`);
      if (data.especificaciones)   iaLines.push(`⚙️ Especificaciones: ${data.especificaciones}`);
      if (data.modelos_compatibles?.length) iaLines.push(`🔗 Compatible:\n   • ${(Array.isArray(data.modelos_compatibles)?data.modelos_compatibles:[data.modelos_compatibles]).join('\n   • ')}`);
      if (data.diagnostico_resumen) iaLines.push(`\n📝 Análisis: ${data.diagnostico_resumen}`);
      if (data.advertencias?.length) iaLines.push(`\n⚠️ Advertencias:\n   • ${(Array.isArray(data.advertencias)?data.advertencias:[data.advertencias]).join('\n   • ')}`);
      if (data.notas_tecnicas)     iaLines.push(`\n💡 Notas: ${data.notas_tecnicas}`);
      diagEl.value = prev + sep + iaLines.join('\n');
      diagEl.style.borderColor = 'var(--accent)';
      if (window.innerWidth > 768) diagEl.style.minHeight = '160px';
      setTimeout(() => diagEl.style.borderColor = '', 2500);
    }

    const codigosHtml = data.codigos && typeof data.codigos === 'object'
      ? Object.entries(data.codigos).filter(([,v])=>v).map(([k,v])=>`<span style="display:inline-block;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.3);border-radius:4px;padding:2px 8px;font-size:0.72rem;margin:2px"><strong style="color:var(--accent)">${k}:</strong> ${v}</span>`).join('')
      : codigosStr ? `<span style="font-size:0.82rem">${codigosStr}</span>` : '';
    const compatiblesHtml = data.modelos_compatibles?.length
      ? `<div style="margin-top:6px"><span style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase">Compatible con</span><div style="font-size:0.78rem;margin-top:2px">${(Array.isArray(data.modelos_compatibles)?data.modelos_compatibles:[data.modelos_compatibles]).join(', ')}</div></div>` : '';
    const advertenciasHtml = data.advertencias?.length
      ? `<div style="margin-top:6px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:4px;padding:6px 8px"><span style="font-size:0.72rem;font-weight:700;color:var(--warning)">⚠️ Advertencias:</span><div style="font-size:0.75rem;margin-top:2px">${(Array.isArray(data.advertencias)?data.advertencias:[data.advertencias]).join(' • ')}</div></div>` : '';
    const tarjeta = `<div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.3);border-radius:var(--radius-sm);padding:10px;margin-top:6px"><div style="font-size:0.72rem;font-weight:700;color:var(--success);margin-bottom:8px">✅ Gemini${autoFilled?' · Tipo <strong>'+autoFilled+'</strong>':''} · Diagnóstico actualizado ↑</div>${data.descripcion?'<div style="font-size:0.82rem;font-weight:600;margin-bottom:6px">📦 '+data.descripcion+'</div>':''}${codigosHtml?'<div style="margin-bottom:4px">'+codigosHtml+'</div>':''}${data.especificaciones?'<div style="font-size:0.75rem;margin-top:4px">⚙️ '+data.especificaciones+'</div>':''}${compatiblesHtml}${advertenciasHtml}${(codigosStr||autoFilled)?'<button class="btn btn-secondary btn-sm" style="margin-top:8px;font-size:0.72rem" onclick="FlujoSoporte.agregarRepuesto(\''+registroId+'\')">➕ Agregar este repuesto</button>':''}</div>`;
    if (stackEl) stackEl.insertAdjacentHTML('beforeend', tarjeta);
    if (resultId) {
      const miniEl = document.getElementById(`${resultId}-mini`);
      if (miniEl) { const color=autoFilled?'var(--success)':'var(--accent)'; miniEl.innerHTML=`<span style="font-size:0.55rem;background:rgba(34,197,94,0.15);border:1px solid ${color};border-radius:3px;padding:1px 4px;color:${color};display:block;margin-top:2px;text-align:center">✅ ${autoFilled||'OK'}</span>`; }
      const btnEl = document.getElementById(`btn-analizar-${resultId}`);
      if (btnEl) { btnEl.textContent='✅ Listo'; btnEl.disabled=true; btnEl.style.opacity='0.6'; }
    }
  }

  // ── Analizar foto nueva desde input de archivo ────────────────────────────
  async function analizarEtiqueta(input, registroId) {
    const file = input.files[0]; if (!file) return; input.value = '';
    const stackEl2 = document.getElementById(`gemini-results-stack-${registroId}`);
    const sid = `gs-${Date.now()}`;
    if (stackEl2) stackEl2.insertAdjacentHTML('beforeend', `<div id="${sid}" style="font-size:0.78rem;padding:6px 0"><span class="spinner"></span> Analizando con Gemini IA…</div>`);
    try {
      const base64 = await _compressToBase64(file);
      const result = await AppsScriptBridge.geminiOCR(base64, 'image/jpeg');
      const data = result.data || {};
      document.getElementById(sid)?.remove();
      const lotes = await LocalCache.getLotes();
      for (const lote of lotes) { const eq = lote.equipos?.find(e => e._registroId === registroId); if (eq) { eq._geminiData = data; await LocalCache.updateLote(lote); break; } }
      _mostrarResultadoGemini(data, registroId, null);
    } catch (err) {
      document.getElementById(sid)?.remove();
      if (stackEl2) stackEl2.insertAdjacentHTML('beforeend', `<span style="color:var(--danger);font-size:0.78rem">❌ ${err.message}</span>`);
      Toast.error('Error Gemini: ' + err.message);
    }
  }

  // ── Analizar foto YA guardada (URL leída FRESCA desde IndexedDB) ─────────
  async function analizarFotoGuardada(fotoTimestamp, registroId, resultId) {
    let fotoUrl = '';
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq?._fotos) { const f = eq._fotos.find(f => String(f.timestamp) === String(fotoTimestamp)); fotoUrl = f ? (f.url || f.preview || '') : ''; break; }
    }
    if (!fotoUrl) { Toast.warning('⚠️ Esta foto no tiene URL de Drive aún.'); return; }
    const btnEl = document.getElementById(`btn-analizar-${resultId}`);
    if (btnEl) { btnEl.innerHTML = '<span class="spinner"></span>'; btnEl.disabled = true; }
    const stackEl3 = document.getElementById(`gemini-results-stack-${registroId}`);
    const sid2 = `gs-${resultId}`;
    if (stackEl3) stackEl3.insertAdjacentHTML('beforeend', `<div id="${sid2}" style="font-size:0.78rem;padding:6px 0"><span class="spinner"></span> Descargando y analizando con Gemini IA…</div>`);
    Toast.info('🤖 Analizando foto con Gemini IA…');
    try {
      const resp = await fetch(fotoUrl);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const blob = await resp.blob();
      const base64 = await _compressToBase64(blob);
      const result = await AppsScriptBridge.geminiOCR(base64, 'image/jpeg');
      const data = result.data || {};
      document.getElementById(sid2)?.remove();
      for (const lote of lotes) { const eq = lote.equipos?.find(e => e._registroId === registroId); if (eq) { eq._geminiData = data; await LocalCache.updateLote(lote); break; } }
      _mostrarResultadoGemini(data, registroId, resultId);
    } catch (err) {
      document.getElementById(sid2)?.remove();
      if (btnEl) { btnEl.textContent = '🤖 Analizar'; btnEl.disabled = false; }
      if (stackEl3) stackEl3.insertAdjacentHTML('beforeend', `<span style="color:var(--danger);font-size:0.78rem">❌ ${err.message}</span>`);
      Toast.error('Error Gemini: ' + err.message);
    }
  }

  // ── Repuestos ────────────────────────────────────────────────────────────
  const _pendingRepuestos = {};

  async function agregarRepuesto(registroId) {
    const tipo    = document.getElementById('sop-repuesto-select')?.value;
    const detalle = document.getElementById('sop-repuesto-detalle')?.value?.trim();
    if (!tipo) { Toast.warning('Selecciona un tipo de repuesto'); return; }

    const nombre = tipo + (detalle ? ` (${detalle})` : '');
    if (!_pendingRepuestos[registroId]) _pendingRepuestos[registroId] = [];
    _pendingRepuestos[registroId].push({ nombre, detalle });

    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq) {
        if (!eq._repuestosUsados) eq._repuestosUsados = [];
        eq._repuestosUsados.push({ nombre, detalle, timestamp: new Date().toISOString() });
        await LocalCache.updateLote(lote);
        _refreshRepuestosList(registroId, eq._repuestosUsados);
        break;
      }
    }
    document.getElementById('sop-repuesto-select').value = '';
    document.getElementById('sop-repuesto-detalle').value = '';
  }

  async function quitarRepuesto(registroId, idx) {
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq?._repuestosUsados) {
        eq._repuestosUsados.splice(idx, 1);
        await LocalCache.updateLote(lote);
        _refreshRepuestosList(registroId, eq._repuestosUsados);
        break;
      }
    }
  }

  function _refreshRepuestosList(registroId, repuestos) {
    const el = document.getElementById('repuestos-list');
    if (!el) return;
    el.innerHTML = (repuestos||[]).map((r, i) => `
      <span class="badge badge-accent" style="gap:6px">
        ${r.nombre}
        <button onclick="FlujoSoporte.quitarRepuesto('${registroId}',${i})" style="background:none;border:none;cursor:pointer;color:inherit;font-size:0.8rem">✕</button>
      </span>
    `).join('');
  }


  // Renderiza fotos SIEMPRE desde IndexedDB (fresco, sin fotos fantasma)
  async function refreshFotosEnModal(registroId) {
    const panel   = document.getElementById(`fotos-panel-${registroId}`);
    const countEl = document.getElementById(`fotos-count-${registroId}`);
    if (!panel) return;
    const hasGemini = !!APP_CONFIG.appsScript.webAppUrl;
    const lotes = await LocalCache.getLotes();
    let fotos = [];
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq) { fotos = eq._fotos || []; break; }
    }
    if (countEl) countEl.textContent = ` (${fotos.length})`;
    if (!fotos.length) {
      panel.innerHTML = `<div style="font-size:0.75rem;color:var(--text-muted)">Sin fotos — adjúntalas desde la columna Evidencia del historial.</div>`;
      return;
    }
    panel.innerHTML = fotos.slice(0, 8).map((f, i) => {
      const src = f.thumbUrl || f.url || f.preview || '';
      const ts  = String(f.timestamp || i);
      const rId = `gemini-foto-result-${registroId}-${i}`;
      return `<div class="foto-card-item"><div class="foto-card-thumb" style="${f.subiendo?'opacity:0.5':''}"><img src="${src}" referrerpolicy="no-referrer" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;cursor:pointer" onclick="EvidenciaFotos.openLightbox('${registroId}',${i})" onerror="this.style.background='var(--bg-hover)';this.style.display='none'"></div>${hasGemini&&!f.subiendo?`<button onclick="FlujoSoporte.analizarFotoGuardada('${ts}','${registroId}','${rId}')" class="foto-analizar-btn" id="btn-analizar-${rId}" title="Analizar esta foto con Gemini IA">🤖 Analizar</button>`:(f.subiendo?'<span style="font-size:0.58rem;color:var(--text-muted)">Subiendo…</span>':'')}<div id="${rId}-mini" style="width:72px;max-width:72px"></div></div>`;
    }).join('');
    if (fotos.length > 8) panel.insertAdjacentHTML('beforeend', `<div class="foto-card-item foto-card-extra">+${fotos.length - 8}</div>`);
  }

  function openModal(registro) {
    ModalGenerico.open(renderModalSoporte(registro), { size: 'modal-lg' });
    setTimeout(() => refreshFotosEnModal(registro._registroId), 80);
  }

  return { renderStepper, openModal, confirmarSoporte, agregarRepuesto, quitarRepuesto, analizarEtiqueta, analizarFotoGuardada, refreshFotosEnModal };
})();

window.FlujoSoporte = FlujoSoporte;
