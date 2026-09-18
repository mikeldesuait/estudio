/* ============================================================
   NAVEGACION — Historial unificado + Chincheta de punto
   ============================================================ */

const Navegacion = {
  CLAVE_HISTORIAL: 'navegacion_historial',
  CLAVE_PUNTO: 'navegacion_puntos',

  historial: {},
  inicializado: false,

  init() {
    if (this.inicializado) {
      return;
    }
    this.inicializado = true;

    this.cargarHistorial();

    const btnAtras = document.getElementById('shellBtnAtras');
    const btnAdelante = document.getElementById('shellBtnAdelante');
    const btnPunto = document.getElementById('shellBtnPunto');

    if (btnAtras) {
      btnAtras.addEventListener('click', () => this.irAtras());
    }
    if (btnAdelante) {
      btnAdelante.addEventListener('click', () => this.irAdelante());
    }
    if (btnPunto) {
      btnPunto.addEventListener('click', () => this.togglePunto());
    }

    this.actualizarBotones();
    this.actualizarBotonPunto();

    setInterval(() => {
      this.actualizarBotones();
      this.actualizarBotonPunto();
    }, 1000);

    console.log('✅ Navegación inicializada');
  },

  /* ═══ HISTORIAL ═══ */

  cargarHistorial() {
    try {
      this.historial = JSON.parse(localStorage.getItem(this.CLAVE_HISTORIAL) || '{}');
    } catch (e) {
      this.historial = {};
    }
  },

  guardarHistorial() {
    try {
      localStorage.setItem(this.CLAVE_HISTORIAL, JSON.stringify(this.historial));
    } catch (e) {}
  },

  getHist() {
    const pestana = window.Shell ? Shell.pestanaActiva : 'default';
    if (!this.historial[pestana]) {
      this.historial[pestana] = { entradas: [], indice: -1 };
    }
    return this.historial[pestana];
  },

  registrar(entrada) {
    const hist = this.getHist();

    const actual = hist.entradas[hist.indice];
    if (actual && actual.tipo === entrada.tipo && actual.ref === entrada.ref && actual.url === entrada.url) {
      return;
    }

    if (hist.indice < hist.entradas.length - 1) {
      hist.entradas = hist.entradas.slice(0, hist.indice + 1);
    }

    hist.entradas.push(entrada);
    hist.indice = hist.entradas.length - 1;

    if (hist.entradas.length > 30) {
      hist.entradas = hist.entradas.slice(-30);
      hist.indice = hist.entradas.length - 1;
    }

    this.guardarHistorial();
    this.actualizarBotones();
  },

  irAtras() {
    const hist = this.getHist();
    if (hist.indice <= 0) return;

    hist.indice--;
    const entrada = hist.entradas[hist.indice];

    this.ejecutarEntrada(entrada);
    this.guardarHistorial();
    this.actualizarBotones();
  },

  irAdelante() {
    const hist = this.getHist();
    if (hist.indice >= hist.entradas.length - 1) return;

    hist.indice++;
    const entrada = hist.entradas[hist.indice];

    this.ejecutarEntrada(entrada);
    this.guardarHistorial();
    this.actualizarBotones();
  },

  ejecutarEntrada(entrada) {
    if (!entrada) return;

    if (entrada.tipo === 'iframe' && entrada.url) {
      const iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
      if (iframe) {
        try {
          iframe.contentWindow.location.href = entrada.url;
          if (entrada.scroll) {
            setTimeout(() => {
              try {
                iframe.contentWindow.scrollTo(0, entrada.scroll);
              } catch (e) {}
            }, 200);
          }
        } catch (e) {
          console.warn('No se pudo navegar el iframe:', e);
        }
      }
    } else if (entrada.tipo === 'shell' && entrada.nivel) {
      Router.navegar(entrada.nivel, entrada.params || {});
    }
  },

  actualizarBotones() {
    const hist = this.getHist();
    const btnAtras = document.getElementById('shellBtnAtras');
    const btnAdelante = document.getElementById('shellBtnAdelante');

    if (btnAtras) btnAtras.disabled = hist.indice <= 0;
    if (btnAdelante) btnAdelante.disabled = hist.indice >= hist.entradas.length - 1;
  },

    /* ═══ CHINCHETA DE PUNTO ═══ */

  /**
   * Obtiene la URL actual del iframe (sin cache-buster)
   */
  getUrlActual() {
    const iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return null;
    try {
      const u = new URL(iframe.contentWindow.location.href, window.location.href);
      return u.pathname;
    } catch (e) {
      return null;
    }
  },

  /**
   * Obtiene la asignatura actual (ruta base)
   */
  getClaveAsignatura() {
    const url = this.getUrlActual();
    if (!url) return null;
    // Detectar la parte de asignatura (hasta el asignatura.html)
    // ej: /estudio/estudio/grado-derecho/historia-derecho-espanol/asignatura.html → /estudio/estudio/grado-derecho/historia-derecho-espanol/
    const match = url.match(/^(.*?\/)[^\/]+\.html$/);
    return match ? match[1] : url;
  },

  /**
   * Obtiene el título del tema actual (del <title> del iframe)
   */
  getTituloActual() {
    const iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return 'esta página';
    try {
      const titulo = iframe.contentDocument.title;
      if (titulo && titulo.trim()) return titulo.trim();
    } catch (e) {}

    // Fallback: nombre del archivo
    const url = this.getUrlActual();
    if (url) {
      const partes = url.split('/').filter(p => p);
      const ultima = partes[partes.length - 1];
      return decodeURIComponent(ultima).replace('.html', '').replace(/-/g, ' ');
    }
    return 'esta página';
  },

  /**
   * Obtiene todos los puntos guardados para la asignatura actual
   */
  getPuntosAsignatura() {
    const claveAsig = this.getClaveAsignatura();
    if (!claveAsig) return {};

    try {
      const todos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      const resultado = {};
      Object.entries(todos).forEach(([url, punto]) => {
        if (url.startsWith(claveAsig)) {
          resultado[url] = punto;
        }
      });
      return resultado;
    } catch (e) {
      return {};
    }
  },

  /**
   * Obtiene el punto de la URL actual
   */
  getPuntoActual() {
    const url = this.getUrlActual();
    if (!url) return null;

    try {
      const puntos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      return puntos[url] || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Guarda un punto para la URL actual
   */
  guardarPunto() {
    const iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    const url = this.getUrlActual();
    if (!iframe || !url) return false;

    try {
      const win = iframe.contentWindow;
      const scrollPx = win.scrollY;
      const scrollHeight = win.document.documentElement.scrollHeight;
      const innerHeight = win.innerHeight;

      let puntos = {};
      try {
        puntos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      } catch (e) {}

      puntos[url] = {
        scrollPx: scrollPx,
        scrollPct: scrollPx / Math.max(1, scrollHeight - innerHeight),
        titulo: this.getTituloActual(),
        timestamp: Date.now()
      };

      localStorage.setItem(this.CLAVE_PUNTO, JSON.stringify(puntos));
      return true;
    } catch (e) {
      console.warn('No se pudo guardar el punto:', e);
      return false;
    }
  },

  /**
   * Elimina el punto de la URL actual
   */
  eliminarPuntoActual() {
    const url = this.getUrlActual();
    if (!url) return false;

    try {
      const puntos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      delete puntos[url];
      localStorage.setItem(this.CLAVE_PUNTO, JSON.stringify(puntos));
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Navega a un punto específico (por URL)
   */
  irAlPuntoPorUrl(urlPunto) {
    const iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return false;

    try {
      const puntos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      const punto = puntos[urlPunto];
      if (!punto) return false;

      // Si no estamos en esa URL, navegar primero
      const urlActual = this.getUrlActual();
      if (urlActual !== urlPunto) {
        // Navegar el iframe a esa URL
        iframe.contentWindow.location.href = urlPunto;
        // Después del load, hacer scroll
        setTimeout(() => {
          try {
            iframe.contentWindow.scrollTo({ top: punto.scrollPx, behavior: 'smooth' });
          } catch (e) {}
        }, 500);
      } else {
        // Ya estamos, solo scroll
        iframe.contentWindow.scrollTo({ top: punto.scrollPx, behavior: 'smooth' });
      }
      return true;
    } catch (e) {
      console.warn('No se pudo ir al punto:', e);
      return false;
    }
  },

  /**
   * Actualiza el tooltip y estado visual del botón 📌
   */
  actualizarBotonPunto() {
    var btn = document.getElementById('shellBtnPunto');
    var iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');

    if (!btn) return;

    if (!iframe) {
      btn.disabled = true;
      btn.classList.remove('tiene-punto');
      btn.classList.remove('tiene-punto-otro');
      btn.title = 'Marcar punto (abre una asignatura primero)';
      return;
    }

    btn.disabled = false;

    var puntoActual = this.getPuntoActual();
    var puntosAsignatura = this.getPuntosAsignatura();
    var totalPuntos = Object.keys(puntosAsignatura).length;

    if (puntoActual) {
      btn.classList.add('tiene-punto');
      btn.classList.remove('tiene-punto-otro');
      btn.title = 'Punto guardado en esta pagina - Clic para gestionar';
    } else if (totalPuntos > 0) {
      btn.classList.remove('tiene-punto');
      btn.classList.add('tiene-punto-otro');
      btn.title = 'Tienes ' + totalPuntos + ' punto(s) en otros temas - Clic para ver';
    } else {
      btn.classList.remove('tiene-punto');
      btn.classList.remove('tiene-punto-otro');
      btn.title = 'Marcar este punto para volver luego';
    }
  },

  /**
   * Clic en la chincheta: muestra un modal con opciones
   */
  togglePunto() {
    const iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return;

    const puntoActual = this.getPuntoActual();
    const puntosAsignatura = this.getPuntosAsignatura();
    const totalPuntos = Object.keys(puntosAsignatura).length;
    const tituloActual = this.getTituloActual();

    // Caso 1: Hay punto en la página actual
    if (puntoActual) {
      this.abrirModalPunto({
        titulo: '📌 Punto guardado',
        mensaje: 'Estás en la página donde dejaste el punto:<br><br><strong>📖 ' + this.escapar(tituloActual) + '</strong>',
        acciones: [
          { texto: '📍 Ir al punto', clase: 'primary', accion: () => {
            this.irAlPuntoPorUrl(this.getUrlActual());
            this.cerrarModalPunto();
            this.toast('📍 Volviendo al punto guardado');
          }},
          { texto: '📌 Actualizar punto', clase: 'secondary', accion: () => {
            this.guardarPunto();
            this.cerrarModalPunto();
            this.toast('📌 Punto actualizado');
            this.actualizarBotonPunto();
          }},
          { texto: '🗑️ Eliminar punto', clase: 'danger', accion: () => {
            this.eliminarPuntoActual();
            this.cerrarModalPunto();
            this.toast('🗑️ Punto eliminado');
            this.actualizarBotonPunto();
          }}
        ]
      });
      return;
    }

    // Caso 2: No hay punto aquí pero sí en otros temas
    if (totalPuntos > 0) {
      // Lista de puntos
      let listaHtml = '<div style="max-height:200px;overflow-y:auto;margin-top:10px;">';
      Object.entries(puntosAsignatura).forEach(([url, p]) => {
        listaHtml += '<div class="punto-item" data-url="' + this.escapar(url) + '">';
        listaHtml += '<strong>📖 ' + this.escapar(p.titulo || url) + '</strong><br>';
        listaHtml += '<span style="font-size:11px;color:#718096;">' + Math.round((p.scrollPct || 0) * 100) + '% de la página</span>';
        listaHtml += '</div>';
      });
      listaHtml += '</div>';

      this.abrirModalPunto({
        titulo: '📌 Puntos guardados',
        mensaje: 'En esta página no tienes punto, pero sí en otros temas:<br>' + listaHtml + '<br>¿Qué quieres hacer?',
        acciones: [
          { texto: '📌 Marcar aquí nuevo', clase: 'primary', accion: () => {
            this.guardarPunto();
            this.cerrarModalPunto();
            this.toast('📌 Punto guardado aquí');
            this.actualizarBotonPunto();
          }},
          { texto: 'Cerrar', clase: 'secondary', accion: () => this.cerrarModalPunto() }
        ],
        onItemClick: (url) => {
          this.irAlPuntoPorUrl(url);
          this.cerrarModalPunto();
          this.toast('📍 Yendo al punto guardado');
        }
      });
      return;
    }

    // Caso 3: No hay ningún punto
    this.abrirModalPunto({
      titulo: '📌 Sin puntos guardados',
      mensaje: 'No tienes ningún punto guardado en esta asignatura.<br><br>¿Quieres marcar este punto para volver luego?',
      acciones: [
        { texto: '📌 Marcar aquí', clase: 'primary', accion: () => {
          this.guardarPunto();
          this.cerrarModalPunto();
          this.toast('📌 Punto guardado');
          this.actualizarBotonPunto();
        }},
        { texto: 'Cancelar', clase: 'secondary', accion: () => this.cerrarModalPunto() }
      ]
    });
  },

  /**
   * Abre un modal genérico para la chincheta
   */
  abrirModalPunto(opciones) {
    // Cerrar modal existente
    this.cerrarModalPunto();

    const modal = document.createElement('div');
    modal.id = 'navPuntoModal';
    modal.className = 'nav-punto-overlay';

    let accionesHtml = '';
    (opciones.acciones || []).forEach((acc, i) => {
      accionesHtml += '<button class="nav-punto-accion ' + (acc.clase || '') + '" data-accion="' + i + '">' + acc.texto + '</button>';
    });

    modal.innerHTML = `
      <div class="nav-punto-modal">
        <div class="nav-punto-header">
          <h3>${opciones.titulo}</h3>
          <button class="nav-punto-close" onclick="Navegacion.cerrarModalPunto()">✕</button>
        </div>
        <div class="nav-punto-body">
          ${opciones.mensaje}
        </div>
        <div class="nav-punto-footer">
          ${accionesHtml}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    setTimeout(() => modal.classList.add('show'), 10);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.cerrarModalPunto();
    });

    // Acciones
    modal.querySelectorAll('.nav-punto-accion').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.accion);
        const accion = opciones.acciones[idx];
        if (accion && accion.accion) accion.accion();
      });
    });

    // Items de la lista (si hay)
    if (opciones.onItemClick) {
      modal.querySelectorAll('.punto-item').forEach(item => {
        item.addEventListener('click', () => {
          opciones.onItemClick(item.dataset.url);
        });
      });
    }
  },

  cerrarModalPunto() {
    const modal = document.getElementById('navPuntoModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 200);
    }
  },

  escapar(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
};

window.Navegacion = Navegacion;
