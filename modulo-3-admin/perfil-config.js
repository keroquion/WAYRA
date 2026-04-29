/**
 * modulo-3-admin/perfil-config.js
 * Export/Import de configuración completa entre PCs.
 */

const PerfilConfig = (() => {

  async function exportarConfig() {
    const cats = await LocalCache.getCatalogos();
    const config = {
      version: APP_CONFIG.version,
      empresa: APP_CONFIG.empresa,
      catalogos: cats,
      sheets: { ...APP_CONFIG.sheets, apiKey: '***REDACTED***' }, // no exportar API key
      appsScript: { ...APP_CONFIG.appsScript, webAppUrl: '***REDACTED***' },
      rowsPerPage: APP_CONFIG.rowsPerPage,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventario-pro-config-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Configuración exportada');
  }

  async function importarConfig(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const config = JSON.parse(e.target.result);
          if (!config.version) throw new Error('Archivo de configuración inválido');

          // Aplicar empresa
          if (config.empresa) Object.assign(APP_CONFIG.empresa, config.empresa);
          // Aplicar catálogos
          if (config.catalogos) {
            for (const [k, v] of Object.entries(config.catalogos)) {
              await LocalCache.setCatalogo(k, v);
            }
          }
          // Aplicar preferencias
          if (config.rowsPerPage) APP_CONFIG.rowsPerPage = config.rowsPerPage;

          // Persistir empresa en IndexedDB
          await LocalCache.setConfig('empresa', APP_CONFIG.empresa);

          Toast.success('Configuración importada correctamente');
          resolve(config);
        } catch (err) {
          Toast.error('Error al importar: ' + err.message);
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsText(file);
    });
  }

  async function guardarEmpresa() {
    const emp = {
      nombre:    document.getElementById('admin-emp-nombre')?.value?.trim() || '',
      ruc:       document.getElementById('admin-emp-ruc')?.value?.trim() || '',
      direccion: document.getElementById('admin-emp-dir')?.value?.trim() || '',
      telefono:  document.getElementById('admin-emp-tel')?.value?.trim() || '',
      email:     document.getElementById('admin-emp-email')?.value?.trim() || '',
    };

    const errRuc = emp.ruc ? Validators.ruc(emp.ruc) : null;
    if (errRuc) { Toast.warning(errRuc); return; }

    Object.assign(APP_CONFIG.empresa, emp);
    await LocalCache.setConfig('empresa', emp);
    await AuditTrail.log('UPDATE', 'EMPRESA', emp);
    Toast.success('Datos de empresa guardados');
  }

  async function cargarEmpresaGuardada() {
    const saved = await LocalCache.getConfig('empresa');
    if (saved) Object.assign(APP_CONFIG.empresa, saved);
  }

  return { exportarConfig, importarConfig, guardarEmpresa, cargarEmpresaGuardada };
})();

window.PerfilConfig = PerfilConfig;
