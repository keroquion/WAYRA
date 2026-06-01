/**
 * modulo-4-escaner/escaner.view.js — Inventario Pro v3
 * Módulo de escáner para consultar información completa del equipo.
 *
 * v3 MEJORAS:
 *   - Reporte de cobertura: Garantía (6 meses) + Soporte Técnico (3 años) desde FEC_COMPRA
 *   - Documento de Compra (DOC_COMPRA) visible en resultados
 *   - Specs ampliados: Procesador, RAM, HD/SSD, Pantalla, Pulgadas
 *   - Historial en lotes: en qué lotes aparece este equipo
 *   - Fotos del equipo (si existen en algún lote)
 *   - Botones de acción: Agregar a Lote Activo, Imprimir Ficha
 */

const EscanerView = (() => {
  let _html5QrcodeScanner = null;

  async function render() {
    const el = document.getElementById('view-escaner');
    if (!el) return;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📷 Búsqueda por Escáner</div>
          <div class="page-subtitle">Escanea un código de barras o busca manualmente para ver reporte completo del equipo</div>
        </div>
      </div>

      <div class="container-md">

        <!-- Búsqueda Manual -->
        <div class="card card-padded">
          <label class="form-label">Buscar por Serie o Código</label>
          <div class="flex-gap-10">
            <input type="text" id="escaner-input" class="form-control input-lg"
              placeholder="Ej: ABC12345..."
              onkeydown="if(event.key==='Enter') EscanerView.buscar(this.value)">
            <button class="btn btn-primary btn-search" onclick="EscanerView.buscar(document.getElementById('escaner-input').value)">
              🔍 Buscar
            </button>
          </div>
        </div>

        <!-- Botón de Cámara -->
        <div class="text-center">
          <button class="btn btn-secondary btn-block-lg" id="btn-toggle-camera"
            onclick="EscanerView.toggleCamera()">
            📸 Activar Cámara para Escanear
          </button>
        </div>

        <!-- Contenedor del Escáner -->
        <div id="reader-container" style="display:none;margin-bottom:20px">
          <div id="reader" class="reader-wrapper"></div>
          <p class="text-hint">
            Apunta la cámara al código de barras o QR
          </p>
        </div>

        <!-- Resultados -->
        <div id="escaner-resultado">
          ${DOM.emptyState('🔎', 'Busca un equipo', 'Ingresa un código o activa la cámara para buscar un equipo en la base de datos.')}
        </div>
      </div>
    `;
  }

  // ── Cámara ──────────────────────────────────────────────────────────

  function toggleCamera() {
    const readerContainer = document.getElementById('reader-container');
    const btn = document.getElementById('btn-toggle-camera');

    if (readerContainer.style.display === 'none') {
      readerContainer.style.display = 'block';
      btn.innerHTML = '🛑 Detener Cámara';
      btn.classList.replace('btn-secondary', 'btn-danger');
      _iniciarEscaner();
    } else {
      readerContainer.style.display = 'none';
      btn.innerHTML = '📸 Activar Cámara para Escanear';
      btn.classList.replace('btn-danger', 'btn-secondary');
      _detenerEscaner();
    }
  }

  function _iniciarEscaner() {
    if (typeof Html5Qrcode === 'undefined') {
      Toast.error('La librería del escáner no está cargada. Verifica tu conexión a internet.');
      toggleCamera();
      return;
    }

    _html5QrcodeScanner = new Html5Qrcode('reader');
    _html5QrcodeScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      (decodedText) => {
        document.getElementById('escaner-input').value = decodedText;
        if (navigator.vibrate) navigator.vibrate(200);
        Toast.success('Código detectado: ' + decodedText);
        buscar(decodedText);
        toggleCamera();
      },
      () => { /* ignore per-frame errors */ }
    ).catch((err) => {
      Toast.error('Error al iniciar cámara. Comprueba los permisos.');
      console.error(err);
      toggleCamera();
    });
  }

  function _detenerEscaner() {
    if (_html5QrcodeScanner) {
      _html5QrcodeScanner.stop().then(() => {
        _html5QrcodeScanner.clear();
        _html5QrcodeScanner = null;
      }).catch(err => console.error('Error al detener escáner', err));
    }
  }

  // ── Búsqueda ────────────────────────────────────────────────────────

  async function buscar(query) {
    query = query.trim();
    if (!query) {
      Toast.warning('Ingresa un código para buscar');
      document.getElementById('escaner-input').focus();
      return;
    }

    const resEl = document.getElementById('escaner-resultado');
    resEl.innerHTML = `<div style="text-align:center;padding:40px"><span class="spinner"></span><div style="margin-top:10px;color:var(--text-muted)">Buscando equipo en la base de datos…</div></div>`;

    try {
      const data = await SheetsAPI.fetchAll();
      const qLower = query.toLowerCase();

      const resultados = data.filter(r =>
        (r.CODIGO && r.CODIGO.toLowerCase().includes(qLower)) ||
        (r.SERIE  && r.SERIE.toLowerCase().includes(qLower))
      );

      await _mostrarResultados(resultados, query);
    } catch (err) {
      resEl.innerHTML = `
        <div class="card" style="padding:20px;text-align:center;color:var(--danger);border-left:4px solid var(--danger)">
          <div style="font-size:2rem;margin-bottom:10px">⚠️</div>
          Error al buscar: ${DOM.esc(err.message)}
        </div>`;
    }
  }

  // ── Resultados ──────────────────────────────────────────────────────

  async function _mostrarResultados(resultados, query) {
    const resEl = document.getElementById('escaner-resultado');

    if (!resultados || resultados.length === 0) {
      resEl.innerHTML = `
        <div class="card" style="padding:30px;text-align:center;color:var(--text-muted)">
          ${DOM.emptyState('📭', 'No se encontró ningún equipo', `No hay coincidencias para: <strong>${DOM.esc(query)}</strong>`)}
          <button class="btn btn-secondary btn-sm" style="margin-top:15px"
            onclick="document.getElementById('escaner-input').value='';document.getElementById('escaner-input').focus()">
            Nueva búsqueda
          </button>
        </div>`;
      return;
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
        <h4 style="margin:0">Resultados Encontrados:
          <span style="background:var(--accent);color:white;padding:2px 8px;border-radius:12px;font-size:0.9rem">${resultados.length}</span>
        </h4>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">`;

    for (const r of resultados) {
      html += await _renderEquipoCard(r, query);
    }

    html += `</div>`;
    resEl.innerHTML = html;
  }

  // ── Ficha de equipo individual ───────────────────────────────────────

  async function _renderEquipoCard(r, query) {
    const safe = Formatters.safe;
    const esc = DOM.esc;

    // Calcular cobertura desde FEC_COMPRA
    const cobertura = GarantiaCalculator.calcular(r.FEC_COMPRA);

    // Buscar este equipo en los lotes locales
    const codigoOSerie = r.CODIGO || r.SERIE || '';
    const enLotes = await LotesService.findEnLotesPorCodigo(codigoOSerie);

    // Recoger fotos de todos los lotes donde aparece
    const todasFotos = [];
    for (const { equipo } of enLotes) {
      if (equipo._fotos?.length) {
        todasFotos.push(...equipo._fotos);
      }
    }

    return `
      <div class="result-card" style="padding:0;overflow:hidden">
        <div class="result-header" style="background:var(--bg-secondary);padding:18px">
          <div>
            <div class="result-title">
              <strong style="font-family:monospace;letter-spacing:1px">${safe(r.CODIGO)}</strong>
              ${Formatters.estadoBadge(r.ESTADO)}
            </div>
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:4px">
              ${safe(r.MARCA)} <strong>${safe(r.MODELO)}</strong> · ${safe(r.TIP_EQUIP)}
            </div>
            ${r.SERIE ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px">Serie: <code class="inline-code">${esc(r.SERIE)}</code></div>` : ''}
          </div>
        </div>

        <div style="padding:20px;display:flex;flex-direction:column;gap:20px">

          <!-- Specs -->
          <div>
            ${DOM.sectionTitle('⚙️ Especificaciones')}
            <div class="spec-grid">
              ${_specRow('Procesador', r.PROCESADOR)}
              ${_specRow('RAM', r.RAM)}
              ${_specRow('HD/SSD', r.HD_SSD)}
              ${_specRow('Pantalla', r.PANTALLA)}
              ${_specRow('Pulgadas', r.PULGADAS)}
              ${_specRow('Sucursal', r.SUCURSAL)}
              ${r.CASE ? _specRow('Case', r.CASE) : ''}
              ${r.RESOLUCION ? _specRow('Resolución', r.RESOLUCION) : ''}
            </div>
          </div>

          <!-- Cobertura Garantía / Soporte -->
          <div>
            ${DOM.sectionTitle('🛡️ Cobertura')}
            ${Formatters.coberturaSection(cobertura)}
          </div>

          <!-- Documento de Compra -->
          ${r.DOC_COMPRA ? `
          <div>
            ${DOM.sectionTitle('📄 Documento de Compra')}
            <div style="background:var(--bg-hover);padding:10px 14px;border-radius:8px;display:flex;align-items:center;gap:10px">
              <span style="font-size:1.3rem">🧾</span>
              <div>
                ${_isUrl(r.DOC_COMPRA)
                  ? `<a href="${esc(r.DOC_COMPRA)}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600;font-size:0.9rem">${esc(r.DOC_COMPRA)}</a>`
                  : `<strong style="font-size:0.95rem">${esc(r.DOC_COMPRA)}</strong>`}
                ${r.FEC_COMPRA ? `<div style="font-size:0.75rem;color:var(--text-muted)">Fecha de compra: ${Formatters.fechaCorta(r.FEC_COMPRA)}</div>` : ''}
              </div>
            </div>
          </div>` : ''}

          <!-- Venta (si existe) -->
          ${r.DOC_VENTA || r.FEC_VENTA ? `
          <div>
            ${DOM.sectionTitle('💰 Datos de Venta')}
            <div style="background:var(--bg-hover);padding:10px 14px;border-radius:8px;font-size:0.88rem">
              ${r.DOC_VENTA ? `<div>Documento: <strong>${esc(r.DOC_VENTA)}</strong></div>` : ''}
              ${r.FEC_VENTA ? `<div>Fecha: ${Formatters.fechaCorta(r.FEC_VENTA)}</div>` : ''}
            </div>
          </div>` : ''}

          <!-- Observaciones -->
          ${r.OBSERVACION ? `
          <div>
            ${DOM.sectionTitle('📝 Observaciones')}
            <div style="padding:10px 14px;border:1px dashed var(--border);border-radius:8px;font-size:0.88rem;color:var(--text-secondary)">
              ${esc(r.OBSERVACION)}
            </div>
          </div>` : ''}

          <!-- Fotos del equipo (de lotes locales) -->
          ${todasFotos.length > 0 ? `
          <div>
            ${DOM.sectionTitle('📷 Fotos (' + todasFotos.length + ')')}
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${todasFotos.slice(0, 6).map(f => {
                const src = f.thumbUrl || f.url || f.preview || '';
                return `<img src="${src}" referrerpolicy="no-referrer" crossorigin="anonymous"
                  style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer"
                  onerror="this.style.display='none'"
                  title="${esc(f.nombre || 'foto')}">`;
              }).join('')}
              ${todasFotos.length > 6 ? `<div style="width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:var(--bg-hover);border-radius:6px;font-size:0.85rem;font-weight:700;color:var(--text-muted)">+${todasFotos.length - 6}</div>` : ''}
            </div>
          </div>` : ''}

          <!-- Historial Lotes -->
          ${enLotes.length ? `
          <div class="history-section">
            ${DOM.sectionTitle('📋 Historial en Lotes')}
            <div>
              ${enLotes.map(({ lote, equipo }) => {
                const estadoSop = equipo._estadoSoporte;
                const estadoGar = equipo._estadoGarantia;
                const badges = [];
                if (estadoSop) badges.push(`<span class="history-badge">🔧 ${estadoSop}</span>`);
                if (estadoGar) badges.push(`<span class="history-badge">🛡️ ${estadoGar}</span>`);
                return `<div class="history-item">
                  <div>
                    <div class="history-title">${esc(lote.titulo || lote.id)}</div>
                    ${lote.fechaCreacion ? `<div class="history-meta">${Formatters.fechaCorta(lote.fechaCreacion)}</div>` : ''}
                  </div>
                  ${badges.length ? `<div>${badges.join(' ')}</div>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          <!-- Acciones -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--border)">
            <button class="btn btn-primary btn-sm" onclick="EscanerView.agregarALoteActivo('${esc(codigoOSerie)}')" style="gap:4px">
              ➕ Agregar a Lote Activo
            </button>
            <button class="btn btn-secondary btn-sm" onclick="EscanerView.imprimirFicha('${esc(codigoOSerie)}')" style="gap:4px">
              🖨️ Imprimir Ficha
            </button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('escaner-input').value='';document.getElementById('escaner-input').focus()">
              🔄 Nueva búsqueda
            </button>
          </div>
        </div>
      </div>`;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  function _specRow(label, value) {
    if (!value || value === '.' || value === '*') return '';
    return `<div class="spec-item">
      <span class="spec-label">${DOM.esc(label)}</span>
      <span class="spec-value">${DOM.esc(value)}</span>
    </div>`;
  }

  function _isUrl(str) {
    if (!str) return false;
    return /^https?:\/\//i.test(str.trim());
  }

  // ── Acciones ────────────────────────────────────────────────────────

  async function agregarALoteActivo(codigoOSerie) {
    const lote = await LotesService.getLoteActivo();
    if (!lote) {
      Toast.warning('No hay un lote activo. Crea o abre un lote primero.');
      return;
    }

    // Verificar si ya está en el lote
    const yaExiste = lote.equipos?.some(e =>
      (e.CODIGO || '').toUpperCase() === codigoOSerie.toUpperCase() ||
      (e.SERIE  || '').toUpperCase() === codigoOSerie.toUpperCase()
    );
    if (yaExiste) {
      Toast.info('Este equipo ya está en el lote activo.');
      return;
    }

    // Buscar datos completos del equipo
    const equipo = await SheetsAPI.findByCodigoOSerie(codigoOSerie);
    if (!equipo) {
      Toast.error('No se encontró el equipo en la base de datos.');
      return;
    }

    // Agregar al lote activo
    if (!lote.equipos) lote.equipos = [];
    equipo._registroId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    equipo._addedAt = new Date().toISOString();
    lote.equipos.push(equipo);
    await LocalCache.updateLote(lote);

    EventBus.emit('equipo:added', { equipo, lote });
    Toast.success(`✅ ${codigoOSerie} agregado a "${lote.titulo || lote.id}"`);
  }

  function imprimirFicha(codigoOSerie) {
    // Obtener el card del resultado y usar su HTML para imprimir
    const resEl = document.getElementById('escaner-resultado');
    if (!resEl) return;

    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) { Toast.error('No se pudo abrir ventana de impresión'); return; }

    w.document.write(`<!DOCTYPE html><html><head>
      <title>Ficha ${codigoOSerie}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Segoe UI','Roboto',sans-serif; padding:20px; color:#333; }
        .card { border:1px solid #ddd; border-radius:8px; margin-bottom:15px; }
        .badge { padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700; }
        strong { font-weight:600; }
        code { background:#f1f1f1; padding:1px 4px; border-radius:3px; }
        @media print { body { padding:10px; } }
      </style>
    </head><body>
      <h2 style="margin-bottom:15px">📋 Ficha de Equipo — ${codigoOSerie}</h2>
      ${resEl.innerHTML}
      <div style="margin-top:20px;text-align:center;font-size:0.75rem;color:#999">
        Generado por ${APP_CONFIG.appName} · ${new Date().toLocaleDateString('es-PE')}
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  function onLeave() {
    _detenerEscaner();
  }

  return { render, toggleCamera, buscar, agregarALoteActivo, imprimirFicha, onLeave };
})();

window.EscanerView = EscanerView;
