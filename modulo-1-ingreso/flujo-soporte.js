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
    const fotos = (registro._fotos || []);
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
          : `<div style="display:flex;gap:8px;flex-wrap:wrap">
              <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);border-radius:var(--radius-md);font-size:0.8rem">
                📷 Foto etiqueta → IA
                <input type="file" accept="image/*" capture="environment" style="display:none" onchange="FlujoSoporte.analizarEtiqueta(this,'${registro._registroId}')">
              </label>
              <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);border-radius:var(--radius-md);font-size:0.8rem">
                📁 Imagen → IA
                <input type="file" accept="image/*" style="display:none" onchange="FlujoSoporte.analizarEtiqueta(this,'${registro._registroId}')">
              </label>
            </div>
            <div id="gemini-result-${registro._registroId}" style="margin-top:8px;font-size:0.78rem"></div>`
        }
      </div>
    `;

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
        <label class="form-label">Diagnóstico Técnico</label>
        <textarea class="form-control" id="modal-sop-diagnostico" rows="2" placeholder="Diagnóstico del técnico">${registro._diagnostico || ''}</textarea>
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
        <div style="display:flex;gap:6px">
          <select class="form-control form-control-sm" id="sop-repuesto-select" style="flex:1">
            <option value="">— Tipo repuesto —</option>
            ${(APP_CONFIG.catalogos.tiposRepuesto||[]).map(r=>`<option value="${r}">${r}</option>`).join('')}
          </select>
          <input type="text" class="form-control form-control-sm" id="sop-repuesto-detalle" placeholder="Detalle/PN (opcional)" style="flex:1.5">
          <button class="btn btn-secondary btn-sm" onclick="FlujoSoporte.agregarRepuesto('${registro._registroId}')">+ Agregar</button>
        </div>
      </div>

      <!-- Fotos del equipo -->
      <div style="margin-bottom:12px">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
          Fotos (${fotos.length})
        </div>
        ${fotos.length > 0
          ? `<div style="display:flex;gap:6px;flex-wrap:wrap">
              ${fotos.slice(0,6).map((f,i) => {
                const src = f.thumbUrl || f.url || f.preview || '';
                return `<img src="${src}" referrerpolicy="no-referrer" crossorigin="anonymous"
                  style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer"
                  onclick="EvidenciaFotos.openLightbox('${registro._registroId}',${i})"
                  onerror="this.style.display='none'">`;
              }).join('')}
              ${fotos.length > 6 ? `<div style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;background:var(--bg-hover);border-radius:6px;font-size:0.7rem;color:var(--text-muted)">+${fotos.length-6}</div>` : ''}
            </div>`
          : `<div style="font-size:0.75rem;color:var(--text-muted)">Sin fotos — puedes adjuntarlas desde la columna Evidencia del historial.</div>`
        }
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

        await LocalCache.updateLote(lote);
        await AuditTrail.log('UPDATE', 'SOPORTE', eq, before);
        await SyncEngine.syncWrite(APP_CONFIG.sheets.sheetName, eq, { accion: 'UPDATE', entidad: 'SOPORTE' });

        // ── Persistir ticket completo en hoja _Soporte ────────────
        if (APP_CONFIG.appsScript.webAppUrl) {
          try {
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
              estado:     estado,
              tecnico:    tecnico,
              falla:      falla,
              diagnostico,
              repuestos:  eq._repuestosUsados || [],
              obs,
              fotos:      eq._fotos || [],
              geminiData: eq._geminiData || null,
              lote:       lote.titulo || lote.id,
            };
            await AppsScriptBridge.saveSoporte(ticket);
            Toast.success(`✅ Soporte guardado en Sheets (hoja _Soporte)`);
          } catch (err) {
            Toast.warning(`Soporte guardado local. Error al sincronizar: ${err.message}`);
          }
        } else {
          Toast.success(`Soporte actualizado: ${estado}`);
        }

        ModalGenerico.close();
        return;
      }
    }
    Toast.error('Registro no encontrado');
  }

  // ── Gemini OCR — Analizar foto de etiqueta ────────────────────────────
  async function analizarEtiqueta(input, registroId) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    const resultEl = document.getElementById(`gemini-result-${registroId}`);
    if (resultEl) resultEl.innerHTML = '<span class="spinner"></span> Analizando con Gemini IA…';

    try {
      // Convertir a base64 puro (sin header data:...)
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.onerror = () => rej(new Error('Error leyendo imagen'));
        r.readAsDataURL(file);
      });
      const [header, base64] = dataUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const result = await AppsScriptBridge.geminiOCR(base64, mimeType);
      const data = result.data || {};

      // Guardar los datos en el registro para persistirlos
      const lotes = await LocalCache.getLotes();
      for (const lote of lotes) {
        const eq = lote.equipos?.find(e => e._registroId === registroId);
        if (eq) {
          eq._geminiData = data;
          await LocalCache.updateLote(lote);
          break;
        }
      }

      // Mostrar resultado con campos clave
      const fields = ['marca','modelo','pn','serie','sku','procesador','ram','pantalla','notas'];
      const found = fields.filter(k => data[k]).map(k =>
        `<div style="display:flex;gap:6px;align-items:baseline">
          <span style="font-weight:700;min-width:80px;font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">${k}</span>
          <span style="font-size:0.82rem;color:var(--text-primary)">${data[k]}</span>
        </div>`
      ).join('');

      if (resultEl) {
        resultEl.innerHTML = found
          ? `<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:var(--radius-sm);padding:10px;margin-top:6px">
              <div style="font-size:0.72rem;font-weight:700;color:var(--success);margin-bottom:6px">✅ Datos extraídos por Gemini:</div>
              ${found}
              ${data.pn ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px;font-size:0.72rem" onclick="document.getElementById('sop-repuesto-detalle').value='PN: ${data.pn}';document.getElementById('sop-repuesto-select').value='PANTALLA'">📋 Usar PN en repuesto</button>` : ''}
            </div>`
          : `<div style="color:var(--warning);font-size:0.78rem;margin-top:6px">⚠️ No se pudieron extraer datos de la imagen. Intenta con una foto más clara.</div>`;
      }
    } catch (err) {
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--danger);font-size:0.78rem">❌ Error: ${err.message}</span>`;
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

  function openModal(registro) {
    ModalGenerico.open(renderModalSoporte(registro), { size: 'modal-lg' });
  }

  return { renderStepper, openModal, confirmarSoporte, agregarRepuesto, quitarRepuesto, analizarEtiqueta };
})();

window.FlujoSoporte = FlujoSoporte;
