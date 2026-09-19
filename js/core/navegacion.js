/* ============================================================
   NAVEGACION — Historial + Chincheta de punto + Enganche de iframes
   ============================================================ */

const Navegacion = {
  CLAVE_HISTORIAL: 'navegacion_historial',
  CLAVE_PUNTO: 'navegacion_puntos',

  historial: {},
  inicializado: false,

  /* ═══════════════════════════════════════════════════════
     INICIALIZACIÓN
     ═══════════════════════════════════════════════════════ */

  init() {
    if (this.inicializado) return;
    this.inicializado = true;

    this.cargarHistorial();

    var btnAtras = document.getElementById('shellBtnAtras');
    var btnAdelante = document.getElementById('shellBtnAdelante');
    var btnPunto = document.getElementById('shellBtnPunto');

    if (btnAtras) btnAtras.addEventListener('click', () => this.irAtras());
    if (btnAdelante) btnAdelante.addEventListener('click', () => this.irAdelante());
    if (btnPunto) btnPunto.addEventListener('click', () => this.togglePunto());

    this.actualizarBotones();
    this.actualizarBotonPunto();

    setInterval(() => {
      this.actualizarBotones();
      this.actualizarBotonPunto();
    }, 1000);

    console.log('✅ Navegación inicializada');
  },

  /* ═══════════════════════════════════════════════════════
     HISTORIAL
     ═══════════════════════════════════════════════════════ */

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
    var pestana = window.Shell ? Shell.pestanaActiva : 'default';
    if (!this.historial[pestana]) {
      this.historial[pestana] = { entradas: [], indice: -1 };
    }
    return this.historial[pestana];
  },

  registrar(entrada) {
    var hist = this.getHist();
    var actual = hist.entradas[hist.indice];

    if (actual && actual.tipo === entrada.tipo && actual.url === entrada.url) {
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
    var hist = this.getHist();
    if (hist.indice <= 0) return;
    hist.indice--;
    this.ejecutarEntrada(hist.entradas[hist.indice]);
    this.guardarHistorial();
    this.actualizarBotones();
  },

  irAdelante() {
    var hist = this.getHist();
    if (hist.indice >= hist.entradas.length - 1) return;
    hist.indice++;
    this.ejecutarEntrada(hist.entradas[hist.indice]);
    this.guardarHistorial();
    this.actualizarBotones();
  },

  ejecutarEntrada(entrada) {
    if (!entrada) return;

    if (entrada.tipo === 'iframe' && entrada.url) {
      var iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
      if (iframe) {
        try {
          iframe.contentWindow.location.href = entrada.url;
        } catch (e) {
          console.warn('No se pudo navegar el iframe:', e);
        }
      }
    } else if (entrada.tipo === 'shell' && entrada.nivel) {
      Router.navegar(entrada.nivel, entrada.params || {});
    }
  },

  actualizarBotones() {
    var hist = this.getHist();
    var btnAtras = document.getElementById('shellBtnAtras');
    var btnAdelante = document.getElementById('shellBtnAdelante');
    if (btnAtras) btnAtras.disabled = hist.indice <= 0;
    if (btnAdelante) btnAdelante.disabled = hist.indice >= hist.entradas.length - 1;
  },

  /* ═══════════════════════════════════════════════════════
     ENGANCHAR IFRAME AL HISTORIAL
     ═══════════════════════════════════════════════════════ */

  engancharIframe(iframe) {
    if (!iframe) return;

    var self = this;

    var registrarCarga = function() {
      try {
        var url = iframe.contentWindow.location.href;
        self.registrar({
          tipo: 'iframe',
          url: url,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('No se pudo registrar navegacion del iframe:', e);
      }
    };

    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      registrarCarga();
    } else {
      iframe.addEventListener('load', registrarCarga, { once: true });
    }
  },

  /* ═══════════════════════════════════════════════════════
     CHINCHETA DE PUNTO
     ═══════════════════════════════════════════════════════ */

  getUrlActual() {
    var iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return null;
    try {
      var u = new URL(iframe.contentWindow.location.href, window.location.href);
      return u.pathname;
    } catch (e) {
      return null;
    }
  },

  getClaveAsignatura() {
    var url = this.getUrlActual();
    if (!url) return null;
    var match = url.match(/^(.*?\/)[^\/]+\.html$/);
    return match ? match[1] : url;
  },

  getTituloActual() {
    var iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return 'esta pagina';
    try {
      var titulo = iframe.contentDocument.title;
      if (titulo && titulo.trim()) return titulo.trim();
    } catch (e) {}

    var url = this.getUrlActual();
    if (url) {
      var partes = url.split('/').filter(function(p) { return p; });
      var ultima = partes[partes.length - 1];
      return decodeURIComponent(ultima).replace('.html', '').replace(/-/g, ' ');
    }
    return 'esta pagina';
  },

  getPuntosAsignatura() {
    var claveAsig = this.getClaveAsignatura();
    if (!claveAsig) return {};

    try {
      var todos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      var resultado = {};
      Object.keys(todos).forEach(function(url) {
        if (url.indexOf(claveAsig) === 0) {
          resultado[url] = todos[url];
        }
      });
      return resultado;
    } catch (e) {
      return {};
    }
  },

  getPuntoActual() {
    var url = this.getUrlActual();
    if (!url) return null;
    try {
      var puntos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      return puntos[url] || null;
    } catch (e) {
      return null;
    }
  },

  guardarPunto() {
    var iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    var url = this.getUrlActual();
    if (!iframe || !url) return false;

    try {
      var win = iframe.contentWindow;
      var scrollPx = win.scrollY;
      var scrollHeight = win.document.documentElement.scrollHeight;
      var innerHeight = win.innerHeight;

      var puntos = {};
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

  eliminarPuntoActual() {
    var url = this.getUrlActual();
    if (!url) return false;
    try {
      var puntos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      delete puntos[url];
      localStorage.setItem(this.CLAVE_PUNTO, JSON.stringify(puntos));
      return true;
    } catch (e) {
      return false;
    }
  },

  irAlPuntoPorUrl: function(urlPunto) {
    var iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return false;

    try {
      var puntos = JSON.parse(localStorage.getItem(this.CLAVE_PUNTO) || '{}');
      var punto = puntos[urlPunto];
      if (!punto) return false;

      var urlActual = this.getUrlActual();
      if (urlActual !== urlPunto) {
        iframe.contentWindow.location.href = urlPunto;
        setTimeout(function() {
          try {
            iframe.contentWindow.scrollTo({ top: punto.scrollPx, behavior: 'smooth' });
          } catch (e) {}
        }, 500);
      } else {
        iframe.contentWindow.scrollTo({ top: punto.scrollPx, behavior: 'smooth' });
      }
      return true;
    } catch (e) {
      console.warn('No se pudo ir al punto:', e);
      return false;
    }
  },

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
      btn.title = 'Punto guardado aqui - Clic para gestionar';
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

  togglePunto() {
    var iframe = document.querySelector('.shell-contenido-pestana.shell-activa iframe');
    if (!iframe) return;

    var puntoActual = this.getPuntoActual();
    var puntosAsignatura = this.getPuntosAsignatura();
    var totalPuntos = Object.keys(puntosAsignatura).length;
    var tituloActual = this.getTituloActual();
    var self = this;

    // Caso 1: hay punto en la página actual
    if (puntoActual) {
      this.abrirModalPunto({
        titulo: '📌 Punto guardado',
        mensaje: 'Estas en la pagina donde dejaste el punto:<br><br><strong>📖 ' + this.escapar(tituloActual) + '</strong>',
        acciones: [
          { texto: '📍 Ir al punto', clase: 'primary', accion: function() {
            self.irAlPuntoPorUrl(self.getUrlActual());
            self.cerrarModalPunto();
            self.toast('📍 Volviendo al punto guardado');
          }},
          { texto: '📌 Actualizar punto', clase: 'secondary', accion: function() {
            self.guardarPunto();
            self.cerrarModalPunto();
            self.toast('📌 Punto actualizado');
            self.actualizarBotonPunto();
          }},
          { texto: '🗑️ Eliminar punto', clase: 'danger', accion: function() {
            self.eliminarPuntoActual();
            self.cerrarModalPunto();
            self.toast('🗑️ Punto eliminado');
            self.actualizarBotonPunto();
          }}
        ]
      });
      return;
    }

    // Caso 2: hay puntos en otros temas
    if (totalPuntos > 0) {
      var listaHtml = '<div style="max-height:200px;overflow-y:auto;margin-top:10px;">';
      Object.keys(puntosAsignatura).forEach(function(url) {
        var p = puntosAsignatura[url];
        listaHtml += '<div class="punto-item" data-url="' + self.escapar(url) + '">';
        listaHtml += '<strong>📖 ' + self.escapar(p.titulo || url) + '</strong><br>';
        listaHtml += '<span style="font-size:11px;color:#718096;">' + Math.round((p.scrollPct || 0) * 100) + '% de la pagina</span>';
        listaHtml += '</div>';
      });
      listaHtml += '</div>';

      this.abrirModalPunto({
        titulo: '📌 Puntos guardados',
        mensaje: 'En esta pagina no tienes punto, pero si en otros temas:<br>' + listaHtml + '<br>¿Que quieres hacer?',
        acciones: [
          { texto: '📌 Marcar aqui nuevo', clase: 'primary', accion: function() {
            self.guardarPunto();
            self.cerrarModalPunto();
            self.toast('📌 Punto guardado aqui');
            self.actualizarBotonPunto();
          }},
          { texto: 'Cerrar', clase: 'secondary', accion: function() { self.cerrarModalPunto(); }}
        ],
        onItemClick: function(url) {
          self.irAlPuntoPorUrl(url);
          self.cerrarModalPunto();
          self.toast('📍 Yendo al punto guardado');
        }
      });
      return;
    }

    // Caso 3: no hay ningún punto
    this.abrirModalPunto({
      titulo: '📌 Sin puntos guardados',
      mensaje: 'No tienes ningun punto guardado en esta asignatura.<br><br>¿Quieres marcar este punto para volver luego?',
      acciones: [
        { texto: '📌 Marcar aqui', clase: 'primary', accion: function() {
          self.guardarPunto();
          self.cerrarModalPunto();
          self.toast('📌 Punto guardado');
          self.actualizarBotonPunto();
        }},
        { texto: 'Cancelar', clase: 'secondary', accion: function() { self.cerrarModalPunto(); }}
      ]
    });
  },

  abrirModalPunto: function(opciones) {
    this.cerrarModalPunto();

    var modal = document.createElement('div');
    modal.id = 'navPuntoModal';
    modal.className = 'nav-punto-overlay';

    var accionesHtml = '';
    (opciones.acciones || []).forEach(function(acc, i) {
      accionesHtml += '<button class="nav-punto-accion ' + (acc.clase || '') + '" data-accion="' + i + '">' + acc.texto + '</button>';
    });

    modal.innerHTML = '<div class="nav-punto-modal">'
      + '<div class="nav-punto-header">'
      +   '<h3>' + opciones.titulo + '</h3>'
      +   '<button class="nav-punto-close" onclick="Navegacion.cerrarModalPunto()">✕</button>'
      + '</div>'
      + '<div class="nav-punto-body">' + opciones.mensaje + '</div>'
      + '<div class="nav-punto-footer">' + accionesHtml + '</div>'
      + '</div>';

    document.body.appendChild(modal);

    var self = this;
    setTimeout(function() { modal.classList.add('show'); }, 10);

    modal.addEventListener('click', function(e) {
      if (e.target === modal) self.cerrarModalPunto();
    });

    modal.querySelectorAll('.nav-punto-accion').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.accion);
        var accion = opciones.acciones[idx];
        if (accion && accion.accion) accion.accion();
      });
    });

    if (opciones.onItemClick) {
      modal.querySelectorAll('.punto-item').forEach(function(item) {
        item.addEventListener('click', function() {
          opciones.onItemClick(item.dataset.url);
        });
      });
    }
  },

  cerrarModalPunto: function() {
    var modal = document.getElementById('navPuntoModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(function() { modal.remove(); }, 200);
    }
  },

  escapar: function(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  toast: function(msg) {
    var toast = document.getElementById('navToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'navToast';
      toast.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%) translateY(20px);background:#6366f1;color:white;padding:10px 20px;border-radius:24px;font-family:Inter,sans-serif;font-weight:600;font-size:12px;box-shadow:0 8px 30px rgba(99,102,241,0.4);z-index:10001;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2000);
  }
};

window.Navegacion = Navegacion;
