/**
 * modulo-1-ingreso/evidencia-fotos.js
 * Adjuntar y gestionar fotos de evidencia por registro.
 * Flujo: FileInput/Camera → preview thumbnail → upload async a Drive → guardar URL
 * Incluye: gestor modal (agregar/eliminar/ver fotos) + lightbox.
 */

const EvidenciaFotos = (() => {

  // ── Helper URL: convierte URL de Drive a formato compatible con <img> ────
  // Google bloqueó uc?export=view en navegadores modernos.
  // Se usa drive.usercontent.google.com o thumbnail según el contexto.
  function _fixDriveUrl(url, fileId, useThumbnail = false) {
    if (!url) return '';
    // Si es base64 o ya es usercontent, usarla directamente
    if (url.startsWith('data:') || url.includes('usercontent.google.com')) return url;
    // Extraer fileId desde una URL antigua si no se pasó explícitamente
    let id = fileId;
    if (!id) {
      const m = url.match(/[?&]id=([^&]+)/);
      if (m) id = m[1];
    }
    if (!id) return url; // URL desconocida, devolver tal cual
    if (useThumbnail) return `https://drive.google.com/thumbnail?id=${id}&sz=w200`;
    return `https://drive.usercontent.google.com/download?id=${id}&export=view&authuser=0`;
  }

  // ── Render botón de adjuntar + thumbnails (celda de tabla) ───────────────
  function renderFotoCell(registro, onUpdate) {
    const fotos = registro._fotos || [];
    const id = registro._registroId;

    const thumbs = fotos.map((f, i) => {
      if (f.subiendo) {
        return `<span title="Subiendo..." style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:var(--bg-hover);border-radius:4px;font-size:1.1rem">⏳</span>`;
      }
      // Usar thumbnail de Drive si tenemos fileId, si no usar la URL completa
      const thumbSrc = f.thumbUrl || _fixDriveUrl(f.url, f.fileId, true) || f.preview || '';
      return `
        <img src="${thumbSrc}" class="photo-thumb"
             title="${f.nombre||'foto'}"
             referrerpolicy="no-referrer"
             crossorigin="anonymous"
             onclick="EvidenciaFotos.openLightbox('${id}',${i})"
             style="width:36px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border)"
             onerror="this.src='${f.url || f.preview || ''}';this.onerror=null;">
      `;
    }).join('');

    const fotoCount = fotos.length;
    return `
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
        ${thumbs}
        <button
          title="Gestionar fotos (${fotoCount})"
          onclick="EvidenciaFotos.openGestor('${id}')"
          style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:var(--bg-hover);border-radius:4px;border:1px dashed var(--border);font-size:1rem;cursor:pointer;transition:transform 0.2s"
          onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          ${fotoCount > 0 ? '🖼️' : '📷'}
        </button>
      </div>`;
  }

  // ── Gestor de fotos: modal completo con agregar/eliminar ─────────────────
  function openGestor(registroId) {
    LocalCache.getLotes().then(lotes => {
      let eq = null;
      for (const lote of lotes) {
        eq = lote.equipos?.find(e => e._registroId === registroId);
        if (eq) break;
      }
      if (!eq) { Toast.error('Registro no encontrado'); return; }
      _renderGestorModal(eq);
    });
  }

  function _renderGestorModal(eq) {
    const fotos = eq._fotos || [];
    const id = eq._registroId;

    const grid = fotos.length === 0
      ? `<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.85rem">Sin fotos adjuntas</div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;padding:4px 0">
          ${fotos.map((f, i) => {
            const thumbSrc = f.thumbUrl || _fixDriveUrl(f.url, f.fileId, true) || f.preview || '';
            const fullSrc  = _fixDriveUrl(f.url, f.fileId, false) || f.preview || '';
            return `
              <div style="position:relative;border-radius:8px;overflow:hidden;background:var(--bg-hover);aspect-ratio:1;border:1px solid var(--border)">
                ${f.subiendo
                  ? `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.8rem">⏳</div>`
                  : `<img src="${thumbSrc}" referrerpolicy="no-referrer" crossorigin="anonymous"
                          style="width:100%;height:100%;object-fit:cover;cursor:pointer"
                          onclick="EvidenciaFotos.openLightbox('${id}',${i})"
                          onerror="this.src='${fullSrc}';this.onerror=null;">`
                }
                <button
                  title="Eliminar foto"
                  onclick="EvidenciaFotos.eliminarFoto('${id}','${f.timestamp || i}')"
                  style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center">
                  ✕
                </button>
                <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.55);color:#fff;font-size:0.6rem;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${f.nombre || 'foto'}
                </div>
              </div>`;
          }).join('')}
        </div>`;

    const html = `
      <div class="modal-title">🖼️ Fotos de Evidencia</div>
      <div class="modal-subtitle"><strong>${eq.MARCA || ''} ${eq.MODELO || ''}</strong> · ${eq.CODIGO || ''}</div>

      ${grid}

      <div style="display:flex;gap:8px;margin-top:16px;justify-content:center">
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--bg-hover);border:1px dashed var(--border);border-radius:var(--radius-md);font-size:0.85rem;transition:background 0.2s" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background='var(--bg-hover)'">
          📁 Subir imagen
          <input type="file" accept="image/*" multiple style="display:none" onchange="EvidenciaFotos.handleFileSelectGestor(this,'${id}')">
        </label>
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--bg-hover);border:1px dashed var(--border);border-radius:var(--radius-md);font-size:0.85rem;transition:background 0.2s" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background='var(--bg-hover)'">
          📷 Tomar foto
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="EvidenciaFotos.handleFileSelectGestor(this,'${id}')">
        </label>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="ModalGenerico.close()">Cerrar</button>
      </div>`;

    ModalGenerico.open(html, { size: 'modal-md' });
  }

  // ── Manejar selección de archivo (desde gestor o celda) ─────────────────
  async function handleFileSelect(input, registroId) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    await _procesarFoto(file, registroId);
  }

  async function handleFileSelectGestor(input, registroId) {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    input.value = '';
    for (const file of files) {
      await _procesarFoto(file, registroId);
    }
    // Re-abrir gestor para mostrar fotos actualizadas
    openGestor(registroId);
  }

  async function _procesarFoto(file, registroId) {
    Toast.info('📷 Procesando foto…');
    const base64Preview = await DriveUpload.getBase64Preview(file);

    const fotoObj = {
      nombre: file.name,
      preview: base64Preview,
      url: base64Preview,   // fallback a base64 hasta que Drive responda
      thumbUrl: base64Preview,
      fileId: null,
      subiendo: true,
      timestamp: new Date().toISOString(),
    };

    await _addFotoToRegistro(registroId, fotoObj);

    if (APP_CONFIG.appsScript.webAppUrl) {
      try {
        const result = await DriveUpload.uploadFileWithMeta(file);
        fotoObj.url      = result.url;
        fotoObj.thumbUrl = result.thumbUrl;
        fotoObj.fileId   = result.fileId;
        fotoObj.subiendo = false;
        fotoObj.preview  = ''; // liberar base64 ahora que Drive está
        await _updateFotoUrl(registroId, fotoObj);
        Toast.success('✅ Foto guardada en Drive');
      } catch (err) {
        Toast.error('Error subiendo foto: ' + err.message);
        fotoObj.subiendo = false;
        await _updateFotoUrl(registroId, fotoObj);
      }
    } else {
      fotoObj.subiendo = false;
      await _updateFotoUrl(registroId, fotoObj);
      Toast.warning('Foto guardada localmente (configura Drive en Admin)');
    }
  }

  // ── Eliminar foto del registro ───────────────────────────────────────────
  async function eliminarFoto(registroId, timestampOrIdx) {
    if (!confirm('¿Eliminar esta foto?')) return;
    const lotes = await LocalCache.getLotes();
    for (const lote of lotes) {
      const eq = lote.equipos?.find(e => e._registroId === registroId);
      if (eq?._fotos) {
        const before = eq._fotos.length;
        eq._fotos = eq._fotos.filter(f => f.timestamp !== timestampOrIdx);
        if (eq._fotos.length === before) {
          // Fallback: intentar por índice si timestamp no encontró nada
          const idx = parseInt(timestampOrIdx);
          if (!isNaN(idx)) eq._fotos.splice(idx, 1);
        }
        await LocalCache.updateLote(lote);
        Toast.success('Foto eliminada');
        // Refrescar gestor
        openGestor(registroId);
        break;
      }
    }
  }

  // ── Agregar foto al registro en IndexedDB ────────────────────────────────
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
        const f = eq._fotos.find(f => f.timestamp === foto.timestamp);
        if (f) {
          f.url      = foto.url;
          f.thumbUrl = foto.thumbUrl;
          f.fileId   = foto.fileId;
          f.subiendo = false;
          f.preview  = foto.preview || '';
        }
        await LocalCache.updateLote(lote);
        break;
      }
    }
  }

  // ── Lightbox ─────────────────────────────────────────────────────────────
  function openLightbox(registroId, idx) {
    const existing = document.getElementById('foto-lightbox');
    if (existing) existing.remove();

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
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:3000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px';

    const render = () => {
      const f = fotos[idx];
      const fullSrc = _fixDriveUrl(f.url, f.fileId, false) || f.preview || '';
      div.innerHTML = `
        <div style="position:relative;max-width:90vw;max-height:80vh">
          <img src="${fullSrc}" referrerpolicy="no-referrer" crossorigin="anonymous"
               style="max-width:90vw;max-height:75vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.6)"
               onerror="this.style.display='none';document.getElementById('lb-err').style.display='flex'">
          <div id="lb-err" style="display:none;align-items:center;justify-content:center;width:200px;height:200px;font-size:4rem">🖼️</div>
          <div style="color:#fff;text-align:center;font-size:0.8rem;margin-top:10px;opacity:0.7">${f.nombre||''} · ${idx+1}/${fotos.length}</div>
        </div>
        <div style="display:flex;gap:12px">
          ${idx>0?`<button onclick="event.stopPropagation();window._lightboxNav(-1)" style="background:rgba(255,255,255,0.15);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:1.2rem;backdrop-filter:blur(4px)">‹</button>`:''}
          ${idx<fotos.length-1?`<button onclick="event.stopPropagation();window._lightboxNav(1)" style="background:rgba(255,255,255,0.15);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:1.2rem;backdrop-filter:blur(4px)">›</button>`:''}
          <a href="${fullSrc}" target="_blank" style="display:inline-flex;align-items:center;padding:10px 16px;background:rgba(255,255,255,0.15);border-radius:8px;color:#fff;text-decoration:none;font-size:0.8rem">⬇️ Abrir</a>
          <button onclick="document.getElementById('foto-lightbox').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;padding:10px 16px;border-radius:8px;cursor:pointer">✕ Cerrar</button>
        </div>
      `;
    };

    window._lightboxNav = (dir) => { idx = Math.max(0, Math.min(fotos.length-1, idx+dir)); render(); };
    div.addEventListener('click', (e) => { if(e.target===div) div.remove(); });
    document.body.appendChild(div);
    render();
  }

  return {
    renderFotoCell,
    handleFileSelect,
    handleFileSelectGestor,
    openGestor,
    eliminarFoto,
    openLightbox,
  };
})();

window.EvidenciaFotos = EvidenciaFotos;
