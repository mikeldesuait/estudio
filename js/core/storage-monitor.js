/* ============================================================
   STORAGE MONITOR — Indicador de uso de localStorage
   ============================================================ */

const StorageMonitor = {
  intervalo: null,
  intervaloMs: 30000,

  APPS_ANTIGUAS: ['uned_v16', 'diet_plan_data_v5', 'diet_plan_personal_v19', 'diet_plan_school_v19', 'cisco_exam_trainer_full_v3'],

  PREFIJOS_ACTIVOS: ['progreso_', 'aprobada_', 'escritorio_elementos', 'eventos_calendario', 'estudio:cuaderno', 'estudio-subrayado:', 'testrouter_', 'theme', 'shell_', 'deepseek_', 'navegacion_'],

  tamanoClave(key, value) {
    return (key.length + (value || '').length) * 2;
  },

  analizar() {
    let total = 0;
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key) || '';
      const size = this.tamanoClave(key, value);
      total += size;
      items.push({ key, value, size });
    }
    const grupos = {
      'Marcas de subrayado': 0, 'Cuaderno digital': 0, 'Progreso de temas': 0,
      'Estado aprobadas': 0, 'Escritorio (widgets)': 0, 'Eventos calendario': 0,
      'Test Router': 0, 'Tema (claro/oscuro)': 0, 'Shell': 0, 'Otros': 0
    };
    items.forEach(item => {
      const k = item.key;
      if (k.startsWith('estudio-subrayado:')) grupos['Marcas de subrayado'] += item.size;
      else if (k.startsWith('estudio:cuaderno')) grupos['Cuaderno digital'] += item.size;
      else if (k.startsWith('progreso_')) grupos['Progreso de temas'] += item.size;
      else if (k.startsWith('aprobada_')) grupos['Estado aprobadas'] += item.size;
      else if (k === 'escritorio_elementos') grupos['Escritorio (widgets)'] += item.size;
      else if (k === 'eventos_calendario') grupos['Eventos calendario'] += item.size;
      else if (k.startsWith('testrouter')) grupos['Test Router'] += item.size;
      else if (k === 'theme') grupos['Tema (claro/oscuro)'] += item.size;
      else if (k.startsWith('shell_')) grupos['Shell'] += item.size;
      else grupos['Otros'] += item.size;
    });
    return { total, items, grupos };
  },

  formatear(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  colorSegunPct(pct) {
    if (pct < 60) return 'verde';
    if (pct < 85) return 'amarillo';
    return 'rojo';
  },

  esClaveActiva(key) {
    return this.PREFIJOS_ACTIVOS.some(function(p) { return key.startsWith(p) || key === p; });
  },

  renderizar() {
    const slot = document.getElementById('shellStorageMonitor');
    if (!slot) return;
    const { total } = this.analizar();
    const limite = 5 * 1024 * 1024;
    const pct = (total / limite) * 100;
    const color = this.colorSegunPct(pct);
    slot.innerHTML = '<div class="sm-badge sm-' + color + '">💾 ' + this.formatear(total) + ' (' + pct.toFixed(1) + '%)</div>';
    const badge = slot.querySelector('.sm-badge');
    if (badge) {
      badge.addEventListener('click', (e) => { e.stopPropagation(); this.abrirPopup(); });
    }
  },

  abrirPopup() {
    this.cerrarPopup();
    const { total, items, grupos } = this.analizar();
    const limite = 5 * 1024 * 1024;
    const pct = (total / limite) * 100;
    const color = this.colorSegunPct(pct);
    const gruposOrdenados = Object.entries(grupos).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
    const topClaves = items.sort((a, b) => b.size - a.size).slice(0, 5);

    const popup = document.createElement('div');
    popup.id = 'storageMonitorPopup';

    let html = '';
    html += '<div class="sm-popup-header"><h3>💾 Almacenamiento local</h3>';
    html += '<button class="sm-popup-close" onclick="StorageMonitor.cerrarPopup()">✕</button></div>';
    html += '<div class="sm-popup-body">';
    html += '<div class="sm-resumen sm-' + color + '">';
    html += '<div class="sm-resumen-principal"><span class="sm-resumen-titulo">Total usado</span>';
    html += '<span class="sm-resumen-valor">' + this.formatear(total) + '</span></div>';
    html += '<div class="sm-resumen-bar"><div class="sm-resumen-bar-fill sm-' + color + '" style="width:' + Math.min(pct, 100) + '%"></div></div>';
    html += '<div class="sm-resumen-info">' + pct.toFixed(1) + '% de ~5 MB</div></div>';
    html += '<div class="sm-grupos"><h4>Por categoría</h4>';
    gruposOrdenados.forEach(e => {
      html += '<div class="sm-grupo"><span class="sm-grupo-nombre">' + e[0] + '</span>';
      html += '<span class="sm-grupo-tamano">' + this.formatear(e[1]) + '</span></div>';
    });
    html += '</div>';
    html += '<div class="sm-top"><h4>Top 5 más grandes</h4>';
    topClaves.forEach((item, i) => {
      html += '<div class="sm-item"><span class="sm-item-num">' + (i + 1) + '.</span>';
      html += '<span class="sm-item-key">' + this.escapeHtml(item.key.substring(0, 40)) + '</span>';
      html += '<span class="sm-item-size">' + this.formatear(item.size) + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="sm-popup-footer">';
    html += '<button class="sm-btn sm-btn-secondary" onclick="StorageMonitor.exportarTodo()">📤 Exportar todo</button>';
    html += '<button class="sm-btn sm-btn-danger" onclick="StorageMonitor.limpiarAppsAntiguas()">🧹 Limpiar apps antiguas</button>';
    html += '<button class="sm-btn sm-btn-warning" onclick="StorageMonitor.limpiarSubrayadoHuerfano()">🧽 Subrayado huérfano</button>';
    html += '<button class="sm-btn sm-btn-secondary" onclick="StorageMonitor.verAppsActivas()">📊 Ver apps activas</button>';
    html += '<button class="sm-btn sm-btn-warning" onclick="StorageMonitor.limpiarMarcadoresHuerfanos()">🧹 Marcadores huérfanos</button>';
    html += '<button class="sm-btn sm-btn-danger" onclick="StorageMonitor.borrarCacheHTML()">🗑️ Borrar caché HTML</button>';
    html += '</div>';

    popup.innerHTML = html;
    document.body.appendChild(popup);

    setTimeout(() => {
      document.addEventListener('click', this._cerrarFuera = (e) => {
        if (!popup.contains(e.target)) this.cerrarPopup();
      });
    }, 100);
  },

  cerrarPopup() {
    const popup = document.getElementById('storageMonitorPopup');
    if (popup) popup.remove();
    if (this._cerrarFuera) {
      document.removeEventListener('click', this._cerrarFuera);
      this._cerrarFuera = null;
    }
  },

  exportarTodo() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    const json = JSON.stringify({ fecha: new Date().toISOString(), total_claves: localStorage.length, datos: data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estudio-backup-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    if (window.Navegacion && Navegacion.toast) Navegacion.toast('📤 Backup exportado');
  },

  limpiarAppsAntiguas() {
    const apps = this.APPS_ANTIGUAS.filter(k => localStorage.getItem(k) !== null);
    if (apps.length === 0) { alert('No hay apps antiguas'); return; }
    let total = 0;
    const det = apps.map(k => {
      const v = localStorage.getItem(k) || '';
      total += v.length * 2;
      return '  - ' + k + ' (' + (v.length * 2 / 1024).toFixed(1) + ' KB)';
    });
    const msg = 'BORRAR APPS ANTIGUAS\n\n' + det.join('\n') + '\n\nTOTAL: ' + (total / 1024).toFixed(1) + ' KB\n\nSeguro?';
    if (!confirm(msg)) return;
    apps.forEach(k => localStorage.removeItem(k));
    if (window.Navegacion && Navegacion.toast) Navegacion.toast('🧹 ' + (total / 1024).toFixed(0) + ' KB liberados');
    this.cerrarPopup();
    this.renderizar();
  },

  limpiarSubrayadoHuerfano() {
    const claves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('estudio-subrayado:') === 0) claves.push(k);
    }
    if (claves.length === 0) { alert('No hay marcas'); return; }
    let total = 0;
    claves.forEach(k => { try { total += (JSON.parse(localStorage.getItem(k)) || []).length; } catch (e) {} });
    if (!confirm('Limpiar marcas de subrayado\n\nConjuntos: ' + claves.length + '\nMarcas: ' + total + '\n\nBorrar TODAS?')) return;
    claves.forEach(k => localStorage.removeItem(k));
    if (window.Navegacion && Navegacion.toast) Navegacion.toast('🧽 ' + claves.length + ' conjuntos borrados');
    this.cerrarPopup();
    this.renderizar();
  },

  verAppsActivas() {
    const activas = [];
    const desconocidas = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (this.esClaveActiva(k)) activas.push(k);
      else desconocidas.push(k);
    }
    let msg = 'APPS ACTIVAS\n\nConocidas: ' + activas.length + '\n';
    activas.slice(0, 8).forEach(k => { msg += '  - ' + k.substring(0, 45) + '\n'; });
    if (activas.length > 8) msg += '  ... y ' + (activas.length - 8) + ' mas\n';
    msg += '\nDesconocidas: ' + desconocidas.length + '\n';
    desconocidas.slice(0, 8).forEach(k => { msg += '  - ' + k.substring(0, 45) + '\n'; });
    if (desconocidas.length > 8) msg += '  ... y ' + (desconocidas.length - 8) + ' mas';
    alert(msg);
  },

  limpiarMarcadoresHuerfanos() {
    if (!window.Shell) return;
    let total = 0;
    Object.keys(Shell.marcadoresAbiertos || {}).forEach(pd => {
      const m = Shell.marcadoresAbiertos[pd] || {};
      const n = Object.keys(m).length;
      if (n > 0) {
        total += n;
        Shell.marcadoresAbiertos[pd] = {};
        Shell.marcadorActivo[pd] = null;
      }
    });
    if (total === 0) {
      if (window.Navegacion && Navegacion.toast) Navegacion.toast('Sin marcadores huérfanos');
      return;
    }
    Shell.guardarMarcadoresAbiertos();
    if (window.Bookmarks && Bookmarks.render) Bookmarks.render();
    Shell.renderTabbar();
    if (window.Navegacion && Navegacion.toast) Navegacion.toast('🧹 ' + total + ' marcador(es) limpiado(s)');
    this.cerrarPopup();
    this.renderizar();
  },

  limpiarAntiguos() {
    if (!confirm('Borrar TODAS las marcas de subrayado?')) return;
    const claves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('estudio-subrayado:')) claves.push(k);
    }
    claves.forEach(k => localStorage.removeItem(k));
    if (window.Navegacion && Navegacion.toast) Navegacion.toast('🧹 ' + claves.length + ' conjuntos borrados');
    this.cerrarPopup();
    this.renderizar();
  },

  borrarCacheHTML() {
    if (!confirm('Borrar el HTML en caché?')) return;
    if (window.Shell && window.Shell.cacheHTML) {
      window.Shell.cacheHTML = {};
      if (window.Navegacion && Navegacion.toast) Navegacion.toast('🗑️ Caché HTML borrada');
    }
  },

  escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  },

  init() {
    setTimeout(() => this.renderizar(), 500);
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = setInterval(() => this.renderizar(), this.intervaloMs);
    console.log('✅ StorageMonitor inicializado');
  }
};

window.StorageMonitor = StorageMonitor;
