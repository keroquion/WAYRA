/**
 * modulo-1-ingreso/flujo-garantia.js
 * Gestión de estado de equipos en garantía con proveedor.
 * Estados: RECIBIDO → DIAGNOSTICADO → ENVIADO_PROVEEDOR → EN_PROVEEDOR → DEVUELTO → CERRADO
 */

const FlujoGarantia = (() => {

  function renderStepper(estadoActual) {
    const estados = APP_CONFIG.estadosGarantia;
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

  function renderModalCambioEstado(registro) {
    const estados = APP_CONFIG.estadosGarantia;
    const idxActual = estados.findIndex(e => e.key === registro._estadoGarantia);

    return `
      <div class="modal-title">🛡️ Gestionar Garantía</div>
      <div class="modal-subtitle">Equipo: <strong>${registro.MARCA} ${registro.MODELO}</strong> · Código: ${registro.CODIGO}</div>

      ${renderStepper(registro._estadoGarantia || 'RECIBIDO')}

      <div class="form-group">
        <label class="form-label">Cambiar Estado</label>
        <select class="form-control" id="modal-garantia-estado">
          ${estados.map((e, i) => `<option value="${e.key}" ${i === idxActual ? 'selected' : ''}>${e.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Proveedor</label>
        <select class="form-control" id="modal-garantia-proveedor">
          <option value="">— Seleccionar —</option>
          ${(APP_CONFIG.catalogos.proveedores || []).map(p => `<option value="${p}" ${registro._proveedorGarantia === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Observación</label>
        <textarea class="form-control" id="modal-garantia-obs" rows="3" placeholder="Detalles del envío, diagnóstico, etc.">${registro._obsGarantia || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha</label>
        <input type="date" class="form-control" id="modal-garantia-fecha" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="FlujoGarantia.confirmarCambio('${registro._registroId}')">Actualizar Estado</button>
      </div>
    `;
  }

  async function confirmarCambio(registroId) {
    const nuevoEstado  = document.getElementById('modal-garantia-estado')?.value;
    const proveedor    = document.getElementById('modal-garantia-proveedor')?.value;
    const obs          = document.getElementById('modal-garantia-obs')?.value;
    const fecha        = document.getElementById('modal-garantia-fecha')?.value;

    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq) {
        const estadoAnterior = eq._estadoGarantia;
        eq._estadoGarantia   = nuevoEstado;
        eq._proveedorGarantia = proveedor;
        eq._obsGarantia      = obs;
        eq._fechaGarantia    = fecha;
        eq._lastModified     = new Date().toISOString();

        await LocalCache.updateLote(lote);
        await AuditTrail.log('UPDATE', 'GARANTIA', { registroId, nuevoEstado, proveedor, obs }, { estadoAnterior });

        if (nuevoEstado === 'ENVIADO_PROVEEDOR' || nuevoEstado === 'EN_PROVEEDOR') {
          await SyncEngine.syncWrite(APP_CONFIG.sheets.sheetName, eq, { accion: 'UPDATE', entidad: 'GARANTIA' });
        }

        ModalGenerico.close();
        Toast.success(`Estado actualizado: ${nuevoEstado}`);
        return;
      }
    }
    Toast.error('Registro no encontrado');
  }

  function openModal(registro) {
    ModalGenerico.open(renderModalCambioEstado(registro), { size: 'modal-lg' });
  }

  return { renderStepper, openModal, confirmarCambio };
})();

window.FlujoGarantia = FlujoGarantia;
