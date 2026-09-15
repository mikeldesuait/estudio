/* ============================================================
   SHELL — Navegador persistente con pestañas + marcadores
   ============================================================ */

const Shell = {
  montado: false,
  refs: {},

  // Pestañas fijas: Escritorio + 5 áreas
  pestanas: [
    { id: 'escritorio',    nombre: 'Escritorio',    icono: '🏠', tipo: 'home' },
    { id: 'grado-derecho', nombre: 'Derecho',       icono: '⚖️', tipo: 'area' },
    { id: 'pnl',           nombre: 'PNL',           icono: '🧠', tipo: 'area' },
    { id: 'herramientas',  nombre: 'Herramientas',  icono: '🔧', tipo: 'area' },
    { id: 'networking',    nombre: 'Networking',    icono: '🌐', tipo: 'area' },
    { id: 'dieta',         nombre: 'Dieta',         icono: '🥗', tipo: 'area' }
  ],

  // Pestaña activa
  pestanaActiva: 'escritorio',

  // Caché de asignaturas por área
  asignaturasCache: {},

  /* ═══════════════════════════════════════════════════════
     MONTAJE
     ═══════════════════════════════════════════════════════ */

  montar() {
    if (this.montado) return;

    const main = document.getElementById('mainContent');
    if (!main) {
      console.error('❌ No existe #mainContent');
      return;
    }

    main.style.cssText = 'max-width:100%;padding:0;margin:0;height:100vh;overflow:hidden;';

    main.innerHTML = `
      <div class="shell">
        <div class="shell-topbar" id="shellTopbar"></div>
        <div class="shell-tabbar" id="shellTabbar"></div>
        <div class="shell-bookmarks" id="shellBookmarks"></div>
        <div class="shell-addressbar" id="shellAddressbar"></div>
        <div class="shell-contenido" id="shellContenido"></div>
        <div class="shell-statusbar" id="shellStatusbar"></div>
      </div>
    `;

    this.refs = {
      topbar: document.getElementById('shellTopbar'),
      tabbar: document.getElementById('shellTabbar'),
      bookmarks: document.getElementById('shellBookmarks'),
      addressbar: document.getElementById('shellAddressbar'),
      contenido: document.getElementById('shellContenido'),
      statusbar: document.getElementById('shellStatusbar')
    };

    this.montado = true;
    document.body.classList.add('shell-activo');
    console.log('✅ Shell montado');

    this.renderTopbar();
    this.renderTabbar();
    this.renderBookmarks();
    this.renderAddressbar();
    this.renderStatusbar();
    this.setContenido(
      '<div style="padding:40px;text-align:center;color:#718096;font-family:Inter,sans-serif;">' +
      '<i class="fas fa-spinner fa-spin"></i> Cargando...</div>'
    );

    this.bindTema();

    if (window.Progreso) window.Progreso.init();
    if (window.Pomodoro) window.Pomodoro.init();
  },

  setContenido(html) {
    if (!this.refs.contenido) return;
    this.refs.contenido.innerHTML = html;
    this.refs.contenido.scrollTop = 0;
  },

  setRuta(niveles) {
    const ruta = niveles.map((n, i) => {
      if (i === niveles.length - 1) {
        return '<span class="nivel" style="color:var(--text-primary);font-weight:500;">' + n + '</span>';
      }
      return '<span class="nivel">' + n + '</span>';
    }).join('<span class="sep">›</span>');
    const url = this.refs.addressbar && this.refs.addressbar.querySelector('.ruta');
    if (url) url.innerHTML = ruta;
  },

  setContexto(texto) {
    const el = this.refs.statusbar && this.refs.statusbar.querySelector('#shellContexto');
    if (el) el.textContent = texto;
  },

  irAtras() {
    // Si estamos en una asignatura (iframe), volver a la vista de asignaturas del área
    if (window.Router && Router.nivel === 'asignatura') {
      Router.navegar('asignaturas', { areaId: Router.params.areaId });
      return;
    }
    // Si estamos en temas, volver a asignaturas
    if (window.Router && Router.nivel === 'temas') {
      Router.navegar('asignaturas', { areaId: Router.params.areaId });
      return;
    }
    // Por defecto, ir al escritorio
    if (window.Shell && Shell.activarPestana) {
      Shell.activarPestana('escritorio');
    }
  },

  /* ═══════════════════════════════════════════════════════
     TOPBAR
     ═══════════════════════════════════════════════════════ */

  renderTopbar() {
    const temaGuardado = localStorage.getItem('theme') || 'light';
    const iconoTema = temaGuardado === 'dark' ? 'fa-sun' : 'fa-moon';

    this.refs.topbar.innerHTML = `
      <div class="shell-brand">
        <span class="logo">📚</span>
        <span>Estudio</span>
      </div>

      <div class="shell-pomodoro">
        <div class="mini-clock">
          <svg viewBox="0 0 100 100">
            <circle class="track" cx="50" cy="50" r="45"></circle>
            <circle class="prog" cx="50" cy="50" r="45"></circle>
          </svg>
        </div>
        <div class="info">
          <span class="estado">Pomodoro</span>
          <span class="tiempo" id="shellPomodoroTiempo">25:00</span>
        </div>
        <div class="controles">
          <button class="play" title="Iniciar"><i class="fas fa-play"></i></button>
          <button title="Reiniciar"><i class="fas fa-redo"></i></button>
          <button title="Configurar"><i class="fas fa-cog"></i></button>
        </div>
        <div class="info" style="padding-left:8px;border-left:1px solid rgba(255,255,255,0.15);">
          <span class="estado">Sesión</span>
          <span class="sesion">Sin sesión</span>
        </div>
      </div>

      <div class="shell-progreso">
        <div class="racha">🔥 <span class="num">0</span> días</div>
        <div class="separador"></div>
        <div class="mini-barras">
          <div class="mini-barra"><div class="fill" style="height:0%;background:#60a5fa"></div></div>
          <div class="mini-barra"><div class="fill" style="height:0%;background:#a78bfa"></div></div>
          <div class="mini-barra"><div class="fill" style="height:0%;background:#34d399"></div></div>
        </div>
        <div class="pct">0%</div>
      </div>

      <button class="shell-btn-tema" id="shellBtnTema" title="Cambiar tema">
        <i class="fas ${iconoTema}"></i>
      </button>
    `;
  },

  /* ═══════════════════════════════════════════════════════
     PESTAÑAS
     ═══════════════════════════════════════════════════════ */

  renderTabbar() {
    this.refs.tabbar.innerHTML = this.pestanas.map(p => `
      <div class="shell-tab ${p.id === this.pestanaActiva ? 'active' : ''}"
           data-id="${p.id}"
           onclick="Shell.activarPestana('${p.id}')">
        <span class="favicon">${p.icono}</span>
        <span>${p.nombre}</span>
      </div>
    `).join('');
  },

  async activarPestana(id) {
    if (this.pestanaActiva === id) return;

    this.pestanaActiva = id;
    this.renderTabbar();

    // Actualizar marcadores según la nueva pestaña
    if (window.Bookmarks && typeof Bookmarks.render === 'function') {
      Bookmarks.render();
    }

    // Navegar según el tipo
    const p = this.pestanas.find(x => x.id === id);
    if (!p) return;

    if (p.tipo === 'home') {
      Router.navegar('escritorio');
    } else if (p.tipo === 'area') {
      Router.navegar('asignaturas', { areaId: id });
    }
  },

  /* ═══════════════════════════════════════════════════════
     MARCADORES (asignaturas del área activa)
     ═══════════════════════════════════════════════════════ */

  async renderBookmarks() {
    // Delegar en el módulo Bookmarks
    if (window.Bookmarks && typeof Bookmarks.render === 'function') {
      Bookmarks.render();
    }
  },

  /* ═══════════════════════════════════════════════════════
     BARRA DE DIRECCIÓN + STATUS
     ═══════════════════════════════════════════════════════ */

  renderAddressbar() {
    this.refs.addressbar.innerHTML = `
      <button title="Atrás" onclick="Shell.irAtras()"><i class="fas fa-arrow-left"></i></button>
      <button title="Adelante" disabled><i class="fas fa-arrow-right"></i></button>
      <button title="Recargar" onclick="Router.navegar(Router.nivel, Router.params)"><i class="fas fa-redo"></i></button>
      <button title="Inicio" onclick="Shell.activarPestana('escritorio')"><i class="fas fa-home"></i></button>
      <div class="url">
        <i class="fas fa-lock icono"></i>
        <div class="ruta">
          <span class="nivel">estudio</span>
          <span class="sep">›</span>
          <span class="nivel" style="color:var(--text-primary);font-weight:500;">Escritorio</span>
        </div>
      </div>
      <button title="Marcar"><i class="fas fa-star"></i></button>
      <button title="Menú"><i class="fas fa-ellipsis-vertical"></i></button>
    `;
  },

  renderStatusbar() {
    this.refs.statusbar.innerHTML = `
      <div class="item"><i class="fas fa-clock"></i> Hoy: 0min</div>
      <div class="item"><i class="fas fa-check-circle" style="color:#10b981"></i> 0 tareas</div>
      <div class="item"><i class="fas fa-redo" style="color:#f59e0b"></i> 0 repasos</div>
      <div class="derecha">
        <div class="item"><i class="fas fa-layer-group"></i> <span id="shellContexto">Escritorio</span></div>
        <div class="item"><i class="fas fa-circle" style="color:#10b981;font-size:7px"></i> OK</div>
      </div>
    `;
  },

  /* ═══════════════════════════════════════════════════════
     TEMA
     ═══════════════════════════════════════════════════════ */

  bindTema() {
    const guardado = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', guardado);

    const btn = document.getElementById('shellBtnTema');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const html = document.documentElement;
      const actual = html.getAttribute('data-theme') || 'light';
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', nuevo);
      localStorage.setItem('theme', nuevo);

      const icono = btn.querySelector('i');
      if (icono) icono.className = nuevo === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
  }
};

window.Shell = Shell;

/* ─── Reforzar shell-activo ─── */
setInterval(() => {
  if (!document.body.classList.contains('shell-activo')) {
    document.body.classList.add('shell-activo');
  }
}, 500);
