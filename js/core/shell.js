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

  // Estado de cada pestaña
  estadosPestanas: {},

  // Historial por pestaña (para el botón ← →)
  historiales: {},

  // Cache de HTML por pestaña y por entrada del historial
  cacheHTML: {},

  // Marcadores abiertos por cada pestaña (persistencia de iframes)
  marcadoresAbiertos: {},

  // Orden LRU: para cada pestaña, lista de claves de más antiguo a más reciente
  ordenLRU: {},

  // Máximo de marcadores abiertos por pestaña
  maxMarcadoresPorPestana: 5,

  // Marcador activo por pestaña
  marcadorActivo: {},

  // Estado de cada pestaña (nivel + params)
  estadosPestanas: {},

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
        <div class="shell-contenidos" id="shellContenidos"></div>
        <div class="shell-statusbar" id="shellStatusbar"></div>
      </div>
    `;

    this.refs = {
      topbar: document.getElementById('shellTopbar'),
      tabbar: document.getElementById('shellTabbar'),
      contenidos: document.getElementById('shellContenidos'),
      statusbar: document.getElementById('shellStatusbar')
    };

    // Crear un contenedor por cada pestaña
    this.crearContenedoresPestanas();

    this.montado = true;
    document.body.classList.add('shell-activo');
    this.cargarEstados();
    this.cargarHistoriales();
    this.cargarEstados();
    this.cargarHistoriales();
    console.log('✅ Shell montado');

    this.renderTopbar();
    this.renderTabbar();
    this.renderStatusbar();

    // Registrar vista inicial en el historial
    setTimeout(() => {
      if (window.Navegacion) {
        Navegacion.registrar({ tipo: 'shell', nivel: 'escritorio' });
      }
    }, 100);
    this.setContenido(
      '<div style="padding:40px;text-align:center;color:#718096;font-family:Inter,sans-serif;">' +
      '<i class="fas fa-spinner fa-spin"></i> Cargando...</div>'
    );

    this.bindTema();

    if (window.Progreso) window.Progreso.init();
    if (window.Pomodoro) window.Pomodoro.init();
    if (window.Navegacion) window.Navegacion.init();
    if (window.Navegacion) window.Navegacion.init();
  },

  crearContenedoresPestanas() {
    if (!this.refs.contenidos) return;
    let html = '';
    this.pestanas.forEach(p => {
      html += '<div class="shell-contenido-pestana" data-pestana="' + p.id + '" style="visibility:hidden;pointer-events:none;position:absolute;inset:0;z-index:1;">';
      html += '  <div class="pestana-root" style="position:absolute;inset:0;overflow:auto;"></div>';
      html += '</div>';
    });
    this.refs.contenidos.innerHTML = html;
    this.mostrarPestana(this.pestanaActiva);
  },

  getContenedorPestana(id) {
    return document.querySelector('.shell-contenido-pestana[data-pestana="' + id + '"]');
  },

  getContenedorActual() {
    return this.getContenedorPestana(this.pestanaActiva);
  },

  mostrarPestana(id) {
    if (!this.refs.contenidos) return;

    this.refs.contenidos.querySelectorAll('.shell-contenido-pestana').forEach(c => {
      const activa = c.dataset.pestana === id;
      c.classList.toggle('shell-activa', activa);
      c.classList.toggle('shell-inactiva', !activa);

      // Desactivar interacción con iframes de pestañas inactivas
      c.querySelectorAll('iframe').forEach(f => {
        f.style.pointerEvents = activa ? 'auto' : 'none';
      });
    });

    // Limpiar iframes huérfanos del sistema viejo
    if (typeof this.limpiarIframesHuerfanos === 'function') {
      this.limpiarIframesHuerfanos();
    }
  },

  setContenido(html) {
    const contenedor = this.getContenedorActual();
    if (!contenedor) return;
    contenedor.innerHTML = html;
    contenedor.scrollTop = 0;
  },

  /**
   * Guarda el HTML actual del contenedor asociado a una entrada del historial
   */
  guardarHTMLActual() {
    const hist = this.historiales[this.pestanaActiva];
    if (!hist) return;
    const contenedor = this.getContenedorActual();
    if (!contenedor) return;

    const key = this.pestanaActiva + '::' + hist.indice;
    this.cacheHTML[key] = contenedor.innerHTML;
  },

  /**
   * Restaura el HTML cacheado de la entrada actual del historial
   */
  restaurarHTML() {
    const hist = this.historiales[this.pestanaActiva];
    if (!hist) return false;

    const key = this.pestanaActiva + '::' + hist.indice;
    const html = this.cacheHTML[key];

    if (html !== undefined) {
      const contenedor = this.getContenedorActual();
      if (contenedor) {
        contenedor.innerHTML = html;
      }
      return true;
    }
    return false;
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
        <span class="shell-version">v1.2</span>
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

      <div class="shell-nav-buttons">
        <button class="shell-nav-btn" id="shellBtnAtras" title="Atrás" disabled>
          <i class="fas fa-arrow-left"></i>
        </button>
        <button class="shell-nav-btn" id="shellBtnAdelante" title="Adelante" disabled>
          <i class="fas fa-arrow-right"></i>
        </button>
        <button class="shell-nav-btn shell-btn-punto" id="shellBtnPunto" title="Marcar punto" disabled>
          <i class="fas fa-thumbtack"></i>
        </button>
      </div>

      <button class="shell-btn-tema" id="shellBtnTema" title="Cambiar tema">
        <i class="fas ${iconoTema}"></i>
      </button>

      <button class="shell-btn-ajustes" id="shellBtnAjustes" title="Ajustes">
        <i class="fas fa-cog"></i>
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
    // ─── CASO 1: clicas la pestaña YA activa → volver a la raíz ───
    if (this.pestanaActiva === id) {
      const p = this.pestanas.find(x => x.id === id);
      
      // Cerrar marcadores abiertos de esta pestaña
      if (this.marcadoresAbiertos[id]) {
        Object.keys(this.marcadoresAbiertos[id]).forEach(clave => {
          this.cerrarMarcadorSilencioso(id, clave);
        });
        this.marcadoresAbiertos[id] = {};
        this.marcadorActivo[id] = null;
      }

      // Ir a la raíz del área
      if (p && p.tipo === 'area') {
        Router.navegar('asignaturas', { areaId: id });
      } else if (p && p.tipo === 'home') {
        Router.navegar('escritorio');
      }
      return;
    }

    // ─── CASO 2: cambias a otra pestaña ───
    
    // Guardar estado de la pestaña que abandonamos
    if (window.Router) {
      this.estadosPestanas[this.pestanaActiva] = {
        nivel: Router.nivel,
        params: { ...Router.params }
      };
      this.guardarEstados();
    }

    // Cambiar la pestaña activa
    this.pestanaActiva = id;
    localStorage.setItem('shell_pestana_activa', id);
    this.renderTabbar();
    this.mostrarPestana(id);

    // Actualizar botones de navegación
    if (window.Navegacion) {
      Navegacion.actualizarBotones();
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
     PERSISTENCIA DE ESTADOS POR PESTAÑA
     ═══════════════════════════════════════════════════════ */

  guardarEstados() {
    localStorage.setItem('shell_estados_pestanas', JSON.stringify(this.estadosPestanas));
  },

  cargarEstados() {
    try {
      const guardado = JSON.parse(localStorage.getItem('shell_estados_pestanas') || '{}');
      this.estadosPestanas = guardado;
    } catch (e) {
      this.estadosPestanas = {};
    }
  },

  /**
   * Llamar cuando el Router navega dentro de una pestaña activa
   * para actualizar el estado en memoria
   */
  registrarNavegacion(nivel, params) {
    this.estadosPestanas[this.pestanaActiva] = {
      nivel: nivel,
      params: { ...params }
    };
    this.guardarEstados();
  },

  /* ═══════════════════════════════════════════════════════
     MARCADORES (asignaturas del área activa)
     ═══════════════════════════════════════════════════════ */

  async renderBookmarks() {
    // Delegar en el módulo Bookmarks
      },

  /* ═══════════════════════════════════════════════════════
     BARRA DE DIRECCIÓN + STATUS
     ═══════════════════════════════════════════════════════ */

  renderAddressbar() {
    this.refs.addressbar.innerHTML = `
      <button title="Atrás" onclick="Shell.irAtras()" disabled><i class="fas fa-arrow-left"></i></button>
      <button title="Adelante" onclick="Shell.irAdelante()" disabled><i class="fas fa-arrow-right"></i></button>
      <button title="Recargar" onclick="Router.navegar(Router.nivel, Router.params)"><i class="fas fa-redo"></i></button>
      <button title="Inicio" onclick="Shell.activarPestana('escritorio')"><i class="fas fa-home"></i></button>
      <button class="btn-ir-punto" id="shellBtnIrPunto" title="Volver al punto donde lo dejaste" style="display:none;">
        <i class="fas fa-map-marker-alt"></i> <span id="shellIrPuntoPct">0%</span>
      </button>
      <div class="url">
        <i class="fas fa-lock icono"></i>
        <div class="ruta">
          <span class="nivel">estudio</span>
          <span class="sep">›</span>
          <span class="nivel" style="color:var(--text-primary);font-weight:500;">Escritorio</span>
        </div>
      </div>
      <button class="btn-add-nota" title="Nueva nota" onclick="Escritorio.añadirPostitDesdeBarra()">
        <i class="fas fa-plus"></i> Nota
      </button>
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

    // ─── Botón de tema ───
    const btn = document.getElementById('shellBtnTema');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = 'true';
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

    // ─── Botón de ajustes ───
    const btnAjustes = document.getElementById('shellBtnAjustes');
    if (btnAjustes && !btnAjustes.dataset.bound) {
      btnAjustes.dataset.bound = 'true';
      btnAjustes.addEventListener('click', () => {
        if (window.Ajustes && typeof Ajustes.abrir === 'function') {
          Ajustes.abrir();
        }
      });
    }
  }
};

Shell.guardarEstados = function() {
  localStorage.setItem('shell_estados_pestanas', JSON.stringify(this.estadosPestanas));
};

Shell.cargarEstados = function() {
  try {
    const guardado = JSON.parse(localStorage.getItem('shell_estados_pestanas') || '{}');
    this.estadosPestanas = guardado;
  } catch (e) {
    this.estadosPestanas = {};
  }
};

// Shell.registrarNavegacion eliminado (ahora lo hace Navegacion)







Shell.guardarHistoriales = function() {
  try {
    // No guardamos cacheHTML (muy pesado). Solo los historiales (nivel + params).
    localStorage.setItem('shell_historiales', JSON.stringify(this.historiales));
  } catch (e) {
    console.warn('No se pudo guardar el historial:', e);
  }
};

Shell.cargarHistoriales = function() {
  try {
    const guardado = JSON.parse(localStorage.getItem('shell_historiales') || '{}');
    this.historiales = guardado;
  } catch (e) {
    this.historiales = {};
  }
};

// ═══════════════════════════════════════════════════════
// GESTIÓN DE MARCADORES ABIERTOS (iframes persistentes)
// ═══════════════════════════════════════════════════════


/* ═══════════════════════════════════════════════════════
   LRU — Gestión de marcadores abiertos (máx 5)
   ═══════════════════════════════════════════════════════ */

Shell.tocarLRU = function(pestana, clave) {
  if (!this.ordenLRU) this.ordenLRU = {};
  if (!this.ordenLRU[pestana]) this.ordenLRU[pestana] = [];
  this.ordenLRU[pestana] = this.ordenLRU[pestana].filter(k => k !== clave);
  this.ordenLRU[pestana].push(clave);
};

Shell.aplicarLRU = function(pestana) {
  if (!this.ordenLRU) this.ordenLRU = {};
  const orden = this.ordenLRU[pestana] || [];
  const max = this.maxMarcadoresPorPestana || 5;

  while (orden.length > max) {
    const claveVieja = orden.shift();
    this.cerrarMarcadorSilencioso(pestana, claveVieja);
  }
};

Shell.cerrarMarcadorSilencioso = function(pestana, clave) {
  if (!this.marcadoresAbiertos || !this.marcadoresAbiertos[pestana]) return;
  if (!this.marcadoresAbiertos[pestana][clave]) return;

  const contenedor = this.getContenedorPestana(pestana);
  if (contenedor) {
    const div = contenedor.querySelector('.marcador-contenedor[data-clave="' + clave + '"]');
    if (div) div.remove();
  }

  delete this.marcadoresAbiertos[pestana][clave];

  if (this.marcadorActivo && this.marcadorActivo[pestana] === clave) {
    this.marcadorActivo[pestana] = null;
  }
};

Shell.abrirMarcador = function(areaId, asignaturaId) {
  const pestana = this.pestanaActiva;

  // Inicializar estructuras
  if (!this.marcadoresAbiertos[pestana]) this.marcadoresAbiertos[pestana] = {};
  if (!this.marcadorActivo[pestana]) this.marcadorActivo[pestana] = null;

  const clave = areaId + '::' + asignaturaId;

  // Si ya está abierto, solo activarlo
  if (this.marcadoresAbiertos[pestana][clave]) {
    this.tocarLRU(pestana, clave);
    this.activarMarcador(pestana, clave);
    return;
  }

  // Cerrar todos los marcadores anteriores de esta pestaña
  // (sistema simple: solo 1 iframe por pestaña)
  Object.keys(this.marcadoresAbiertos[pestana] || {}).forEach(claveVieja => {
    this.cerrarMarcadorSilencioso(pestana, claveVieja);
  });

  // Resetear el estado de la pestaña
  this.marcadoresAbiertos[pestana] = {};
  this.marcadorActivo[pestana] = null;

  const contenedor = this.getContenedorPestana(pestana);
  if (!contenedor) return;

  // Asegurar wrapper
  let wrapper = contenedor.querySelector('.marcadores-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'marcadores-wrapper';
    wrapper.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;overflow:auto;z-index:1;pointer-events:none;display:none;';
    contenedor.appendChild(wrapper);
  }

  // Crear el div del marcador
  const div = document.createElement('div');
  div.className = 'marcador-contenedor';
  div.dataset.clave = clave;
  div.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;visibility:hidden;pointer-events:none;z-index:1;overflow:auto;';

  var urlIframe = window.url('estudio/' + areaId + '/' + this.pathDeAsignatura(areaId, asignaturaId));
  urlIframe += '?t=' + Date.now();

  var iframeId = 'iframe-' + areaId + '-' + asignaturaId + '-' + Date.now();
  div.innerHTML = '<iframe id="' + iframeId + '" style="width:100%;height:100%;border:none;display:block;background:#fff;" ' +
                  'src="' + urlIframe + '"></iframe>';

  wrapper.appendChild(div);

  this.marcadoresAbiertos[pestana][clave] = true;
  this.tocarLRU(pestana, clave);

  // Restaurar posición y observar scroll
  setTimeout(function() {
    var iframeEl = document.getElementById(iframeId);
    if (iframeEl && window.Lectura) {
      var posGuardada = Lectura.obtener(iframeEl.src);
      var mostrarToast = !!(posGuardada && (posGuardada.scrollPx > 50 || posGuardada.scrollPct > 0.05));
      Lectura.restaurarYObservar(iframeEl, mostrarToast);
    }
    
    // Enganchar el iframe al sistema de navegación
    if (iframeEl && window.Navegacion) {
      Navegacion.engancharIframe(iframeEl);
    }

    // Interceptar enlaces "Volver a las asignaturas" dentro del iframe
    if (iframeEl) {
      iframeEl.addEventListener('load', function() {
        try {
          var doc = iframeEl.contentDocument;
          if (!doc) return;

          // Interceptar todos los enlaces
          doc.querySelectorAll('a').forEach(function(a) {
            var texto = a.textContent.toLowerCase();
            var href = a.getAttribute('href') || '';

            // Si es un "volver" o apunta al index
            if (texto.includes('volver') || href.includes('index.html') || href.includes('nivel=asignaturas')) {
              // Prevenir navegación
              a.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Volver a la lista de asignaturas del shell
                if (window.Shell && window.Router) {
                  Router.navegar('asignaturas', { areaId: areaId });
                  // Actualizar botones
                  if (window.Navegacion) Navegacion.actualizarBotones();
                }
              });
            }
          });
        } catch (e) {
          console.warn('No se pudieron interceptar enlaces del iframe:', e);
        }
      });
    }
  }, 50);

  this.activarMarcador(pestana, clave);
  this.guardarMarcadoresAbiertos();
};

Shell.pathDeAsignatura = function(areaId, asignaturaId) {
  // El path coincide con el id en la mayoría de casos, pero puede variar
  // Intentamos leer del cache de asignaturas si existe
  if (this._asignaturasCache && this._asignaturasCache[areaId]) {
    const a = this._asignaturasCache[areaId].find(x => x.id === asignaturaId);
    if (a && a.path) return a.path + 'asignatura.html';
  }
  // Fallback: asumimos path = id
  return asignaturaId + '/asignatura.html';
};

Shell.activarMarcador = function(pestana, clave) {
  const contenedor = this.getContenedorPestana(pestana);
  if (!contenedor) return;

  // Ocultar raíz COMPLETAMENTE con display:none
  const rootDiv = contenedor.querySelector('.pestana-root');
  if (rootDiv) {
    rootDiv.style.display = 'none';
  }

  // El wrapper SÍ permite clics (hay marcador activo)
  const wrapper = contenedor.querySelector('.marcadores-wrapper');
  if (wrapper) {
    wrapper.style.pointerEvents = 'auto';
    wrapper.style.display = 'block';     // ← RESTAURAR
  }

  // Mostrar solo el marcador activo, ocultar los demás
  contenedor.querySelectorAll('.marcador-contenedor').forEach(c => {
    const activo = c.dataset.clave === clave;
    c.style.visibility = activo ? 'visible' : 'hidden';
    c.style.pointerEvents = activo ? 'auto' : 'none';
    c.style.zIndex = activo ? '10' : '1';   // ⬅️ el activo siempre arriba
    const iframe = c.querySelector('iframe');
    if (iframe) {
      iframe.style.pointerEvents = activo ? 'auto' : 'none';
    }
  });

  // Marcar como activo
  this.marcadorActivo[pestana] = clave;

  // Tocar LRU (mover al final porque acaba de ser usado)
  this.tocarLRU(pestana, clave);

  // Resaltar marcador en la barra
  if (window.Bookmarks) Bookmarks.render();

  this.guardarMarcadoresAbiertos();

  // Restaurar posición de lectura (si hay alguna guardada)
  var contenedorLectura = this.getContenedorPestana(pestana);
  if (contenedorLectura) {
    var iframeLectura = contenedorLectura.querySelector('.marcador-contenedor[data-clave="' + clave + '"] iframe');
    if (iframeLectura && window.Lectura) {
      setTimeout(function() {
        var posGuardada = Lectura.obtener(iframeLectura.src);
        if (posGuardada && (posGuardada.scrollPx > 50 || posGuardada.scrollPct > 0.05)) {
          Lectura.restaurar(iframeLectura);
        }
      }, 100);
    }
  }
};

Shell.volverARaiz = function() {
  const pestana = this.pestanaActiva;
  const contenedor = this.getContenedorPestana(pestana);
  if (!contenedor) return;

  // 1. Ocultar todos los marcadores abiertos
  contenedor.querySelectorAll('.marcador-contenedor').forEach(c => {
    c.style.visibility = 'hidden';
    c.style.pointerEvents = 'none';
    c.style.zIndex = '1';
    const iframe = c.querySelector('iframe');
    if (iframe) {
      iframe.style.pointerEvents = 'none';
    }
  });

  // 2. CRUCIAL: ocultar el wrapper entero (si no, tapa las tarjetas)
  const wrapper = contenedor.querySelector('.marcadores-wrapper');
  if (wrapper) {
    wrapper.style.pointerEvents = 'none';
    wrapper.style.display = 'none';
  }

  // 3. Mostrar la raíz
  const rootDiv = contenedor.querySelector('.pestana-root');
  if (rootDiv) {
    rootDiv.style.display = 'block';
    rootDiv.style.visibility = 'visible';
    rootDiv.style.pointerEvents = 'auto';
  }

  // 4. Limpiar estado
  this.marcadorActivo[pestana] = null;
  if (window.Bookmarks) Bookmarks.render();
  this.guardarMarcadoresAbiertos();
};

Shell.cerrarMarcador = function(areaId, asignaturaId) {
  const pestana = this.pestanaActiva;
  if (!this.marcadoresAbiertos[pestana]) return;

  const clave = areaId + '::' + asignaturaId;
  const contenedor = this.getContenedorPestana(pestana);
  if (!contenedor) return;

  const div = contenedor.querySelector('.marcador-contenedor[data-clave="' + clave + '"]');
  if (div) div.remove();

  delete this.marcadoresAbiertos[pestana][clave];

  // Quitar del LRU también
  if (this.ordenLRU[pestana]) {
    this.ordenLRU[pestana] = this.ordenLRU[pestana].filter(k => k !== clave);
  }

  if (this.marcadorActivo[pestana] === clave) {
    this.volverARaiz();
  }

  this.guardarMarcadoresAbiertos();
  if (window.Bookmarks) Bookmarks.render();
};

Shell.guardarMarcadoresAbiertos = function() {
  try {
    // Solo guardamos las últimas claves según LRU (las que están vivas)
    // No guardamos los iframes cerrados por LRU
    localStorage.setItem('shell_marcadores_abiertos', JSON.stringify(this.ordenLRU));
    localStorage.setItem('shell_marcador_activo', JSON.stringify(this.marcadorActivo));
  } catch (e) {
    console.warn('No se pudo guardar marcadores:', e);
  }
};

Shell.restaurarMarcadoresAbiertos = function() {
  try {
    const guardado = JSON.parse(localStorage.getItem('shell_marcadores_abiertos') || '{}');
    const activos = JSON.parse(localStorage.getItem('shell_marcador_activo') || '{}');

    const pestana = this.pestanaActiva;

    // guardado ahora es { pestana: [clave1, clave2, ...] } (array del LRU)
    if (guardado[pestana] && Array.isArray(guardado[pestana])) {
      // Solo las últimas 5 (que son las vivas)
      const ultimas = guardado[pestana].slice(-this.maxMarcadoresPorPestana);

      ultimas.forEach((clave, i) => {
        const [areaId, asignaturaId] = clave.split('::');
        setTimeout(() => this.abrirMarcador(areaId, asignaturaId), 100 + i * 100);
      });
    }

    // Activar el que estaba activo (si sigue vivo)
    const activo = activos[pestana];
    if (activo && guardado[pestana] && guardado[pestana].includes(activo)) {
      setTimeout(() => this.activarMarcador(pestana, activo), 800);
    }
  } catch (e) {
    console.warn('No se pudo restaurar marcadores:', e);
  }
};

// ═══════════════════════════════════════════════════════
// SOBRESCRIBIR getContenedorPestana para incluir el wrapper de raíz
// ═══════════════════════════════════════════════════════

Shell.getContenedorPestana = function(id) {
  return document.querySelector('.shell-contenido-pestana[data-pestana="' + id + '"]');
};

Shell.getContenedorActual = function() {
  // Devuelve el contenedor de la pestaña activa
  // El contenido se escribe en un div "pestana-root" interno
  const pestana = this.getContenedorPestana(this.pestanaActiva);
  if (!pestana) return null;

  let rootDiv = pestana.querySelector('.pestana-root');
  if (!rootDiv) {
    rootDiv = document.createElement('div');
    rootDiv.className = 'pestana-root';
    rootDiv.style.cssText = 'position:absolute;inset:0;overflow:auto;';
    pestana.appendChild(rootDiv);
  }

  return rootDiv;
};

Shell.limpiarIframesHuerfanos = function() {
  // Elimina cualquier iframe que no esté dentro de un .marcador-contenedor
  // (los que quedaron del sistema viejo)
  document.querySelectorAll('iframe').forEach(f => {
    const estaEnMarcador = f.closest('.marcador-contenedor');
    if (!estaEnMarcador) {
      console.log('🗑️ Eliminando iframe huérfano:', f.src);
      f.remove();
    }
  });
};



window.Shell = Shell;

/* ─── Reforzar shell-activo ─── */
setInterval(() => {
  if (!document.body.classList.contains('shell-activo')) {
    document.body.classList.add('shell-activo');
  }
}, 500);


/* ═══════════════════════════════════════════════════════════════
   Actualizar botón 📍 Ir al punto cada 2 segundos
   ═══════════════════════════════════════════════════════════════ */
setInterval(function() {
  if (window.Shell && Shell.montado && typeof Shell.actualizarBotonIrPunto === 'function') {
    Shell.actualizarBotonIrPunto();
  }
}, 2000);

/* ============================================================
   NAVEGACION DESDE IFRAMES
   Solo procesa URLs que apunten al shell (/estudio/...)
   ============================================================ */
window.addEventListener('message', function(event) {
  if (!event.data || event.data.tipo !== 'navegacion-iframe') return;

  const url = event.data.url;
  console.log('📩 Navegacion desde iframe:', url);

  // Solo procesar URLs absolutas que apunten al shell
  if (typeof url !== 'string' || !url.startsWith('/estudio/')) {
    console.log('   → ignorada (no es del shell)');
    return;
  }

  try {
    const u = new URL(url, window.location.origin);
    const params = new URLSearchParams(u.search);
    const nivel = params.get('nivel');

    if (nivel === 'asignaturas') {
      const areaId = params.get('area');
      if (areaId && window.Router) {
        Router.navegar('asignaturas', { areaId: areaId });
        if (window.Navegacion) Navegacion.actualizarBotones();
      }
      return;
    }

    if (nivel) {
      const p = {};
      if (params.get('area')) p.areaId = params.get('area');
      if (params.get('curso')) p.cursoId = params.get('curso');
      if (params.get('semestre')) p.semestreId = params.get('semestre');
      if (params.get('asignatura')) p.asignaturaId = params.get('asignatura');
      if (window.Router) Router.navegar(nivel, p);
    }
  } catch (e) {
    console.warn('Error al procesar navegacion del iframe:', e);
  }
});
