/**
 * modulo-1-ingreso/flujo-soporte.js
 * Tracking de soporte interno: fallas, repuestos usados, refacciones.
 * Estados: RECIBIDO → DIAGNOSTICO → ESPERANDO_REPUESTO → REPARANDO → LISTO → ENTREGADO
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

    return `
      <div class="modal-title">🔩 Soporte Interno</div>
      <div class="modal-subtitle"><strong>${registro.MARCA} ${registro.MODELO}</strong> · ${registro.CODIGO}</div>

      ${renderStepper(registro._estadoSoporte || 'RECIBIDO')}

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
          <input type="text" class="form-control form-control-sm" id="sop-repuesto-detalle" placeholder="Detalle (opcional)" style="flex:1.5">
          <button class="btn btn-secondary btn-sm" onclick="FlujoSoporte.agregarRepuesto('${registro._registroId}')">+ Agregar</button>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Observación Final</label>
        <textarea class="form-control" id="modal-sop-obs" rows="2" placeholder="Notas adicionales">${registro._obsSoporte || ''}</textarea>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="FlujoSoporte.confirmarSoporte('${registro._registroId}')">Guardar</button>
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
        eq._estadoSoporte = estado;
        eq._tecnico       = tecnico;
        eq._fallaReportada = falla;
        eq._diagnostico   = diagnostico;
        eq._obsSoporte    = obs;
        eq._lastModified  = new Date().toISOString();

        await LocalCache.updateLote(lote);
        await AuditTrail.log('UPDATE', 'SOPORTE', eq, before);
        await SyncEngine.syncWrite(APP_CONFIG.sheets.sheetName, eq, { accion: 'UPDATE', entidad: 'SOPORTE' });

        ModalGenerico.close();
        Toast.success(`Soporte actualizado: ${estado}`);
        return;
      }
    }
    Toast.error('Registro no encontrado');
  }

  // ── Repuestos ────────────────────────────────────────────────────
  const _pendingRepuestos = {}; // { registroId: [{nombre, detalle}] }

  async function agregarRepuesto(registroId) {
    const tipo    = document.getElementById('sop-repuesto-select')?.value;
    const detalle = document.getElementById('sop-repuesto-detalle')?.value?.trim();
    if (!tipo) { Toast.warning('Selecciona un tipo de repuesto'); return; }

    const nombre = tipo + (detalle ? ` (${detalle})` : '');
    if (!_pendingRepuestos[registroId]) _pendingRepuestos[registroId] = [];
    _pendingRepuestos[registroId].push({ nombre, detalle });

    // Actualizar en IndexedDB inmediatamente
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

  return { renderStepper, openModal, confirmarSoporte, agregarRepuesto, quitarRepuesto };
})();

window.FlujoSoporte = FlujoSoporte;
