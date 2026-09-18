/* ============================================================
   LECTURA — Persistencia de posición de scroll por asignatura
   ============================================================ */

const Lectura = {
  CLAVE: 'lectura_posiciones',
  INTERVALO_GUARDADO: 2000,  // ms (debounce)

  // Timers por iframe
  timers: {},

  /* ═══════════════════════════════════════════════════════
     CLAVE ÚNICA POR URL
     ═══════════════════════════════════════════════════════ */

  /**
   * Genera una clave única para identificar una URL de lectura.
   * Quita el dominio, mantiene solo la ruta relativa.
   */
  claveDesdeUrl(url) {
    try {
      const u = new URL(url, window.location.href);
      // Solo la ruta (sin query, sin hash)
      return u.pathname.replace(/^\//, '');
    } catch (e) {
      return String(url);
    }
  },

  /* ═══════════════════════════════════════════════════════
     GUARDAR
     ═══════════════════════════════════════════════════════ */

  guardar(url, scrollPx, scrollPct, windowHeight) {
    if (!url) return;

    const clave = this.claveDesdeUrl(url);
    if (!clave) return;

    let datos = {};
    try {
      datos = JSON.parse(localStorage.getItem(this.CLAVE) || '{}');
    } catch (e) {}

    datos[clave] = {
      scrollPx: Math.max(0, Math.round(scrollPx)),
      scrollPct: Math.max(0, Math.min(1, scrollPct)),
      windowHeight: windowHeight || window.innerHeight,
      ultimaVisita: new Date().toISOString()
    };

    // Limitar a las últimas 100 posiciones para no llenar localStorage
    const claves = Object.keys(datos);
    if (claves.length > 100) {
      // Ordenar por fecha y eliminar las más viejas
      claves.sort((a, b) => {
        const fa = datos[a].ultimaVisita || '';
        const fb = datos[b].ultimaVisita || '';
        return fb.localeCompare(fa);
      });
      claves.slice(100).forEach(k => delete datos[k]);
    }

    try {
      localStorage.setItem(this.CLAVE, JSON.stringify(datos));
    } catch (e) {
      console.warn('No se pudo guardar posición de lectura:', e);
    }
  },

  /* ═══════════════════════════════════════════════════════
     RECUPERAR
     ═══════════════════════════════════════════════════════ */

  obtener(url) {
    if (!url) return null;

    const clave = this.claveDesdeUrl(url);
    if (!clave) return null;

    try {
      const datos = JSON.parse(localStorage.getItem(this.CLAVE) || '{}');
      return datos[clave] || null;
    } catch (e) {
      return null;
    }
  },

  /* ═══════════════════════════════════════════════════════
     RESTAURAR
     ═══════════════════════════════════════════════════════ */

  /**
   * Restaura el scroll de un iframe a la posición guardada.
   * Devuelve true si se restauró algo.
   */
  restaurar(iframe) {
    if (!iframe || !iframe.contentWindow) return false;

    const pos = this.obtener(iframe.src);
    if (!pos) return false;

    // ¿Hay algo que restaurar?
    if (pos.scrollPx <= 0 && pos.scrollPct <= 0) return false;

    const win = iframe.contentWindow;

    try {
      // Calcular a qué píxel ir
      let destino = pos.scrollPx;

      // Si el tamaño de ventana cambió mucho, usar porcentaje
      const altoActual = win.innerHeight;
      if (Math.abs(altoActual - pos.windowHeight) > 100) {
        const scrollHeight = win.document.documentElement.scrollHeight;
        const alturaVisible = altoActual;
        destino = Math.round(pos.scrollPct * (scrollHeight - alturaVisible || 0));
      }

      // Hacer scroll
      win.scrollTo({
        top: destino,
        behavior: 'auto'  // sin animación, instantáneo
      });

      return true;
    } catch (e) {
      console.warn('No se pudo restaurar posición:', e);
      return false;
    }
  },

  /* ═══════════════════════════════════════════════════════
     OBSERVAR Y GUARDAR AUTOMÁTICAMENTE
     ═══════════════════════════════════════════════════════ */

  /**
   * Activa el guardado automático del scroll de un iframe.
   * Se llama cuando se crea/carga un iframe.
   */
  observar(iframe) {
    if (!iframe) return;

    const self = this;

    const iniciar = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) return;

        // Escuchar el scroll con debounce
        const manejarScroll = () => {
          if (self.timers[iframe.id]) {
            clearTimeout(self.timers[iframe.id]);
          }

          self.timers[iframe.id] = setTimeout(() => {
            const scrollPx = win.scrollY || doc.documentElement.scrollTop || 0;
            const scrollHeight = doc.documentElement.scrollHeight || 0;
            const clientHeight = win.innerHeight || 0;
            const maxScroll = Math.max(1, scrollHeight - clientHeight);
            const scrollPct = scrollPx / maxScroll;

            self.guardar(iframe.src, scrollPx, scrollPct, clientHeight);
          }, self.INTERVALO_GUARDADO);
        };

        win.addEventListener('scroll', manejarScroll, { passive: true });

        // Guardar también al salir de la página
        window.addEventListener('beforeunload', () => {
          if (self.timers[iframe.id]) {
            clearTimeout(self.timers[iframe.id]);
          }
          const scrollPx = win.scrollY || 0;
          const scrollHeight = doc.documentElement.scrollHeight || 0;
          const clientHeight = win.innerHeight || 0;
          const maxScroll = Math.max(1, scrollHeight - clientHeight);
          self.guardar(iframe.src, scrollPx, scrollPx / maxScroll, clientHeight);
        });

      } catch (e) {
        console.warn('No se pudo observar iframe:', e);
      }
    };

    // Si el iframe ya cargó, iniciar directamente
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      iniciar();
    } else {
      iframe.addEventListener('load', iniciar);
    }
  },

  /**
   * Restaura + observa un iframe en un solo paso.
   * Devuelve true si restauró alguna posición.
   */
  restaurarYObservar(iframe, mostrarToast = true) {
    if (!iframe) return false;

    const self = this;

    const alCargar = () => {
      // Esperar un poco a que se renderice
      setTimeout(() => {
        const restaurado = self.restaurar(iframe);
        if (restaurado && mostrarToast) {
          self.toast('📍 Retomando donde lo dejaste');
        }
      }, 150);

      // Empezar a observar
      self.observar(iframe);
    };

    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      alCargar();
    } else {
      iframe.addEventListener('load', alCargar, { once: true });
    }

    return true;
  },

  /* ═══════════════════════════════════════════════════════
     UTILIDADES
     ═══════════════════════════════════════════════════════ */

  toast(msg) {
    let toast = document.getElementById('lecturaToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lecturaToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #6366f1;
        color: white;
        padding: 10px 20px;
        border-radius: 24px;
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        font-size: 12px;
        box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
        z-index: 10001;
        opacity: 0;
        transition: opacity .3s, transform .3s;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2000);
  },

  /**
   * Limpia las posiciones guardadas (útil para Ajustes)
   */
  limpiar() {
    localStorage.removeItem(this.CLAVE);
    this.toast('🗑️ Posiciones borradas');
  },

  /**
   * Estadísticas de uso (para Ajustes)
   */
  info() {
    try {
      const datos = JSON.parse(localStorage.getItem(this.CLAVE) || '{}');
      return Object.keys(datos).length;
    } catch (e) {
      return 0;
    }
  }
};

window.Lectura = Lectura;
