/**
 * modulo-1-ingreso/evidencia-fotos.js
 * Adjuntar fotos de daños a un registro.
 * Flujo: FileInput/Camera → preview thumbnail → upload async a Drive → guardar URL
 */

const EvidenciaFotos = (() => {

  // ── Render botón de adjuntar + thumbnails ────────────────────────
  function renderFotoCell(registro, onUpdate) {
    const fotos = registro._fotos || [];
    const id = registro._registroId;

    const thumbs = fotos.map((f, i) => {
      // Si sigue subiendo, mostrar spinner
      if (f.subiendo) {
        return `<span title="Subiendo..." style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:var(--bg-hover);border-radius:4px;font-size:1.1rem">⏳</span>`;
      }
      // Priorizar la URL de Drive (url), si no existe usar preview (base64)
      const src = f.url || f.preview;
      return `
        <img src="${src}" class="photo-thumb"
             title="${f.nombre||'foto'}"
             referrerpolicy="no-referrer"
             onclick="EvidenciaFotos.openLightbox('${id}',${i})"
             style="width:36px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border)"
             onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span title=\'Error cargando imagen\' style=\'display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:var(--bg-hover);border-radius:4px;font-size:1rem\'>\uD83D\uDDBC\uFE0F</span>')">
      `;
    }).join('');

    const btnAdd = `
      <div style="display:flex;gap:4px">
        <label class="photo-upload-btn" title="Subir imagen" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:var(--bg-hover);border-radius:4px;border:1px dashed var(--border);font-size:1rem;transition:transform 0.2s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          📁
          <input type="file" accept="image/*" style="display:none" onchange="EvidenciaFotos.handleFileSelect(this,'${id}')">
        </label>
        <label class="photo-upload-btn" title="Tomar foto" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:var(--bg-hover);border-radius:4px;border:1px dashed var(--border);font-size:1rem;transition:transform 0.2s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          📷
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="EvidenciaFotos.handleFileSelect(this,'${id}')">
        </label>
      </div>
    `;

    return `<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">${thumbs}${btnAdd}</div>`;
  }

  // ── Manejar selección de archivo ─────────────────────────────────
  async function handleFileSelect(input, registroId) {
    const file = input.files[0];
    if (!file) return;
    input.value = ''; // reset para poder seleccionar el mismo archivo de nuevo

    Toast.info('📷 Procesando foto…');
    const base64Preview = await DriveUpload.getBase64Preview(file);

    // Actualizar UI inmediatamente con preview local persistente (Base64)
    const fotoObj = {
      nombre: file.name,
      preview: base64Preview,
      url: base64Preview, // hasta que Drive responda, usamos base64 que nunca expira
      subiendo: true,
      timestamp: new Date().toISOString(),
    };

    // Actualizar registro en IndexedDB
    await _addFotoToRegistro(registroId, fotoObj);

    // Subir a Drive async
    if (APP_CONFIG.appsScript.webAppUrl) {
      try {
        const url = await DriveUpload.uploadFile(file);
        fotoObj.url = url;
        fotoObj.subiendo = false;
        await _updateFotoUrl(registroId, fotoObj);
        Toast.success('Foto guardada en Drive');
      } catch (err) {
        Toast.error('Error subiendo foto: ' + err.message);
        fotoObj.subiendo = false;
      }
    } else {
      fotoObj.subiendo = false;
      Toast.warning('Foto guardada localmente (sin Drive configurado)');
    }
  }

  // ── Agregar foto al registro en IndexedDB ────────────────────────
  async function _addFotoToRegistro(registroId, foto) {
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq) {
        if (!eq._fotos) eq._fotos = [];
        eq._fotos.push(foto);
        await LocalCache.updateLote(lote);
        break;
      }
    }
  }

  async function _updateFotoUrl(registroId, foto) {
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq?._fotos) {
        const f = eq._fotos.find(f => f.nombre === foto.nombre && f.timestamp === foto.timestamp);
        if (f) { f.url = foto.url; f.subiendo = false; }
        await LocalCache.updateLote(lote);
        break;
      }
    }
  }

  // ── Lightbox ─────────────────────────────────────────────────────
  function openLightbox(registroId, idx) {
    // Lightbox simple
    const existing = document.getElementById('foto-lightbox');
    if (existing) existing.remove();

    // Buscar fotos del registro
    LocalCache.getLotes().then(lotes => {
      for (const lote of lotes) {
        const eq = lote.equipos?.find(e => e._registroId === registroId);
        if (eq?._fotos?.length) {
          _showLightbox(eq._fotos, idx);
          break;
        }
      }
    });
  }

  function _showLightbox(fotos, startIdx) {
    let idx = startIdx;
    const div = document.createElement('div');
    div.id = 'foto-lightbox';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:3000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px';

    const render = () => {
      const f = fotos[idx];
      div.innerHTML = `
        <div style="position:relative;max-width:90vw;max-height:80vh">
          <img src="${f.url||f.preview}" referrerpolicy="no-referrer" style="max-width:90vw;max-height:75vh;object-fit:contain;border-radius:8px">
          <div style="color:#fff;text-align:center;font-size:0.8rem;margin-top:8px;opacity:0.7">${f.nombre||''} · ${idx+1}/${fotos.length}</div>
        </div>
        <div style="display:flex;gap:12px">
          ${idx>0?`<button onclick="event.stopPropagation();window._lightboxNav(-1)" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:1rem">‹</button>`:''}
          ${idx<fotos.length-1?`<button onclick="event.stopPropagation();window._lightboxNav(1)" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:1rem">›</button>`:''}
          <button onclick="document.getElementById('foto-lightbox').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer">✕ Cerrar</button>
        </div>
      `;
    };

    window._lightboxNav = (dir) => { idx = Math.max(0, Math.min(fotos.length-1, idx+dir)); render(); };
    div.addEventListener('click', (e) => { if(e.target===div) div.remove(); });
    document.body.appendChild(div);
    render();
  }

  return { renderFotoCell, handleFileSelect, openLightbox };
})();

window.EvidenciaFotos = EvidenciaFotos;
