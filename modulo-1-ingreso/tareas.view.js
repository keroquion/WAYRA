/**
 * modulo-1-ingreso/tareas.view.js
 * Vista para gestionar la Tarea activa y registrar actividades diarias.
 */

const TareasView = (() => {
  let stream = null;
  let currentPhotoBase64 = null;
  let isSaving = false;

  const tiposActividad = [
    '🔧 Soporte Técnico',
    '💿 Formateo / Instalación',
    '📦 Entrega de Equipo / Accesorio',
    '🛒 Solicitud de Compra / Repuesto',
    '🧹 Mantenimiento Preventivo',
    '🌐 Redes / Cableado',
    '🛠️ Otro'
  ];

  async function render() {
    window._loteActivo = await LocalCache.getLoteActivo();
    const lotes = await LocalCache.getLotes();
    const el = document.getElementById('view-tareas');
    if (!el) return;

    const lotesCerrados = lotes
      .filter(l => !l.activo)
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
      .slice(0, 3);

    let mainContent = '';

    if (window._loteActivo) {
      mainContent = `
        <div class="card" style="border-left: 4px solid var(--success); background: rgba(34,197,94,0.06); padding: 12px 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-weight: 700; color: var(--success); font-size: 0.95rem;">📌 Tarea Activa: ${window._loteActivo.titulo}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                Responsable: <strong>${window._loteActivo.tecnico || 'No asignado'}</strong> · 
                Actividades: <strong>${window._loteActivo.equipos?.length || 0}</strong>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="Views.go('historial-tareas')">📋 Ver Historial</button>
              <button class="btn btn-danger btn-sm" onclick="TareasView.cerrarTareaActiva()">🔒 Cerrar Tarea</button>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start;">
          <!-- Formulario de Actividad -->
          <div class="card" style="flex: 1; min-width: 300px; padding: 20px;">
            <h3 style="margin-top:0; font-size: 1.1rem; color: var(--accent); margin-bottom: 16px;">➕ Registrar Nueva Actividad</h3>
            
            <div class="form-group">
              <label class="form-label">Tipo de Actividad</label>
              <select class="form-control" id="tar-tipo">
                <option value="" disabled selected>Selecciona el tipo...</option>
                ${tiposActividad.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Descripción / Detalles</label>
              <textarea class="form-control" id="tar-desc" rows="3" placeholder="Ej: Se entregó laptop DELL Latitude 3420 al usuario..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Adjuntar Foto / Evidencia (Opcional)</label>
              <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap: wrap;">
                <label class="btn btn-secondary btn-sm" style="cursor:pointer; display:flex; align-items:center; gap:6px; flex:1; justify-content:center; min-width:140px;">
                  📁 Subir Archivo
                  <input type="file" id="tar-foto-input" accept="image/*" style="display:none;">
                </label>
                <button class="btn btn-secondary btn-sm" id="tar-btn-camara" style="display:flex; align-items:center; gap:6px; flex:1; justify-content:center; min-width:140px;">
                  📸 Usar Cámara
                </button>
              </div>
              <div id="tar-camara-container" style="display:none; margin-top:10px; position:relative;">
                <video id="tar-video" style="width:100%; border-radius:8px; border:1px solid var(--border);" autoplay playsinline></video>
                <button class="btn btn-primary btn-sm" id="tar-btn-capturar" style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%);">Capturar</button>
              </div>
              <div id="tar-foto-preview-container" style="display:none; margin-top:10px; position:relative; width:120px;">
                <img id="tar-foto-preview" src="" style="width:100%; border-radius:8px; border:1px solid var(--border);">
                <button id="tar-btn-borrar-foto" style="position:absolute; top:-5px; right:-5px; background:var(--danger); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:12px;">✕</button>
              </div>
            </div>

            <button class="btn btn-primary" id="tar-btn-guardar" style="width: 100%; margin-top: 10px; font-size: 1rem; padding: 10px;">💾 Guardar Actividad</button>
          </div>

          <!-- Lista de Actividades -->
          <div class="card" style="width: 100%; max-width: 450px;">
            <h3 style="margin-top:0; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 16px;">📋 Actividades de esta Tarea</h3>
            <div id="tar-lista-actividades" style="display:flex; flex-direction:column; gap:12px;">
              ${_renderActividadesList(window._loteActivo.equipos || [])}
            </div>
          </div>
        </div>
      `;
    } else {
      mainContent = `
        <div class="card" style="border-left: 4px solid var(--warning); background: rgba(245,158,11,0.06); padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 1.4rem;">📭</span>
              <div>
                <div style="font-weight: 700; color: var(--warning); font-size: 0.9rem;">No hay ninguna Tarea activa</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                  Crea una nueva tarea para comenzar a registrar tus actividades del día.
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" onclick="TareaModal.abrir(TareasView.render)">➕ Nueva Tarea</button>
            </div>
          </div>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📝 Actividades Diarias</div>
          <div class="page-subtitle">Registra tareas, entregas y mantenimientos</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="Views.go('historial-tareas')">📋 Historial</button>
          ${!window._loteActivo ? `<button class="btn btn-primary btn-sm" onclick="TareaModal.abrir(TareasView.render)">➕ Nueva Tarea</button>` : ''}
        </div>
      </div>
      ${mainContent}
    `;

    _bindEvents();
  }

  function _renderActividadesList(actividades) {
    if (actividades.length === 0) {
      return `<div style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">No hay actividades registradas aún.</div>`;
    }

    return actividades.map(act => `
      <div style="border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--bg-hover); display:flex; gap:12px;">
        ${act._fotos && act._fotos.length > 0 
          ? `<img src="${act._fotos[0]}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; flex-shrink:0; border:1px solid var(--border);">` 
          : `<div style="width:60px; height:60px; background:rgba(0,0,0,0.05); border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--text-muted);">📷</div>`
        }
        <div style="flex:1;">
          <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); margin-bottom:4px;">${act.TIP_EQUIP || 'Actividad'}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">${act.OBSERVACION || act._obsPersonal || ''}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px;">
            🕒 ${new Date(act._timestamp || Date.now()).toLocaleTimeString('es-PE')}
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="TareasView.eliminarActividad('${act._registroId}')" style="color:var(--danger); padding:4px; height:fit-content;" title="Eliminar">🗑️</button>
      </div>
    `).reverse().join('');
  }

  function _bindEvents() {
    const fotoInput = document.getElementById('tar-foto-input');
    if (fotoInput) fotoInput.addEventListener('change', _manejarFoto);

    const btnCamara = document.getElementById('tar-btn-camara');
    if (btnCamara) btnCamara.addEventListener('click', _capturarWebcam);

    const btnCapturar = document.getElementById('tar-btn-capturar');
    if (btnCapturar) btnCapturar.addEventListener('click', _tomarSnapshot);

    const btnBorrarFoto = document.getElementById('tar-btn-borrar-foto');
    if (btnBorrarFoto) btnBorrarFoto.addEventListener('click', _borrarFoto);

    const btnGuardar = document.getElementById('tar-btn-guardar');
    if (btnGuardar) btnGuardar.addEventListener('click', _guardarActividad);
  }

  async function _manejarFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      currentPhotoBase64 = await ImageUtils.compressToBase64(file, 1024, 0.8);
      _mostrarFotoPreview();
    } catch (err) {
      Toast.error('Error al procesar la imagen');
    }
  }

  async function _capturarWebcam() {
    const video = document.getElementById('tar-video');
    const container = document.getElementById('tar-camara-container');
    if (!video || !container) return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      container.style.display = 'block';
    } catch (err) {
      Toast.error('No se pudo acceder a la cámara.');
    }
  }

  function _tomarSnapshot() {
    const video = document.getElementById('tar-video');
    const container = document.getElementById('tar-camara-container');
    if (!video || !stream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    container.style.display = 'none';

    _mostrarFotoPreview();
  }

  function _mostrarFotoPreview() {
    const previewContainer = document.getElementById('tar-foto-preview-container');
    const previewImg = document.getElementById('tar-foto-preview');
    if (previewContainer && previewImg && currentPhotoBase64) {
      previewImg.src = currentPhotoBase64;
      previewContainer.style.display = 'block';
    }
  }

  function _borrarFoto() {
    currentPhotoBase64 = null;
    const previewContainer = document.getElementById('tar-foto-preview-container');
    const input = document.getElementById('tar-foto-input');
    if (previewContainer) previewContainer.style.display = 'none';
    if (input) input.value = '';
  }

  async function _guardarActividad() {
    if (isSaving) return;
    
    const tipo = document.getElementById('tar-tipo')?.value;
    const desc = document.getElementById('tar-desc')?.value?.trim();

    if (!tipo) { Toast.warning('Selecciona el tipo de actividad'); return; }
    if (!desc) { Toast.warning('Ingresa una descripción'); return; }

    const btn = document.getElementById('tar-btn-guardar');
    try {
      isSaving = true;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Guardando...';

      let fotoUrl = '';
      if (currentPhotoBase64) {
        const uploadRes = await DriveUpload.uploadFileWithMeta(currentPhotoBase64, 'image/jpeg', 'Evidencia_Actividad', null);
        if (uploadRes && uploadRes.url) fotoUrl = uploadRes.url;
      }

      const dummyEquipo = {
        CODIGO: 'ACT-' + Date.now(),
        SERIE: 'N/A',
        TIP_EQUIP: tipo,
        MARCA: 'N/A',
        MODELO: 'Actividad',
        ESTADO: 'C',
        OBSERVACION: desc
      };

      const registro = await LocalCache.agregarEquipoALote(window._loteActivo.id, dummyEquipo, desc);
      
      // Update fotos
      if (fotoUrl) {
        registro._fotos = [fotoUrl];
        await LocalCache.updateLote(window._loteActivo); // Ya se actualizó internamente en LocalCache, pero forzamos sincronizacion si es necesario
      }

      Toast.success('✅ Actividad registrada');
      _borrarFoto();
      document.getElementById('tar-tipo').value = '';
      document.getElementById('tar-desc').value = '';

      render(); // Refrescar lista
    } catch (err) {
      Toast.error(err.message);
    } finally {
      isSaving = false;
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar Actividad';
    }
  }

  async function eliminarActividad(registroId) {
    if (!confirm('¿Seguro que deseas eliminar esta actividad?')) return;
    await LocalCache.eliminarEquipoDeLote(window._loteActivo.id, registroId);
    Toast.info('Actividad eliminada');
    render();
  }

  async function cerrarTareaActiva() {
    if (!window._loteActivo) return;
    if (!confirm('¿Seguro que deseas cerrar esta tarea?')) return;
    window._loteActivo.activo = false;
    await LocalCache.updateLote(window._loteActivo);
    Toast.success('Tarea cerrada correctamente');
    window._loteActivo = null;
    render();
  }

  function onLeave() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  return { render, onLeave, eliminarActividad, cerrarTareaActiva };
})();

window.TareasView = TareasView;
