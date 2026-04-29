/**
 * modulo-3-admin/catalogos-crud.js
 * CRUD de catálogos: marcas, modelos, proveedores, sucursales, repuestos, tipos equipo.
 */

const CatalogosCRUD = (() => {

  function renderSeccion(catalogoKey, titulo, placeholder) {
    const items = APP_CONFIG.catalogos[catalogoKey] || [];
    return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">${titulo}</div>
        <div style="display:flex;gap:6px;margin-bottom:10px">
          <input type="text" class="form-control form-control-sm" id="cat-input-${catalogoKey}" placeholder="${placeholder}" style="flex:1">
          <button class="btn btn-primary btn-sm" onclick="CatalogosCRUD.agregar('${catalogoKey}')">+ Agregar</button>
        </div>
        <div id="cat-list-${catalogoKey}" style="display:flex;flex-wrap:wrap;gap:5px">
          ${_renderItems(items, catalogoKey)}
        </div>
      </div>
    `;
  }

  function _renderItems(items, catalogoKey) {
    return items.map((item, i) => `
      <span style="display:inline-flex;align-items:center;gap:5px;background:var(--bg-hover);border:1px solid var(--border);padding:3px 10px;border-radius:14px;font-size:0.75rem;font-weight:500">
        ${item}
        <button onclick="CatalogosCRUD.eliminar('${catalogoKey}',${i})" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:0.75rem;line-height:1;padding:0">✕</button>
      </span>
    `).join('');
  }

  async function agregar(catalogoKey) {
    const input = document.getElementById(`cat-input-${catalogoKey}`);
    const val = input?.value?.trim()?.toUpperCase();
    if (!val) { Toast.warning('Escribe un valor'); return; }

    const items = [...(APP_CONFIG.catalogos[catalogoKey] || [])];
    if (items.includes(val)) { Toast.warning('Ya existe'); input.value=''; return; }

    items.push(val);
    await LocalCache.setCatalogo(catalogoKey, items);
    await AuditTrail.log('CREATE', `CATALOGO_${catalogoKey}`, { valor: val });

    input.value = '';
    const list = document.getElementById(`cat-list-${catalogoKey}`);
    if (list) list.innerHTML = _renderItems(items, catalogoKey);
    Toast.success(`"${val}" agregado`);
  }

  async function eliminar(catalogoKey, idx) {
    const items = [...(APP_CONFIG.catalogos[catalogoKey] || [])];
    const val = items[idx];
    if (!confirm(`¿Eliminar "${val}"?`)) return;

    items.splice(idx, 1);
    await LocalCache.setCatalogo(catalogoKey, items);
    await AuditTrail.log('DELETE', `CATALOGO_${catalogoKey}`, { valor: val });

    const list = document.getElementById(`cat-list-${catalogoKey}`);
    if (list) list.innerHTML = _renderItems(items, catalogoKey);
    Toast.info(`"${val}" eliminado`);
  }

  return { renderSeccion, agregar, eliminar };
})();

window.CatalogosCRUD = CatalogosCRUD;
