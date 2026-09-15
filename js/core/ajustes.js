/* ============================================================
   AJUSTES — Modal de configuración con Export/Import
   ============================================================ */

const Ajustes = {
  // Claves que se exportan/importan
  clavesExportar: [
    'escritorio_notas',
    'agenda_posicion',
    'agenda_vista',
    'horario_semanal',
    'eventos_calendario',
    'accesos_rapidos',
    'estudio_log',
    'pomodoro_config',
    'pomodoro_estado',
    'theme',
    'shell_pestana_activa',
    'shell_estados_pestanas',
    'shell_historiales',
    'shell_marcadores_abiertos',
    'shell_orden_lru',
    'shell_marcador_activo',
    'escritorio_elementos'
  ],

  /* ═══════════════════════════════════════════════════════
     ABRIR / CERRAR
     ═══════════════════════════════════════════════════════ */

  abrir() {
    let modal = document.getElementById('ajustesModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ajustesModal';
      modal.className = 'ajustes-modal-overlay';
      modal.innerHTML = this.getTemplate();
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.cerrar();
      });

      this.bindEventos();
    }

    this.actualizarInfo();
    this.actualizarTema();
    modal.classList.add('show');
  },

  cerrar() {
    const modal = document.getElementById('ajustesModal');
    if (modal) modal.classList.remove('show');
  },

  /* ═══════════════════════════════════════════════════════
     TEMPLATE
     ═══════════════════════════════════════════════════════ */

  getTemplate() {
    return `
      <div class="ajustes-modal">
        <div class="ajustes-header">
          <h3><i class="fas fa-cog"></i> Ajustes</h3>
          <button class="close" onclick="Ajustes.cerrar()">✕</button>
        </div>

        <div class="ajustes-body">

          <!-- ═══ DATOS ═══ -->
          <div class="ajustes-seccion">
            <div class="ajustes-seccion-titulo">
              <i class="fas fa-database"></i> Datos
            </div>

            <div class="ajustes-opcion">
              <div class="ajustes-opcion-info">
                <div class="ajustes-opcion-titulo">
                  <i class="fas fa-download"></i> Exportar backup
                </div>
                <div class="ajustes-opcion-desc">
                  Descarga un archivo .json con todos tus datos
                </div>
              </div>
              <button class="ajustes-btn primary" onclick="Ajustes.exportar()">
                <i class="fas fa-download"></i> Exportar
              </button>
            </div>

            <div class="ajustes-opcion">
              <div class="ajustes-opcion-info">
                <div class="ajustes-opcion-titulo">
                  <i class="fas fa-upload"></i> Importar backup
                </div>
                <div class="ajustes-opcion-desc">
                  Restaura los datos desde un archivo .json
                </div>
              </div>
              <button class="ajustes-btn secondary" onclick="Ajustes.importar()">
                <i class="fas fa-upload"></i> Importar
              </button>
              <input type="file" id="ajustesArchivoInput" accept=".json" style="display:none;" onchange="Ajustes.procesarArchivo(event)">
            </div>
          </div>

          <!-- ═══ APARIENCIA ═══ -->
          <div class="ajustes-seccion">
            <div class="ajustes-seccion-titulo">
              <i class="fas fa-palette"></i> Apariencia
            </div>

            <div class="ajustes-opcion">
              <div class="ajustes-opcion-info">
                <div class="ajustes-opcion-titulo">Tema</div>
                <div class="ajustes-opcion-desc">Cambia entre claro y oscuro</div>
              </div>
              <div class="ajustes-tema-selector">
                <button class="ajustes-tema-opcion" data-tema="light" onclick="Ajustes.cambiarTema('light')">
                  <i class="fas fa-sun"></i>
                  <span>Claro</span>
                </button>
                <button class="ajustes-tema-opcion" data-tema="dark" onclick="Ajustes.cambiarTema('dark')">
                  <i class="fas fa-moon"></i>
                  <span>Oscuro</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ═══ POMODORO ═══ -->
          <div class="ajustes-seccion">
            <div class="ajustes-seccion-titulo">
              <i class="fas fa-hourglass-half"></i> Pomodoro
            </div>

            <div class="ajustes-opcion">
              <div class="ajustes-opcion-info">
                <div class="ajustes-opcion-titulo">Duración de las sesiones</div>
                <div class="ajustes-opcion-desc" id="ajustesPomodoroInfo">
                  Cargando...
                </div>
              </div>
              <button class="ajustes-btn secondary" onclick="Ajustes.abrirConfigPomodoro()">
                <i class="fas fa-cog"></i> Configurar
              </button>
            </div>
          </div>

          <!-- ═══ INFORMACIÓN ═══ -->
          <div class="ajustes-seccion">
            <div class="ajustes-seccion-titulo">
              <i class="fas fa-info-circle"></i> Información
            </div>

            <div class="ajustes-info-grid">
              <div class="ajustes-info-item">
                <span class="ajustes-info-label">Versión</span>
                <span class="ajustes-info-valor">v1</span>
              </div>
              <div class="ajustes-info-item">
                <span class="ajustes-info-label">Áreas</span>
                <span class="ajustes-info-valor" id="ajustesInfoAreas">-</span>
              </div>
              <div class="ajustes-info-item">
                <span class="ajustes-info-label">Asignaturas</span>
                <span class="ajustes-info-valor" id="ajustesInfoAsignaturas">-</span>
              </div>
              <div class="ajustes-info-item">
                <span class="ajustes-info-label">Marcadores</span>
                <span class="ajustes-info-valor" id="ajustesInfoMarcadores">-</span>
              </div>
              <div class="ajustes-info-item">
                <span class="ajustes-info-label">Post-its</span>
                <span class="ajustes-info-valor" id="ajustesInfoPostits">-</span>
              </div>
              <div class="ajustes-info-item">
                <span class="ajustes-info-label">Eventos</span>
                <span class="ajustes-info-valor" id="ajustesInfoEventos">-</span>
              </div>
            </div>
          </div>

        </div>

        <div class="ajustes-footer">
          <button class="ajustes-btn primary" onclick="Ajustes.cerrar()">
            Cerrar
          </button>
        </div>
      </div>
    `;
  },

  bindEventos() {
    // Nada especial por ahora
  },

  /* ═══════════════════════════════════════════════════════
     EXPORTAR
     ═══════════════════════════════════════════════════════ */

  exportar() {
    const backup = {
      version: '1.0',
      fecha: new Date().toISOString(),
      app: 'Estudio Personal',
      datos: {}
    };

    // Recoger todas las claves que empiezan por los prefijos conocidos
    this.clavesExportar.forEach(clave => {
      const valor = localStorage.getItem(clave);
      if (valor !== null) {
        backup.datos[clave] = valor;
      }
    });

    // Añadir todas las aprobadas
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('aprobada_')) {
        backup.datos[key] = localStorage.getItem(key);
      }
    }

    // Descargar
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'estudio-backup-' + fecha + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.toast('✅ Backup exportado: ' + a.download);
  },

  /* ═══════════════════════════════════════════════════════
     IMPORTAR
     ═══════════════════════════════════════════════════════ */

  importar() {
    const input = document.getElementById('ajustesArchivoInput');
    if (input) input.click();
  },

  procesarArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);

        if (!backup.datos || typeof backup.datos !== 'object') {
          alert('⚠️ El archivo no tiene el formato esperado');
          return;
        }

        // Contar elementos
        const totalClaves = Object.keys(backup.datos).length;

        // Preguntar qué hacer
        const respuesta = confirm(
          `📦 Backup encontrado\n\n` +
          `Fecha: ${backup.fecha || 'desconocida'}\n` +
          `Elementos: ${totalClaves}\n\n` +
          `¿Cómo quieres importarlo?\n\n` +
          `OK = REEMPLAZAR todos los datos actuales\n` +
          `Cancelar = FUSIONAR con los datos actuales`
        );

        if (respuesta) {
          // REEMPLAZAR
          if (!confirm('⚠️ ¿Seguro que quieres REEMPLAZAR todos los datos actuales?')) {
            return;
          }
          this.reemplazarDatos(backup.datos);
        } else {
          // FUSIONAR
          this.fusionarDatos(backup.datos);
        }

      } catch (err) {
        alert('❌ Error al leer el archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  reemplazarDatos(datos) {
    // Borrar todas las claves conocidas primero
    const clavesBorrar = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (this.clavesExportar.includes(key) || key.startsWith('aprobada_')) {
        clavesBorrar.push(key);
      }
    }
    clavesBorrar.forEach(k => localStorage.removeItem(k));

    // Poner las nuevas
    Object.entries(datos).forEach(([key, valor]) => {
      localStorage.setItem(key, valor);
    });

    this.toast('✅ Datos reemplazados');
    setTimeout(() => location.reload(), 800);
  },

  fusionarDatos(datos) {
    Object.entries(datos).forEach(([key, valor]) => {
      localStorage.setItem(key, valor);
    });

    this.toast('✅ Datos fusionados');
    setTimeout(() => location.reload(), 800);
  },

  /* ═══════════════════════════════════════════════════════
     TEMA
     ═══════════════════════════════════════════════════════ */

  cambiarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('theme', tema);

    // Actualizar botón del topbar
    const btnTopbar = document.getElementById('shellBtnTema');
    if (btnTopbar) {
      const icono = btnTopbar.querySelector('i');
      if (icono) icono.className = tema === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    this.actualizarTema();
    this.toast(tema === 'dark' ? '🌙 Tema oscuro' : '☀️ Tema claro');
  },

  actualizarTema() {
    const actual = document.documentElement.getAttribute('data-theme') || 'light';
    document.querySelectorAll('.ajustes-tema-opcion').forEach(btn => {
      btn.classList.toggle('activo', btn.dataset.tema === actual);
    });
  },

  /* ═══════════════════════════════════════════════════════
     POMODORO
     ═══════════════════════════════════════════════════════ */

  abrirConfigPomodoro() {
    this.cerrar();
    setTimeout(() => {
      if (window.Pomodoro && typeof Pomodoro.abrirConfig === 'function') {
        Pomodoro.abrirConfig();
      }
    }, 300);
  },

  /* ═══════════════════════════════════════════════════════
     INFORMACIÓN
     ═══════════════════════════════════════════════════════ */

  actualizarInfo() {
    // Áreas
    const areas = window.AREAS ? window.AREAS.length : 0;
    document.getElementById('ajustesInfoAreas').textContent = areas;

    // Asignaturas (contar todas)
    let totalAsig = 0;
    if (window.Shell && Shell._asignaturasCache) {
      Object.values(Shell._asignaturasCache).forEach(lista => {
        if (Array.isArray(lista)) totalAsig += lista.length;
      });
    }
    document.getElementById('ajustesInfoAsignaturas').textContent = totalAsig || '-';

    // Marcadores
    const marcadores = JSON.parse(localStorage.getItem('accesos_rapidos') || '[]');
    document.getElementById('ajustesInfoMarcadores').textContent = marcadores.length;

    // Post-its
    const postits = JSON.parse(localStorage.getItem('escritorio_notas') || '[]');
    document.getElementById('ajustesInfoPostits').textContent = postits.length;

    // Eventos + patrones
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const patrones = JSON.parse(localStorage.getItem('horario_semanal') || '[]');
    document.getElementById('ajustesInfoEventos').textContent = eventos.length + ' + ' + patrones.length + ' patrones';

    // Pomodoro
    const config = JSON.parse(localStorage.getItem('pomodoro_config') || 'null');
    const infoEl = document.getElementById('ajustesPomodoroInfo');
    if (infoEl) {
      if (config) {
        infoEl.textContent = config.duracionTrabajo + ' min trabajo · ' + config.duracionDescanso + ' min descanso';
      } else {
        infoEl.textContent = '25 min trabajo · 5 min descanso (por defecto)';
      }
    }
  },

  /* ═══════════════════════════════════════════════════════
     UTILIDADES
     ═══════════════════════════════════════════════════════ */

  toast(msg) {
    let toast = document.getElementById('ajustesToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ajustesToast';
      toast.className = 'ajustes-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  }
};

window.Ajustes = Ajustes;
