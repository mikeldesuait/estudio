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
        <div class="shell-bookmarks" id="shellBookmarks"></div>
        <div class="shell-addressbar" id="shellAddressbar"></div>
        <div class="shell-contenidos" id="shellContenidos"></div>
        <div class="shell-statusbar" id="shellStatusbar"></div>
      </div>
    `;

    this.refs = {
      topbar: document.getElementById('shellTopbar'),
      tabbar: document.getElementById('shellTabbar'),
      bookmarks: document.getElementById('shellBookmarks'),
      addressbar: document.getElementById('shellAddressbar'),
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
    // ─── CASO ESPECIAL: clicas la pestaña YA activa → volver a la raíz ───
    if (this.pestanaActiva === id) {
      // Si estamos en un marcador o vista interna, volver a la raíz
      const p = this.pestanas.find(x => x.id === id);
      if (p && p.tipo === 'area') {
        // Volver a la raíz del área (lista de asignaturas)
        Router.navegar('asignaturas', { areaId: id });
      } else if (p && p.tipo === 'home') {
        // Escritorio → ya está en el escritorio, no hacer nada
      }
      return;
    }

    // 1. Guardar el estado de la pestaña que abandonamos
    if (window.Router) {
      this.estadosPestanas[this.pestanaActiva] = {
        nivel: Router.nivel,
        params: { ...Router.params }
      };
      this.guardarEstados();
    }

    // 2. Cambiar la pestaña activa
    this.pestanaActiva = id;
    localStorage.setItem('shell_pestana_activa', id);
    this.renderTabbar();

    // 3. Mostrar el contenedor de esta pestaña (SIN destruir contenido)
    this.mostrarPestana(id);

    // 4. Actualizar marcadores
    if (window.Bookmarks && typeof Bookmarks.render === 'function') {
      Bookmarks.render();
    }

    // 5. La pestaña SIEMPRE va a la raíz del área (o al escritorio)
    const p = this.pestanas.find(x => x.id === id);
    if (!p) return;

    if (p.tipo === 'home') {
      // Escritorio siempre va al escritorio
      Router.navegar('escritorio');
    } else if (p.tipo === 'area') {
      // Área → siempre a la raíz (lista de asignaturas)
      // PERO antes, resaltar el marcador activo si había uno
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
    if (window.Bookmarks && typeof Bookmarks.render === 'function') {
      Bookmarks.render();
    }
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

Shell.registrarNavegacion = function(nivel, params) {
  const pestana = this.pestanaActiva;

  // Inicializar historial de la pestaña si no existe
  if (!this.historiales[pestana]) {
    this.historiales[pestana] = { entradas: [], indice: -1 };
  }

  const hist = this.historiales[pestana];

  // Ignorar si es la misma vista que ya estamos viendo
  const actual = hist.entradas[hist.indice];
  if (actual && actual.nivel === nivel && JSON.stringify(actual.params) === JSON.stringify(params)) {
    return;
  }

  // Cortar el "futuro" si estamos en medio del historial (como un navegador)
  if (hist.indice < hist.entradas.length - 1) {
    hist.entradas = hist.entradas.slice(0, hist.indice + 1);
  }

  // Añadir nueva entrada
  hist.entradas.push({ nivel, params: { ...params } });
  hist.indice = hist.entradas.length - 1;

  // Guardar estado actual (compatibilidad)
  this.estadosPestanas[pestana] = { nivel, params: { ...params } };
  this.guardarEstados();
  this.guardarHistoriales();

  // Actualizar botones ← →
  this.actualizarBotonesNavegacion();
};

Shell.actualizarBotonesNavegacion = function() {
  const hist = this.historiales[this.pestanaActiva];
  const btnAtras = this.refs.addressbar && this.refs.addressbar.querySelector('button[title="Atrás"]');
  const btnAdelante = this.refs.addressbar && this.refs.addressbar.querySelector('button[title="Adelante"]');

  if (!hist) {
    if (btnAtras) btnAtras.disabled = true;
    if (btnAdelante) btnAdelante.disabled = true;
    return;
  }

  if (btnAtras) btnAtras.disabled = hist.indice <= 0;
  if (btnAdelante) btnAdelante.disabled = hist.indice >= hist.entradas.length - 1;
};

Shell.irAtras = function() {
  const hist = this.historiales[this.pestanaActiva];
  if (!hist || hist.indice <= 0) return;

  hist.indice--;
  const entrada = hist.entradas[hist.indice];

  // Cargar la entrada SIN añadirla al historial
  Router.navegarSinHistorial(entrada.nivel, entrada.params);

  this.actualizarBotonesNavegacion();
  this.estadosPestanas[this.pestanaActiva] = {
    nivel: entrada.nivel,
    params: { ...entrada.params }
  };
  this.guardarEstados();
};

Shell.irAdelante = function() {
  const hist = this.historiales[this.pestanaActiva];
  if (!hist || hist.indice >= hist.entradas.length - 1) return;

  hist.indice++;
  const entrada = hist.entradas[hist.indice];

  Router.navegarSinHistorial(entrada.nivel, entrada.params);

  this.actualizarBotonesNavegacion();
  this.estadosPestanas[this.pestanaActiva] = {
    nivel: entrada.nivel,
    params: { ...entrada.params }
  };
  this.guardarEstados();
};

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

  // Inicializar estructuras si no existen
  if (!this.marcadoresAbiertos[pestana]) this.marcadoresAbiertos[pestana] = {};
  if (!this.marcadorActivo[pestana]) this.marcadorActivo[pestana] = null;

  const clave = areaId + '::' + asignaturaId;

  // ¿Ya estaba abierto? → solo activarlo
  if (this.marcadoresAbiertos[pestana][clave]) {
    this.tocarLRU(pestana, clave);
  this.activarMarcador(pestana, clave);
  this.aplicarLRU(pestana);
    return;
  }

  // Crear contenedor nuevo para este marcador
  const contenedor = this.getContenedorPestana(pestana);
  if (!contenedor) return;

  // El contenedor de la pestaña tiene múltiples "sub-vistas": raíz + cada marcador abierto
  // Aseguramos que existe el wrapper
  let wrapper = contenedor.querySelector('.marcadores-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'marcadores-wrapper';
    wrapper.style.cssText = 'position:absolute;inset:0;';
    contenedor.appendChild(wrapper);
  }

  // Añadir un contenedor para este marcador (oculto)
  const div = document.createElement('div');
  div.className = 'marcador-contenedor';
  div.dataset.clave = clave;
  div.style.cssText = 'position:absolute;inset:0;visibility:hidden;';
  div.innerHTML = '<iframe style="width:100%;height:100%;border:none;display:block;" ' +
                  'src="' + window.url('estudio/' + areaId + '/' + this.pathDeAsignatura(areaId, asignaturaId)) + '"></iframe>';
  wrapper.appendChild(div);

  this.marcadoresAbiertos[pestana][clave] = true;
  this.activarMarcador(pestana, clave);

  // Guardar en localStorage para persistencia
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
