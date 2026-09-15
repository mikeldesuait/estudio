/* ============================================================
   ESCRITORIO — Corcho con post-its + Agenda del día
   ============================================================ */

const Escritorio = {
  // Colores disponibles para post-its
  colores: ['amarillo', 'azul', 'verde', 'rosa', 'naranja'],

  // Iconos de categoría
  categorias: {
    amarillo: { icono: '📌', nombre: 'Recordatorio' },
    azul:     { icono: '💡', nombre: 'Idea' },
    verde:    { icono: '✅', nombre: 'Hecho' },
    rosa:     { icono: '❓', nombre: 'Duda' },
    naranja:  { icono: '🎯', nombre: 'Objetivo' }
  },

  /* ═══════════════════════════════════════════════════════
     RENDER PRINCIPAL
     ═══════════════════════════════════════════════════════ */

  render(main) {
    const postits = this.cargarPostits();
    const agenda = this.calcularAgenda();

    main.innerHTML = `
      <div class="escritorio-corcho">
        <div class="escritorio-contenido">
          <div class="zona-notas" id="zonaNotas">
            ${postits.map(p => this.renderPostit(p)).join('')}
            <div class="postit add" onclick="Escritorio.añadirPostit()">
              <i class="fas fa-plus"></i>
              <span>Nueva nota</span>
            </div>
          </div>
          <div class="agenda" id="agendaDia">
            ${this.renderAgenda(agenda)}
          </div>
        </div>
      </div>
    `;
  },

  /* ═══════════════════════════════════════════════════════
     POST-ITS
     ═══════════════════════════════════════════════════════ */

  cargarPostits() {
    try {
      const raw = localStorage.getItem('escritorio_notas');
      if (!raw) {
        // Post-its iniciales de ejemplo si no hay ninguno
        return [
          { id: 'n1', color: 'amarillo', texto: 'Bienvenido a tu escritorio 🎉\n\nHaz clic en cualquier post-it para editarlo.', fecha: 'hoy' },
          { id: 'n2', color: 'azul',     texto: 'Añade nuevas notas con el botón "+ Nueva nota"', fecha: 'hoy' }
        ];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Error leyendo post-its:', e);
      return [];
    }
  },

  guardarPostits(postits) {
    localStorage.setItem('escritorio_notas', JSON.stringify(postits));
  },

  renderPostit(p) {
    const cat = this.categorias[p.color] || this.categorias.amarillo;
    return `
      <div class="postit ${p.color}" data-id="${p.id}">
        <button class="del" onclick="Escritorio.eliminarPostit('${p.id}', event)">✕</button>
        <div class="titulo">${cat.icono} ${cat.nombre}</div>
        <div class="texto" contenteditable="true"
             onblur="Escritorio.guardarTexto('${p.id}', this.textContent)"
             onkeydown="if(event.key==='Escape')this.blur()">${this.escapar(p.texto)}</div>
        <div class="pie"><span>${p.fecha || ''}</span></div>
      </div>
    `;
  },

  añadirPostit() {
    const postits = this.cargarPostits();
    const colorAleatorio = this.colores[Math.floor(Math.random() * this.colores.length)];
    const nuevo = {
      id: 'n' + Date.now(),
      color: colorAleatorio,
      texto: '',
      fecha: 'hoy'
    };
    postits.push(nuevo);
    this.guardarPostits(postits);

    // Re-render rápido
    const contenedor = document.getElementById('zonaNotas');
    const botonAdd = contenedor.querySelector('.postit.add');
    botonAdd.insertAdjacentHTML('beforebegin', this.renderPostit(nuevo));

    // Focus en el nuevo
    const nuevoEl = contenedor.querySelector(`[data-id="${nuevo.id}"] .texto`);
    if (nuevoEl) nuevoEl.focus();
  },

  guardarTexto(id, texto) {
    const postits = this.cargarPostits();
    const p = postits.find(x => x.id === id);
    if (p) {
      p.texto = texto.trim();
      this.guardarPostits(postits);
    }
  },

  eliminarPostit(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('¿Borrar esta nota?')) return;

    let postits = this.cargarPostits();
    postits = postits.filter(x => x.id !== id);
    this.guardarPostits(postits);

    const el = document.querySelector(`.postit[data-id="${id}"]`);
    if (el) el.remove();
  },

  escapar(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  /* ═══════════════════════════════════════════════════════
     AGENDA DEL DÍA
     ═══════════════════════════════════════════════════════ */

  calcularAgenda() {
    const hoy = new Date();
    const diaSemana = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][hoy.getDay()];
    const keyHoy = this.keyFecha(hoy);

    // ─── Horario del día (de horario_semanal si existe) ───
    let horarioHoy = [];
    try {
      const hs = JSON.parse(localStorage.getItem('horario_semanal') || '[]');
      horarioHoy = hs.filter(h => h.dia === diaSemana).sort((a,b) => (a.horaInicio||'').localeCompare(b.horaInicio||''));
    } catch (e) {}

    // ─── Eventos del día (de eventos_calendario) ───
    let eventosHoy = [];
    try {
      const ev = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
      eventosHoy = ev.filter(e => e.fecha === keyHoy).sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
    } catch (e) {}

    // ─── Minutos de estudio hoy (de estudio_log) ───
    let minutosHoy = 0;
    let sesionesHoy = 0;
    try {
      const log = JSON.parse(localStorage.getItem('estudio_log') || '{}');
      if (log[keyHoy]) {
        minutosHoy = log[keyHoy].minutos || 0;
        sesionesHoy = log[keyHoy].sesiones || 0;
      }
    } catch (e) {}

    return { diaSemana, horarioHoy, eventosHoy, minutosHoy, sesionesHoy, fecha: hoy };
  },

  renderAgenda(ag) {
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const diasSemanaLargo = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

    const fechaTexto = `${diasSemanaLargo[ag.fecha.getDay()]} · ${ag.fecha.getDate()} de ${meses[ag.fecha.getMonth()]}`;

    const minutosTxt = this.formatearMinutos(ag.minutosHoy);

    return `
      <div class="agenda-header">
        <div class="fecha">${fechaTexto}</div>
        <div class="dia">📅 Agenda de hoy</div>
        <div class="resumen">
          <i class="fas fa-clock"></i> ${minutosTxt} · ${ag.sesionesHoy} pomodoros
        </div>
      </div>

      <div class="agenda-body">

        <div class="agenda-seccion">
          <div class="titulo">
            <i class="fas fa-clock" style="color:#6366f1"></i> Horario
            <span class="badge">${ag.horarioHoy.length}</span>
          </div>
          ${ag.horarioHoy.length === 0
            ? '<div class="agenda-vacio">Sin sesiones programadas</div>'
            : ag.horarioHoy.map(h => this.renderHorarioItem(h)).join('')
          }
        </div>

        <div class="agenda-seccion">
          <div class="titulo">
            <i class="fas fa-calendar-day" style="color:#ef4444"></i> Eventos
            <span class="badge">${ag.eventosHoy.length}</span>
          </div>
          ${ag.eventosHoy.length === 0
            ? '<div class="agenda-vacio">Sin eventos hoy</div>'
            : ag.eventosHoy.map(e => this.renderEventoItem(e)).join('')
          }
        </div>

      </div>

      <div class="agenda-footer">
        <span>Hoy: ${minutosTxt}</span>
        <button onclick="Escritorio.abrirAgendaRapida()">
          <i class="fas fa-plus"></i> Añadir
        </button>
      </div>
    `;
  },

  renderHorarioItem(h) {
    const icono = h.icono || '📚';
    const nombre = h.titulo || h.nombre || 'Sesión';
    const notas = h.notas ? `<small>${this.escapar(h.notas)}</small>` : '';
    const hora = h.horaInicio ? `<span class="hora">${h.horaInicio}</span>` : '';

    return `
      <div class="agenda-item horario">
        ${hora}
        <span class="icono">${icono}</span>
        <span class="texto">${this.escapar(nombre)}${notas}</span>
        <button class="btn-play" onclick="Escritorio.iniciarPomodoro('${this.escapar(nombre)}','${icono}')">
          <i class="fas fa-play"></i>
        </button>
      </div>
    `;
  },

  renderEventoItem(e) {
    const hora = e.hora ? `<span class="hora">${e.hora}</span>` : '';
    const desc = e.desc ? `<small>${this.escapar(e.desc)}</small>` : '';
    return `
      <div class="agenda-item evento">
        ${hora}
        <span class="icono">📝</span>
        <span class="texto">${this.escapar(e.titulo)}${desc}</span>
      </div>
    `;
  },

  /* ═══════════════════════════════════════════════════════
     UTILIDADES
     ═══════════════════════════════════════════════════════ */

  keyFecha(fecha) {
    return fecha.getFullYear() + '-' +
           String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
           String(fecha.getDate()).padStart(2, '0');
  },

  formatearMinutos(min) {
    if (min === 0) return '0min';
    if (min < 60) return min + 'min';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? h + 'h' : h + 'h ' + m + 'min';
  },

  /* ═══════════════════════════════════════════════════════
     ACCIONES
     ═══════════════════════════════════════════════════════ */

  iniciarPomodoro(nombre, icono) {
    if (window.Pomodoro) {
      Pomodoro.setSesion({ nombre, icono });
      Pomodoro.iniciar();
      Pomodoro.toast(`⏱️ Pomodoro iniciado: ${nombre}`);
    }
  },

  abrirAgendaRapida() {
    // Abre un prompt simple para añadir un evento de hoy rápido
    const titulo = prompt('Título del evento de hoy:');
    if (!titulo) return;
    const hora = prompt('Hora (opcional, formato HH:MM):', '') || '';

    const hoy = this.keyFecha(new Date());
    let eventos = [];
    try {
      eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    } catch (e) {}

    eventos.push({
      id: 'ev-' + Date.now(),
      fecha: hoy,
      hora,
      titulo,
      desc: ''
    });

    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));

    // Re-render agenda
    const agenda = document.getElementById('agendaDia');
    if (agenda) agenda.innerHTML = this.renderAgenda(this.calcularAgenda());
  }
};

window.Escritorio = Escritorio;
