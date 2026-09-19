/* ============================================================
   PROGRESO — Racha + % por área + media global
   ============================================================ */

const Progreso = {
  // Áreas que vamos a monitorizar (con sus colores)
  areas: [
    { id: 'grado-derecho', nombre: 'Derecho',     icono: '⚖️', color: '#3b82f6' },
    { id: 'pnl',           nombre: 'PNL',         icono: '🧠', color: '#9b59b6' },
    { id: 'herramientas',  nombre: 'Herramientas',icono: '🔧', color: '#8b5cf6' },
    { id: 'networking',    nombre: 'Networking',  icono: '🌐', color: '#00b4d8' },
    { id: 'dieta',         nombre: 'Dieta',       icono: '🥗', color: '#e67e22' }
  ],

  // Caché de asignaturas por área
  cacheAsignaturas: {},

  // Estado calculado
  racha: 0,
  minutosHoy: 0,
  porcentajes: {},
  mediaGlobal: 0,

  /* ═══════════════════════════════════════════════════════
     INICIALIZACIÓN
     ═══════════════════════════════════════════════════════ */

  async init() {
    await this.cargarTodasAsignaturas();
    this.refrescar();
  },

  /**
   * Carga los asignaturas.json de cada área (una sola vez)
   */
  async cargarTodasAsignaturas() {
    const promesas = this.areas.map(async (area) => {
      try {
        const r = await fetch(`estudio/${area.id}/asignaturas.json`);
        const data = await r.json();
        this.cacheAsignaturas[area.id] = data.asignaturas || [];
      } catch (e) {
        console.warn(`No se pudo cargar asignaturas de ${area.id}:`, e);
        this.cacheAsignaturas[area.id] = [];
      }
    });
    await Promise.all(promesas);
  },

  /**
   * Recalcula todo y repinta
   */
  refrescar() {
    this.calcularRacha();
    this.calcularMinutosHoy();
    this.calcularPorcentajes();
    this.calcularMedia();
    this.render();
  },

  /* ═══════════════════════════════════════════════════════
     CÁLCULOS
     ═══════════════════════════════════════════════════════ */

  /**
   * Racha de días consecutivos con minutos > 0
   */
  calcularRacha() {
    var log = {};
    try {
      log = JSON.parse(localStorage.getItem('estudio_log') || '{}');
    } catch (e) {}

    var fecha = new Date();
    var keyHoy = this.keyFecha(fecha);

    // ¿Hoy está marcado como completo?
    var hoyCompleto = log[keyHoy] && log[keyHoy].diaCompleto === true;

    // Si hoy no está completo, empezar desde ayer
    if (!hoyCompleto) {
      fecha.setDate(fecha.getDate() - 1);
    }

    var racha = 0;
    var seguridad = 0;

    while (seguridad < 3650) {
      var key = this.keyFecha(fecha);
      var registro = log[key];

      // Un día cuenta si tiene diaCompleto = true
      if (registro && registro.diaCompleto === true) {
        racha++;
        fecha.setDate(fecha.getDate() - 1);
        seguridad++;
      } else {
        break;
      }
    }

    this.racha = racha;
  },

  /**
   * Minutos estudiados hoy
   */
  calcularMinutosHoy() {
    const log = JSON.parse(localStorage.getItem('estudio_log') || '{}');
    const hoy = this.keyFecha(new Date());
    this.minutosHoy = (log[hoy] && log[hoy].minutos) || 0;
  },

  /**
   * Porcentaje de aprobadas por área (solo matriculadas)
   */
  calcularPorcentajes() {
    this.porcentajes = {};

    this.areas.forEach(area => {
      const asignaturas = this.cacheAsignaturas[area.id] || [];
      const matriculadas = asignaturas.filter(a => a.matriculada === true);

      if (matriculadas.length === 0) {
        this.porcentajes[area.id] = 0;
        return;
      }

      let aprobadas = 0;
      matriculadas.forEach(a => {
        const key = `aprobada_${area.id}_${a.id}`;
        if (localStorage.getItem(key) === 'true') {
          aprobadas++;
        }
      });

      this.porcentajes[area.id] = Math.round((aprobadas / matriculadas.length) * 100);
    });
  },

  /**
   * Media global de aprobadas (solo áreas con matriculadas)
   */
  calcularMedia() {
    const valores = Object.values(this.porcentajes);
    if (valores.length === 0) {
      this.mediaGlobal = 0;
      return;
    }
    const suma = valores.reduce((a, b) => a + b, 0);
    this.mediaGlobal = Math.round(suma / valores.length);
  },

  /**
   * Formatea una fecha como YYYY-MM-DD
   */
  keyFecha(fecha) {
    return fecha.getFullYear() + '-' +
           String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
           String(fecha.getDate()).padStart(2, '0');
  },

  /**
   * Formatea minutos como "2h 30min" o "45min"
   */
  formatearMinutos(min) {
    if (min < 60) return min + 'min';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? h + 'h' : h + 'h ' + m + 'min';
  },

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */

  render() {
    this.renderRacha();
    this.renderMiniBarras();
    this.renderMediaGlobal();
    this.renderMinutosStatusbar();
  },

  renderRacha() {
    const rachaEl = document.querySelector('.shell-progreso .racha .num');
    if (rachaEl) rachaEl.textContent = this.racha;
  },

  renderMiniBarras() {
    const contenedor = document.querySelector('.shell-progreso .mini-barras');
    if (!contenedor) return;

    contenedor.innerHTML = this.areas.map(area => {
      const pct = this.porcentajes[area.id] || 0;
      return `
        <div class="mini-barra" title="${area.nombre}: ${pct}%">
          <div class="fill" style="height:${pct}%;background:${area.color}"></div>
        </div>
      `;
    }).join('');
  },

  renderMediaGlobal() {
    const pctEl = document.querySelector('.shell-progreso .pct');
    if (pctEl) pctEl.textContent = this.mediaGlobal + '%';
  },

  renderMinutosStatusbar() {
    // Buscar el primer item de la statusbar (Hoy: Xmin)
    const items = document.querySelectorAll('.shell-statusbar .item');
    if (items.length > 0) {
      const primero = items[0];
      const icono = primero.querySelector('i');
      const minutosTxt = this.formatearMinutos(this.minutosHoy);
      primero.innerHTML = `<i class="fas fa-clock"></i> Hoy: ${minutosTxt}`;
    }
  }
};

window.Progreso = Progreso;
