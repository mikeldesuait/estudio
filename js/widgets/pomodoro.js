/* ============================================================
   POMODORO — Timer global + Configuración
   ============================================================ */

const Pomodoro = {
  // Configuración (por defecto)
  duracionTrabajo: 25 * 60,
  duracionDescanso: 5 * 60,
  duracionDescansoLargo: 15 * 60,
  ciclosAntesDeDescansoLargo: 4,

  // Estado
  estado: 'idle',
  segundosRestantes: 25 * 60,
  cicloActual: 1,
  intervalId: null,
  sesionActual: null,

  /* ═══════════════════════════════════════════════════════
     INICIALIZACIÓN
     ═══════════════════════════════════════════════════════ */

  init() {
    this.cargarConfig();

    const btnPlay = document.querySelector('.shell-pomodoro .controles button.play');
    const btnReset = document.querySelectorAll('.shell-pomodoro .controles button')[1];
    const btnConfig = document.querySelectorAll('.shell-pomodoro .controles button')[2];

    if (btnPlay) btnPlay.addEventListener('click', () => this.toggle());
    if (btnReset) btnReset.addEventListener('click', () => this.reset());
    if (btnConfig) btnConfig.addEventListener('click', () => this.abrirConfig());

    // Crear el modal (oculto)
    this.crearModal();

    // Restaurar estado
    this.cargarEstado();
    this.render();
  },

  /* ═══════════════════════════════════════════════════════
     CONFIGURACIÓN
     ═══════════════════════════════════════════════════════ */

  cargarConfig() {
    try {
      const cfg = JSON.parse(localStorage.getItem('pomodoro_config') || 'null');
      if (!cfg) return;
      if (cfg.duracionTrabajo) this.duracionTrabajo = cfg.duracionTrabajo * 60;
      if (cfg.duracionDescanso) this.duracionDescanso = cfg.duracionDescanso * 60;
      if (cfg.duracionDescansoLargo) this.duracionDescansoLargo = cfg.duracionDescansoLargo * 60;
      if (cfg.ciclosAntesDeDescansoLargo) this.ciclosAntesDeDescansoLargo = cfg.ciclosAntesDeDescansoLargo;
    } catch (e) {
      console.warn('No se pudo cargar config del pomodoro:', e);
    }
  },

  guardarConfig() {
    localStorage.setItem('pomodoro_config', JSON.stringify({
      duracionTrabajo: Math.round(this.duracionTrabajo / 60),
      duracionDescanso: Math.round(this.duracionDescanso / 60),
      duracionDescansoLargo: Math.round(this.duracionDescansoLargo / 60),
      ciclosAntesDeDescansoLargo: this.ciclosAntesDeDescansoLargo
    }));
  },

  crearModal() {
    if (document.getElementById('pomodoroModal')) return;

    const modal = document.createElement('div');
    modal.id = 'pomodoroModal';
    modal.className = 'pomodoro-modal-overlay';
    modal.innerHTML = `
      <div class="pomodoro-modal">
        <div class="pomodoro-modal-header">
          <h3><i class="fas fa-cog"></i> Configuración del Pomodoro</h3>
          <button class="close" onclick="Pomodoro.cerrarConfig()">✕</button>
        </div>
        <div class="pomodoro-modal-body">
          <div class="pomodoro-presets">
            <div class="pomodoro-preset" data-preset="clasico">
              <span class="nombre">Clásico</span>
              <span class="tiempos">25 / 5 / 15</span>
            </div>
            <div class="pomodoro-preset" data-preset="corto">
              <span class="nombre">Corto</span>
              <span class="tiempos">15 / 3 / 10</span>
            </div>
            <div class="pomodoro-preset" data-preset="largo">
              <span class="nombre">Largo</span>
              <span class="tiempos">50 / 10 / 20</span>
            </div>
          </div>

          <label for="pmTrabajo">Duración del trabajo (minutos)</label>
          <input type="number" id="pmTrabajo" min="1" max="120" value="25">
          <div class="pomodoro-modal-hint">Tiempo de concentración por ciclo</div>

          <label for="pmDescanso">Descanso corto (minutos)</label>
          <input type="number" id="pmDescanso" min="1" max="30" value="5">
          <div class="pomodoro-modal-hint">Pausa entre ciclos</div>

          <label for="pmDescansoLargo">Descanso largo (minutos)</label>
          <input type="number" id="pmDescansoLargo" min="1" max="60" value="15">
          <div class="pomodoro-modal-hint">Pausa después de varios ciclos</div>

          <label for="pmCiclos">Ciclos antes del descanso largo</label>
          <input type="number" id="pmCiclos" min="2" max="10" value="4">
          <div class="pomodoro-modal-hint">Cuántos pomodoros seguidos antes de la pausa larga</div>
        </div>
        <div class="pomodoro-modal-acciones">
          <button class="btn-cancelar" onclick="Pomodoro.cerrarConfig()">Cancelar</button>
          <button class="btn-guardar" onclick="Pomodoro.aplicarConfig()">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Click en overlay → cerrar
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.cerrarConfig();
    });

    // Presets
    modal.querySelectorAll('.pomodoro-preset').forEach(p => {
      p.addEventListener('click', () => {
        const preset = p.dataset.preset;
        const valores = {
          clasico: { t: 25, d: 5, dl: 15 },
          corto: { t: 15, d: 3, dl: 10 },
          largo: { t: 50, d: 10, dl: 20 }
        }[preset];
        document.getElementById('pmTrabajo').value = valores.t;
        document.getElementById('pmDescanso').value = valores.d;
        document.getElementById('pmDescansoLargo').value = valores.dl;
      });
    });
  },

  abrirConfig() {
    const modal = document.getElementById('pomodoroModal');
    if (!modal) return;

    // Rellenar con los valores actuales
    document.getElementById('pmTrabajo').value = Math.round(this.duracionTrabajo / 60);
    document.getElementById('pmDescanso').value = Math.round(this.duracionDescanso / 60);
    document.getElementById('pmDescansoLargo').value = Math.round(this.duracionDescansoLargo / 60);
    document.getElementById('pmCiclos').value = this.ciclosAntesDeDescansoLargo;

    modal.classList.add('show');
  },

  cerrarConfig() {
    const modal = document.getElementById('pomodoroModal');
    if (modal) modal.classList.remove('show');
  },

  aplicarConfig() {
    const t = parseInt(document.getElementById('pmTrabajo').value) || 25;
    const d = parseInt(document.getElementById('pmDescanso').value) || 5;
    const dl = parseInt(document.getElementById('pmDescansoLargo').value) || 15;
    const c = parseInt(document.getElementById('pmCiclos').value) || 4;

    // Validaciones mínimas
    if (t < 1 || t > 120) return alert('El tiempo de trabajo debe estar entre 1 y 120 minutos');
    if (d < 1 || d > 30) return alert('El descanso corto debe estar entre 1 y 30 minutos');
    if (dl < 1 || dl > 60) return alert('El descanso largo debe estar entre 1 y 60 minutos');
    if (c < 2 || c > 10) return alert('Los ciclos deben estar entre 2 y 10');

    this.duracionTrabajo = t * 60;
    this.duracionDescanso = d * 60;
    this.duracionDescansoLargo = dl * 60;
    this.ciclosAntesDeDescansoLargo = c;

    this.guardarConfig();

    // Si estaba idle, actualizar el tiempo mostrado
    if (this.estado === 'idle') {
      this.segundosRestantes = this.duracionTrabajo;
    }

    this.render();
    this.cerrarConfig();
    this.toast('✅ Configuración guardada');
  },

  toast(msg) {
    let toast = document.getElementById('pmToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pmToast';
      toast.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:12px 24px;border-radius:30px;font-weight:600;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,0.3);z-index:10001;transition:opacity .3s;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  },

  /* ═══════════════════════════════════════════════════════
     CONTROL DEL TIMER
     ═══════════════════════════════════════════════════════ */

  toggle() {
    if (this.estado === 'trabajando' || this.estado === 'descanso') {
      this.pausar();
    } else {
      this.iniciar();
    }
  },

  iniciar() {
    if (this.intervalId) return;

    if (this.estado === 'idle' || this.estado === 'pausa') {
      this.estado = 'trabajando';
    }

    this.intervalId = setInterval(() => this.tick(), 1000);
    this.render();
    this.guardarEstado();
  },

  pausar() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.estado = 'pausa';
    this.render();
    this.guardarEstado();
  },

  reset() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.estado = 'idle';
    this.segundosRestantes = this.duracionTrabajo;
    this.cicloActual = 1;
    this.render();
    this.guardarEstado();
  },

  tick() {
    if (this.segundosRestantes > 0) {
      this.segundosRestantes--;
      this.render();
      this.guardarEstado();
    } else {
      this.alTerminar();
    }
  },

  alTerminar() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.estado === 'trabajando') {
      // Notificar
      this.notificar('¡Pomodoro completado!', 'Toca descansar 🎉');

      // Registrar minutos
      this.registrarSesion(Math.round(this.duracionTrabajo / 60));

      // ¿Ha completado todos los ciclos?
      // Si cicloActual era igual al total → este era el último
      if (this.cicloActual >= this.ciclosAntesDeDescansoLargo) {
        // ¡Racha +1!
        this.registrarDiaEstudiado();
        this.toast('🎉 ¡Día completado! Racha +1');

        // Resetear ciclos a 1
        this.cicloActual = 1;

        // Descanso largo
        this.estado = 'descanso';
        this.segundosRestantes = this.duracionDescansoLargo;
      } else {
        // Subir al siguiente ciclo
        this.cicloActual++;

        // Descanso normal
        this.estado = 'descanso';
        this.segundosRestantes = this.duracionDescanso;
      }

      // Arrancar el descanso automáticamente
      this.intervalId = setInterval(() => this.tick(), 1000);

    } else if (this.estado === 'descanso') {
      // Fin del descanso → volver a trabajar
      this.notificar('Descanso terminado', '¡Vamos a por otro pomodoro!');
      this.estado = 'idle';
      this.segundosRestantes = this.duracionTrabajo;
    }

    this.render();
    this.guardarEstado();
  },

  /**
   * Registra un día completo (suma 1 a la racha si no se ha hecho ya hoy)
   */
  registrarDiaEstudiado() {
    try {
      var log = JSON.parse(localStorage.getItem('estudio_log') || '{}');
      var hoy = new Date().toISOString().slice(0, 10);
      var registro = log[hoy] || { minutos: 0, sesiones: 0 };

      if (!registro.diaCompleto) {
        registro.diaCompleto = true;
      }

      log[hoy] = registro;
      localStorage.setItem('estudio_log', JSON.stringify(log));

      if (window.Progreso && typeof Progreso.refrescar === 'function') {
        Progreso.refrescar();
      }
    } catch (e) {
      console.warn('No se pudo registrar día:', e);
    }
  },

  registrarSesion(minutos) {
    const hoy = new Date().toISOString().slice(0, 10);
    const log = JSON.parse(localStorage.getItem('estudio_log') || '{}');
    if (!log[hoy]) log[hoy] = { minutos: 0, sesiones: 0 };
    log[hoy].minutos += minutos;
    log[hoy].sesiones += 1;
    localStorage.setItem('estudio_log', JSON.stringify(log));

    if (window.Progreso && typeof Progreso.refrescar === 'function') {
      Progreso.refrescar();
    }
  },

  notificar(titulo, cuerpo) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(titulo, { body: cuerpo });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(titulo, { body: cuerpo });
      });
    }
  },

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */

  render() {
    const tiempoEl = document.getElementById('shellPomodoroTiempo');
    const sesionEl = document.querySelector('.shell-pomodoro .sesion');
    const estadoEl = document.querySelector('.shell-pomodoro .estado');
    const progCircle = document.querySelector('.shell-pomodoro .prog');
    const btnPlay = document.querySelector('.shell-pomodoro .controles button.play');

    const min = Math.floor(this.segundosRestantes / 60);
    const seg = this.segundosRestantes % 60;
    const tiempo = `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;

    if (tiempoEl) tiempoEl.textContent = tiempo;

    if (progCircle) {
      const duracionActual = this.estado === 'descanso' ?
        (this.cicloActual === 1 ? this.duracionDescansoLargo : this.duracionDescanso) :
        this.duracionTrabajo;
      const progreso = 1 - (this.segundosRestantes / duracionActual);
      progCircle.style.strokeDashoffset = 283 * (1 - progreso);
    }

    if (estadoEl) {
      const estados = {
        'idle': 'Pomodoro',
        'trabajando': 'En curso',
        'pausa': 'Pausado',
        'descanso': 'Descanso'
      };
      estadoEl.textContent = estados[this.estado] || 'Pomodoro';
    }

    if (sesionEl) {
      if (this.sesionActual) {
        sesionEl.textContent = `${this.sesionActual.icono || ''} ${this.sesionActual.nombre} · ${this.cicloActual}/${this.ciclosAntesDeDescansoLargo}`;
      } else {
        sesionEl.textContent = `Ciclo ${this.cicloActual}/${this.ciclosAntesDeDescansoLargo}`;
      }
    }

    if (btnPlay) {
      const icono = btnPlay.querySelector('i');
      if (icono) {
        icono.className = (this.estado === 'trabajando' || this.estado === 'descanso')
          ? 'fas fa-pause' : 'fas fa-play';
      }
    }
  },

  /* ═══════════════════════════════════════════════════════
     PERSISTENCIA
     ═══════════════════════════════════════════════════════ */

  guardarEstado() {
    localStorage.setItem('pomodoro_estado', JSON.stringify({
      estado: this.estado,
      segundosRestantes: this.segundosRestantes,
      cicloActual: this.cicloActual,
      sesionActual: this.sesionActual,
      timestamp: Date.now()
    }));
  },

  cargarEstado() {
    try {
      const guardado = JSON.parse(localStorage.getItem('pomodoro_estado') || 'null');
      if (!guardado) return;

      const ahora = Date.now();
      if (ahora - guardado.timestamp > 60 * 60 * 1000) return;

      this.estado = guardado.estado || 'idle';
      this.segundosRestantes = guardado.segundosRestantes || this.duracionTrabajo;
      this.cicloActual = guardado.cicloActual || 1;
      this.sesionActual = guardado.sesionActual || null;

      if (this.estado === 'trabajando' || this.estado === 'descanso') {
        this.iniciar();
      }
    } catch (e) {
      console.warn('No se pudo restaurar el estado del pomodoro:', e);
    }
  },

  setSesion(sesion) {
    this.sesionActual = sesion;
    this.render();
    this.guardarEstado();
  }
};

window.Pomodoro = Pomodoro;
