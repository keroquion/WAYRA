/**
 * modulo-1-ingreso/ingreso-tabla.js — Inventario Pro v3
 * Módulo para renderizar la tabla del lote activo y los toggles de columnas.
 */

const IngresoTabla = (() => {
  let _colVis = {};

  function buildColToggles() {
    _colVis = JSON.parse(localStorage.getItem('inv-col-vis-v2') || 'null') || {};
    APP_CONFIG.columns.forEach(c => { if(_colVis[c.key]===undefined) _colVis[c.key]=c.visible; });
    const row = document.getElementById('ingreso-col-toggles');
    if (!row) return;
    row.innerHTML = APP_CONFIG.columns.map(c=>`
      <span class="col-toggle ${_colVis[c.key]?'active':''}" data-col="${c.key}">${c.label}</span>
    `).join('');
    row.querySelectorAll('.col-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        _colVis[btn.dataset.col] = !_colVis[btn.dataset.col];
        btn.classList.toggle('active', _colVis[btn.dataset.col]);
        localStorage.setItem('inv-col-vis-v2', JSON.stringify(_colVis));
        render();
      });
    });
  }

  function render() {
    const el = document.getElementById('ingreso-tabla');
    if (!el) return;
    const loteActivo = window._loteActivo;
    const equipos = loteActivo?.equipos || [];
    if (!equipos.length) {
      el.innerHTML = DOM.emptyState('📭', 'Lote vacío', 'Escanea un equipo para agregarlo al lote activo.');
      return;
    }

    const visCols = APP_CONFIG.columns.filter(c => _colVis[c.key]);

    const rows = equipos.map((e, i) => {
      const cells = visCols.map(c => {
        if (c.key==='ESTADO') return `<td>${Formatters.estadoBadge(e[c.key])}</td>`;
        return `<td title="${Formatters.safe(e[c.key])}">${Formatters.safe(e[c.key])}</td>`;
      }).join('');
      const fotoCell = EvidenciaFotos.renderFotoCell(e, null);
      const accionesCell = _getAccionesCell(e, loteActivo);
      return `<tr>
        <td style="color:var(--text-muted);font-size:0.7rem">${i+1}</td>
        ${cells}
        <td>${fotoCell}</td>
        ${accionesCell}
      </tr>`;
    }).join('');

    el.innerHTML = `<div style="overflow-x:auto"><table class="data-table">
      <thead><tr><th>#</th>${visCols.map(c=>`<th>${c.label}</th>`).join('')}<th>Evidencia</th><th style="white-space:nowrap">Acciones</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

    // Registrar los registros en un mapa global para que los handlers puedan acceder al objeto completo
    window._ingresoEquiposMap = {};
    equipos.forEach(e => { window._ingresoEquiposMap[e._registroId] = e; });
  }

  function _getAccionesCell(eq, loteActivo) {
    if (window.AuthService && !AuthService.canEditLote(loteActivo)) {
      return `<td style="text-align:center"><span style="color:var(--text-muted);font-size:0.8rem;padding:0 8px" title="Propietario: ${DOM.esc(loteActivo._ownerId)}">🔒 Solo Lectura</span></td>`;
    }
    const modo = localStorage.getItem('ingreso-modo-v1') || 'normal';
    if (modo === 'soporte')  return _accionesSoporte(eq, loteActivo);
    if (modo === 'garantia') return _accionesGarantia(eq, loteActivo);
    return _accionesNormal(eq, loteActivo);
  }

  function _accionesNormal(eq, loteActivo) {
    return `<td>
      <div style="display:flex;gap:14px;align-items:center;justify-content:center">
        <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s" title="Garantía"
          onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
          onclick="IngresoView.abrirGarantia('${eq._registroId}')">🛡️</button>
        <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s" title="Soporte"
          onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
          onclick="IngresoView.abrirSoporte('${eq._registroId}')">🔩</button>
        <div style="width:1px;height:20px;background:var(--border)"></div>
        <button class="btn btn-sm btn-icon" style="font-size:1.2rem;transition:transform 0.2s;filter:grayscale(100%)" title="Quitar"
          onmouseover="this.style.transform='scale(1.2)';this.style.filter='grayscale(0)'" onmouseout="this.style.transform='scale(1)';this.style.filter='grayscale(100%)'"
          onclick="IngresoView.quitarEquipo('${loteActivo.id}','${eq._registroId}')">🗑️</button>
      </div>
    </td>`;
  }

  function _accionesSoporte(eq, loteActivo) {
    const tiposR = (APP_CONFIG.catalogos.tiposRepuesto || []);
    const repuestos = eq._repuestosUsados || [];
    const stickyRepuesto = localStorage.getItem('sticky-repuesto-v1') || '';
    const stickyPN = localStorage.getItem('sticky-pn-v1') || '';
    // Chips de repuestos existentes
    const chipsHtml = repuestos.map((r, idx) =>
      `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:3px;padding:1px 5px;font-size:0.65rem;white-space:nowrap">
        <strong>${r.repuesto||r.nombre}</strong>${r.pn?' · '+r.pn:''}
        <button onclick="IngresoSoporteInline._sopQuitarRepuesto('${eq._registroId}',${idx})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:0.7rem;padding:0;line-height:1">✕</button>
      </span>`
    ).join('');

    return `<td style="min-width:360px">
      <div style="display:flex;flex-direction:column;gap:5px">
        <!-- Chips existentes -->
        ${chipsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:3px">${chipsHtml}</div>` : ''}

        <!-- Fila de nuevo repuesto: solo registra con Enter o clic + -->
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap" id="sop-row-${eq._registroId}">
          <select id="sop-rep-${eq._registroId}" class="form-control" style="width:auto;min-width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            onchange="IngresoSoporteInline._sopOnRepuestoChange('${eq._registroId}','${(eq.MODELO||'').replace(/'/g,'')}')">
            <option value="">Repuesto…</option>
            ${tiposR.map(t => `<option value="${t}" ${!repuestos.length && t === stickyRepuesto ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <input type="text" id="sop-pn-${eq._registroId}" class="form-control"
            placeholder="PN (Enter = guardar)"
            value="${repuestos.length ? '' : (stickyPN || '')}"
            style="width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            oninput="IngresoSoporteInline._sopOnPNInput('${eq._registroId}',this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();IngresoSoporteInline._sopAgregarRepuesto('${eq._registroId}');}">
          <!-- 🔍 Buscador DB de repuestos -->
          <button onclick="IngresoSoporteInline._sopAbrirBuscador('${eq._registroId}','${(eq.MODELO||'').replace(/'/g,'')}','${(eq.SERIE||'').replace(/'/g,'')}')" title="Buscar en base de repuestos"
            style="background:var(--bg-hover);border:1px solid var(--border);border-radius:4px;cursor:pointer;height:26px;padding:0 7px;font-size:0.85rem;color:var(--text-secondary)">
            🔍
          </button>
          <button onclick="IngresoSoporteInline._sopAgregarRepuesto('${eq._registroId}')"
            style="background:#7c3aed;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.7rem;cursor:pointer;height:26px;white-space:nowrap"
            title="Agregar repuesto">
            ➕
          </button>
          <div style="width:1px;height:20px;background:var(--border);flex-shrink:0"></div>
          <button class="btn btn-sm btn-icon" title="Soporte Avanzado" style="font-size:1.1rem"
            onclick="IngresoView.abrirSoporte('${eq._registroId}')">⚙️</button>
          <button class="btn btn-sm btn-icon" style="font-size:1.1rem;filter:grayscale(100%)" title="Quitar"
            onmouseover="this.style.filter='grayscale(0)'" onmouseout="this.style.filter='grayscale(100%)'"
            onclick="IngresoView.quitarEquipo('${loteActivo.id}','${eq._registroId}')">🗑️</button>
        </div>
        <!-- Panel buscador inline (se despliega aqui) -->
        <div id="sop-search-${eq._registroId}" style="display:none"></div>
      </div>
    </td>`;
  }

  function _accionesGarantia(eq, loteActivo) {
    const proveedores = APP_CONFIG.catalogos.proveedores || [];
    return `<td style="min-width:340px">
      <div style="display:flex;flex-direction:column;gap:5px">
        ${eq._estadoGarantia ? `<span style="font-size:0.65rem;color:#0891b2;font-weight:600">${eq._estadoGarantia} · ${eq._proveedorGarantia||''}</span>` : ''}
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <select id="gar-prov-${eq._registroId}" class="form-control" style="width:auto;min-width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            onchange="IngresoSoporteInline._garGuardar('${eq._registroId}')">
            <option value="">Proveedor…</option>
            ${proveedores.map(p => `<option value="${p}" ${eq._proveedorGarantia===p?'selected':''}>${p}</option>`).join('')}
          </select>
          <input type="text" id="gar-falla-${eq._registroId}" class="form-control" placeholder="Falla…"
            value="${eq._fallaGarantia||''}"
            style="width:100px;font-size:0.72rem;padding:3px 6px;height:26px"
            onblur="IngresoSoporteInline._garGuardar('${eq._registroId}')">
          <input type="date" id="gar-fecha-${eq._registroId}" class="form-control"
            value="${eq._fechaEnvioGarantia||new Date().toISOString().slice(0,10)}"
            style="width:110px;font-size:0.72rem;padding:3px 6px;height:26px"
            onchange="IngresoSoporteInline._garGuardar('${eq._registroId}')">
          <div style="width:1px;height:20px;background:var(--border);flex-shrink:0"></div>
          <button class="btn btn-sm btn-icon" title="Garantía Avanzada" style="font-size:1.1rem"
            onclick="IngresoView.abrirGarantia('${eq._registroId}')">🛡️</button>
          <button class="btn btn-sm btn-icon" style="font-size:1.1rem;filter:grayscale(100%)" title="Quitar"
            onmouseover="this.style.filter='grayscale(0)'" onmouseout="this.style.filter='grayscale(100%)'"
            onclick="IngresoView.quitarEquipo('${loteActivo.id}','${eq._registroId}')">🗑️</button>
        </div>
      </div>
    </td>`;
  }

  return { buildColToggles, render };
})();

window.IngresoTabla = IngresoTabla;
