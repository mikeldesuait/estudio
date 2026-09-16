/* ============================================================
   ESCRITORIO — Corcho con post-its + Agenda movible
   Sistema de menú flotante (⋮) para editar/eliminar
   ============================================================ */

const Escritorio = {
  colores: ['amarillo', 'azul', 'verde', 'rosa', 'naranja'],

  categorias: {
    amarillo: { icono: '📌', nombre: 'Recordatorio' },
    azul:     { icono: '💡', nombre: 'Idea' },
    verde:    { icono: '✅', nombre: 'Hecho' },
    rosa:     { icono: '❓', nombre: 'Duda' },
    naranja:  { icono: '🎯', nombre: 'Objetivo' }
  },

  // Estado de elementos en modo edición
  editando: new Set(),

  // Vista actual de la agenda
  agendaVista: 'dia',   // 'dia' | 'semana' | 'mes'

  // Fecha "ancla" para navegar en semana/mes
  agendaFecha: new Date(),

  // Fecha que se muestra en la vista Día (por si navegas desde semana/mes)
  agendaVistaDia: null,

  /* ═══════════════════════════════════════════════════════
     RENDER PRINCIPAL
     ═══════════════════════════════════════════════════════ */

  render(main) {
    // Cargar vista guardada
    try {
      const vistaGuardada = localStorage.getItem('agenda_vista');
      if (vistaGuardada === 'dia' || vistaGuardada === 'semana' || vistaGuardada === 'mes') {
        this.agendaVista = vistaGuardada;
      }
    } catch (e) {}

    const postits = this.cargarPostits();
    const agenda = this.calcularAgenda();
    const posAgenda = this.cargarPosAgenda();

    main.innerHTML = `
      <div class="escritorio-corcho" id="escritorioCorcho">
        <div class="zona-notas" id="zonaNotas">
          ${postits.map(p => this.renderPostit(p)).join('')}
        </div>

        <div class="elemento-escritorio agenda elemento-con-menu" id="agendaDia"
             data-id="agenda"
             style="left:${posAgenda.x}px; top:${posAgenda.y}px; width:${posAgenda.w}px; height:${posAgenda.h}px;">
          ${this.renderMenuFlotante('agenda')}
          ${this.renderAgenda(agenda)}
        </div>
      </div>
    `;

    // Restaurar tamaño/posición de post-its
    postits.forEach(p => {
      const el = document.querySelector(`.postit[data-id="${p.id}"]`);
      if (el && p.pos) {
        el.style.position = 'absolute';
        el.style.left = p.pos.x + 'px';
        el.style.top = p.pos.y + 'px';
        el.style.width = p.pos.w + 'px';
        el.style.height = p.pos.h + 'px';
        el.style.transform = 'none';
      }
    });
  },

  /* ═══════════════════════════════════════════════════════
     MENÚ FLOTANTE
     ═══════════════════════════════════════════════════════ */

  renderMenuFlotante(id) {
    return `
      <button class="menu-flotante-btn" onclick="Escritorio.toggleMenu(event, '${id}')" title="Opciones">
        <i class="fas fa-ellipsis-vertical"></i>
      </button>
      <div class="menu-flotante" id="menu-${id}">
        <button class="btn-editar" onclick="Escritorio.toggleEditar(event, '${id}')">
          <i class="fas fa-arrows-alt"></i> <span>Editar</span>
        </button>
        <div class="separador"></div>
        <button class="eliminar" onclick="Escritorio.eliminarElemento(event, '${id}')">
          <i class="fas fa-trash"></i> <span>Eliminar</span>
        </button>
      </div>
    `;
  },

  toggleMenu(event, id) {
    event.stopPropagation();
    event.preventDefault();

    // Cerrar otros menús abiertos
    document.querySelectorAll('.menu-flotante.show').forEach(m => {
      if (m.id !== 'menu-' + id) m.classList.remove('show');
    });

    const menu = document.getElementById('menu-' + id);
    if (menu) {
      menu.classList.toggle('show');
    }
  },

  cerrarTodosLosMenus() {
    document.querySelectorAll('.menu-flotante.show').forEach(m => m.classList.remove('show'));
  },

  toggleEditar(event, id) {
    event.stopPropagation();

    const elemento = id === 'agenda'
      ? document.getElementById('agendaDia')
      : document.querySelector(`.postit[data-id="${id}"]`);

    if (!elemento) return;

    const estaEditando = elemento.classList.contains('editando');

    if (estaEditando) {
      // Desactivar edición
      elemento.classList.remove('editando');
      elemento.classList.remove('elemento-escritorio');
      this.editando.delete(id);
      interact(elemento).unset();
      this.guardarPosicionElemento(id, elemento);

      // Cambiar el botón del menú
      const btn = document.querySelector(`#menu-${id} .btn-editar span`);
      if (btn) btn.textContent = 'Editar';
      const icono = document.querySelector(`#menu-${id} .btn-editar i`);
      if (icono) icono.className = 'fas fa-arrows-alt';

      this.cerrarTodosLosMenus();
    } else {
      // Activar edición
      elemento.classList.add('editando');
      if (id === 'agenda') {
        elemento.classList.add('elemento-escritorio');
      } else {
        // Post-its: posicionamiento absoluto
        elemento.classList.add('elemento-escritorio');
        if (!elemento.style.position || elemento.style.position !== 'absolute') {
          // Convertir a posición absoluta
          const rect = elemento.getBoundingClientRect();
          const corcho = document.getElementById('escritorioCorcho');
          const corchoRect = corcho.getBoundingClientRect();
          elemento.style.position = 'absolute';
          elemento.style.left = (rect.left - corchoRect.left) + 'px';
          elemento.style.top = (rect.top - corchoRect.top) + 'px';
          elemento.style.width = rect.width + 'px';
          elemento.style.height = rect.height + 'px';
          elemento.style.transform = 'none';
          elemento.style.margin = '0';
        }
      }

      this.editando.add(id);
      this.hacerEditable(elemento, id);

      // Cambiar el botón del menú
      const btn = document.querySelector(`#menu-${id} .btn-editar span`);
      if (btn) btn.textContent = 'Listo';
      const icono = document.querySelector(`#menu-${id} .btn-editar i`);
      if (icono) icono.className = 'fas fa-check';

      this.cerrarTodosLosMenus();
    }
  },

  hacerEditable(elemento, id) {
    if (typeof interact === 'undefined') {
      console.warn('Interact.js no está cargado');
      return;
    }

    const self = this;
    interact(elemento).unset();

    interact(elemento)
      .draggable({
        inertia: false,
        autoScroll: true,
        listeners: {
          start() { elemento.style.cursor = 'grabbing'; },
          move(event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          },
          end() {
            elemento.style.cursor = 'grab';
            const x = parseFloat(elemento.getAttribute('data-x')) || 0;
            const y = parseFloat(elemento.getAttribute('data-y')) || 0;

            elemento.style.left = (parseFloat(elemento.style.left) || 0) + x + 'px';
            elemento.style.top = (parseFloat(elemento.style.top) || 0) + y + 'px';
            elemento.style.transform = '';
            elemento.setAttribute('data-x', 0);
            elemento.setAttribute('data-y', 0);
          }
        }
      })
      .resizable({
        edges: { left: false, right: true, bottom: true, top: false },
        listeners: {
          move(event) {
            const target = event.target;
            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';
          }
        }
      });
  },

  guardarPosicionElemento(id, elemento) {
    const pos = {
      x: parseFloat(elemento.style.left) || 0,
      y: parseFloat(elemento.style.top) || 0,
      w: parseFloat(elemento.style.width) || elemento.offsetWidth,
      h: parseFloat(elemento.style.height) || elemento.offsetHeight
    };

    if (id === 'agenda') {
      this.guardarPosAgenda(pos);
    } else {
      // Post-it
      const postits = this.cargarPostits();
      const p = postits.find(x => x.id === id);
      if (p) {
        p.pos = pos;
        this.guardarPostits(postits);
      }
    }
  },

  eliminarElemento(event, id) {
    event.stopPropagation();

    if (id === 'agenda') {
      // La agenda no se puede eliminar (siempre está)
      alert('La agenda no se puede eliminar, solo mover');
      return;
    }

    if (!confirm('¿Eliminar este elemento?')) return;

    const postits = this.cargarPostits();
    const nuevosPostits = postits.filter(p => p.id !== id);
    this.guardarPostits(nuevosPostits);

    const el = document.querySelector(`.postit[data-id="${id}"]`);
    if (el) el.remove();

    this.cerrarTodosLosMenus();
  },

  /* ═══════════════════════════════════════════════════════
     POSICIÓN Y TAMAÑO
     ═══════════════════════════════════════════════════════ */

  cargarPosAgenda() {
    try {
      const raw = localStorage.getItem('agenda_posicion');
      if (raw) {
        const p = JSON.parse(raw);
        return {
          x: p.x ?? Math.max(20, window.innerWidth - 380),
          y: p.y ?? 20,
          w: p.w ?? 320,
          h: p.h ?? 460
        };
      }
    } catch (e) {}

    return {
      x: Math.max(20, window.innerWidth - 380),
      y: 20,
      w: 320,
      h: 460
    };
  },

  guardarPosAgenda(pos) {
    localStorage.setItem('agenda_posicion', JSON.stringify(pos));
  },

  /* ═══════════════════════════════════════════════════════
     POST-ITS
     ═══════════════════════════════════════════════════════ */

  cargarPostits() {
    try {
      const raw = localStorage.getItem('escritorio_notas');
      if (!raw) {
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
    const posStyle = p.pos
      ? `position:absolute; left:${p.pos.x}px; top:${p.pos.y}px; width:${p.pos.w}px; height:${p.pos.h}px; transform:none; margin:0;`
      : '';
    return `
      <div class="postit ${p.color} elemento-con-menu" data-id="${p.id}" style="${posStyle}">
        ${this.renderMenuFlotante(p.id)}
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

    const contenedor = document.getElementById('zonaNotas');
    const botonAdd = contenedor.querySelector('.postit.add');
    botonAdd.insertAdjacentHTML('beforebegin', this.renderPostit(nuevo));

    const nuevoEl = contenedor.querySelector(`[data-id="${nuevo.id}"] .texto`);
    if (nuevoEl) nuevoEl.focus();
  },

  /**
   * Añade un post-it desde la barra de dirección
   * Coloca la nota en una posición visible del corcho
   */
  añadirPostitDesdeBarra() {
    // Verificar que estamos en el escritorio
    if (window.Router && Router.nivel !== 'escritorio') {
      // Si no estamos en escritorio, ir primero
      if (window.Shell && Shell.activarPestana) {
        Shell.activarPestana('escritorio');
      }
      setTimeout(() => this.añadirPostitDesdeBarra(), 300);
      return;
    }

    const postits = this.cargarPostits();
    const colorAleatorio = this.colores[Math.floor(Math.random() * this.colores.length)];

    // Posición aleatoria dentro del corcho (evitando solapamientos excesivos)
    const corcho = document.getElementById('escritorioCorcho');
    let posX = 60 + Math.floor(Math.random() * 300);
    let posY = 60 + Math.floor(Math.random() * 200);

    const nueva = {
      id: 'n' + Date.now(),
      color: colorAleatorio,
      texto: '',
      fecha: 'hoy',
      pos: { x: posX, y: posY, w: 200, h: 180 }
    };

    postits.push(nueva);
    this.guardarPostits(postits);

    // Re-renderizar el escritorio
    if (window.Vistas && Vistas.render) {
      Vistas.render('escritorio', {});
    }

    // Focus en el nuevo post-it
    setTimeout(() => {
      const nuevoEl = document.querySelector(`.postit[data-id="${nueva.id}"] .texto`);
      if (nuevoEl) nuevoEl.focus();
    }, 100);

    // Toast de confirmación
    if (window.Ajustes && Ajustes.toast) {
      Ajustes.toast('📌 Nota añadida');
    }
  },

  guardarTexto(id, texto) {
    const postits = this.cargarPostits();
    const p = postits.find(x => x.id === id);
    if (p) {
      p.texto = texto.trim();
      this.guardarPostits(postits);
    }
  },

  escapar(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  /* ═══════════════════════════════════════════════════════
     AGENDA
     ═══════════════════════════════════════════════════════ */

  calcularAgenda() {
    // Si hay una fecha ancla (por haber navegado desde semana/mes), usarla
    let fechaBase = new Date();
    if (this.agendaVistaDia) {
      try {
        const partes = this.agendaVistaDia.split('-');
        fechaBase = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
      } catch (e) {}
    }

    const hoy = fechaBase;
    const diaSemana = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][hoy.getDay()];
    const keyHoy = this.keyFecha(hoy);

    let patronesHoy = [];
    try {
      const patrones = JSON.parse(localStorage.getItem('horario_semanal') || '[]');
      patronesHoy = patrones
        .filter(p => {
          if (!Array.isArray(p.dias)) return false;
          if (!p.dias.includes(diaSemana)) return false;
          if (p.fechaDesde && keyHoy < p.fechaDesde) return false;
          if (p.fechaHasta && keyHoy > p.fechaHasta) return false;
          return true;
        })
        .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
    } catch (e) {}

    let eventosHoy = [];
    try {
      const ev = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
      eventosHoy = ev
        .filter(e => e.fecha === keyHoy)
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    } catch (e) {}

    let minutosHoy = 0;
    let sesionesHoy = 0;
    try {
      const log = JSON.parse(localStorage.getItem('estudio_log') || '{}');
      if (log[keyHoy]) {
        minutosHoy = log[keyHoy].minutos || 0;
        sesionesHoy = log[keyHoy].sesiones || 0;
      }
    } catch (e) {}

    return { diaSemana, patronesHoy, eventosHoy, minutosHoy, sesionesHoy, fecha: hoy };
  },

  renderAgenda(ag) {
    // Cabecera y selector comunes
    const cabecera = this.renderAgendaCabecera(ag);
    const selector = this.renderVistaSelector();

    // Cuerpo según la vista
    let cuerpo = '';
    if (this.agendaVista === 'dia') {
      cuerpo = this.renderAgendaDia(ag);
    } else if (this.agendaVista === 'semana') {
      cuerpo = this.renderAgendaSemana();
    } else if (this.agendaVista === 'mes') {
      cuerpo = this.renderAgendaMes();
    }

    // Footer solo en vista día
    const footer = this.agendaVista === 'dia'
      ? `<div class="agenda-footer">
          <span>Hoy: ${this.formatearMinutos(ag.minutosHoy)}</span>
          <button onclick="AgendaModal.abrir()">
            <i class="fas fa-plus"></i> Añadir
          </button>
        </div>`
      : '';

    return `
      ${cabecera}
      ${selector}
      <div class="agenda-body">
        ${cuerpo}
      </div>
      ${footer}
    `;
  },

  renderAgendaCabecera(ag) {
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const diasSemanaLargo = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

    let fechaTexto = '';
    let subtitulo = '';

    if (this.agendaVista === 'dia') {
      // Detectar si es hoy o no
      const hoy = new Date();
      const esHoy = this.keyFecha(ag.fecha) === this.keyFecha(hoy);

      if (esHoy) {
        fechaTexto = `${diasSemanaLargo[ag.fecha.getDay()]} · ${ag.fecha.getDate()} de ${meses[ag.fecha.getMonth()]}`;
        subtitulo = 'Agenda de hoy';
      } else {
        // Navegando por otro día
        fechaTexto = `${diasSemanaLargo[ag.fecha.getDay()]} · ${ag.fecha.getDate()} de ${meses[ag.fecha.getMonth()]}`;
        subtitulo = 'Día seleccionado';
      }
    } else if (this.agendaVista === 'semana') {
      const rango = this.getSemanaRango();
      const inicio = rango.inicio;
      const fin = rango.fin;
      fechaTexto = `Semana del ${inicio.getDate()} al ${fin.getDate()} de ${meses[fin.getMonth()]}`;
      subtitulo = 'Agenda semanal';
    } else {
      fechaTexto = `${meses[this.agendaFecha.getMonth()]} ${this.agendaFecha.getFullYear()}`;
      subtitulo = 'Agenda mensual';
    }

    const minutosTxt = this.formatearMinutos(ag.minutosHoy);

    return `
      <div class="agenda-header">
        <div class="fecha">${fechaTexto}</div>
        <div class="dia">${subtitulo}</div>
        <div class="resumen">
          <i class="fas fa-clock"></i> ${minutosTxt} · ${ag.sesionesHoy} pomodoros
        </div>
      </div>
    `;
  },

  renderVistaSelector() {
    return `
      <div class="agenda-vista-selector">
        <button class="${this.agendaVista === 'dia' ? 'activo' : ''}"
                onclick="Escritorio.cambiarVista('dia')">Día</button>
        <button class="${this.agendaVista === 'semana' ? 'activo' : ''}"
                onclick="Escritorio.cambiarVista('semana')">Semana</button>
        <button class="${this.agendaVista === 'mes' ? 'activo' : ''}"
                onclick="Escritorio.cambiarVista('mes')">Mes</button>

      </div>
    `;
  },

  /* ═══════════════════════════════════════════════════════
     VISTA DÍA
     ═══════════════════════════════════════════════════════ */

  renderAgendaDia(ag) {
    return `
      <div class="agenda-seccion">
        <div class="titulo">
          <i class="fas fa-redo" style="color:#6366f1"></i> Horario
          <span class="badge">${ag.patronesHoy.length}</span>
        </div>
        ${ag.patronesHoy.length === 0
          ? '<div class="agenda-vacio">Sin sesiones programadas</div>'
          : ag.patronesHoy.map(p => this.renderPatronItem(p)).join('')
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
    `;
  },

  /* ═══════════════════════════════════════════════════════
     VISTA SEMANA
     ═══════════════════════════════════════════════════════ */

  getSemanaRango() {
    const hoy = new Date(this.agendaFecha);
    const diaSemana = hoy.getDay(); // 0=domingo
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana; // Lunes como inicio
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() + diff);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    return { inicio, fin };
  },

  renderAgendaSemana() {
    const { inicio, fin } = this.getSemanaRango();
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const nombresDia = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Cargar patrones y eventos
    const patrones = JSON.parse(localStorage.getItem('horario_semanal') || '[]');
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');

    let html = '<div class="agenda-semana">';

    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      const keyDia = this.keyFecha(dia);
      const diaSemanaNombre = diasSemana[i];
      const esHoy = this.keyFecha(dia) === this.keyFecha(new Date());

      // Patrones de este día
      const patronesDia = patrones.filter(p => {
        if (!Array.isArray(p.dias)) return false;
        if (!p.dias.includes(diaSemanaNombre)) return false;
        if (p.fechaDesde && keyDia < p.fechaDesde) return false;
        if (p.fechaHasta && keyDia > p.fechaHasta) return false;
        return true;
      });

      // Eventos de este día
      const eventosDia = eventos.filter(e => e.fecha === keyDia);

      const tieneEventos = patronesDia.length > 0 || eventosDia.length > 0;
      const tieneEventoPuntual = eventosDia.length > 0;

      let clases = 'semana-dia';
      if (esHoy) clases += ' hoy';
      if (tieneEventos) clases += ' tiene-eventos';
      if (tieneEventoPuntual) clases += ' tiene-evento-puntual';

      html += '<div class="' + clases + '" onclick="Escritorio.irADia(\'' + keyDia + '\')">';
      html += '<div class="semana-dia-header">';
      html += '<span class="semana-dia-nombre">' + nombresDia[i] + '</span>';
      html += '<span class="semana-dia-fecha">' + dia.getDate() + ' ' + meses[dia.getMonth()].substring(0, 3) + '</span>';
      html += '</div>';
      html += '<div class="semana-dia-items">';

      if (!tieneEventos) {
        html += '<div class="semana-vacio">Sin sesiones</div>';
      } else {
        // Ordenar por hora
        const items = [];
        patronesDia.forEach(p => items.push({
          tipo: 'horario',
          hora: p.horaInicio || '99:99',
          horaFin: p.horaFin || '',
          icono: p.icono || '📚',
          titulo: p.titulo
        }));
        eventosDia.forEach(e => items.push({
          tipo: 'evento',
          hora: e.hora || '99:99',
          icono: '📝',
          titulo: e.titulo
        }));
        items.sort((a, b) => a.hora.localeCompare(b.hora));

        items.forEach(it => {
          html += '<div class="semana-item ' + it.tipo + '">';
          html += '<span class="hora-mini">' + (it.hora !== '99:99' ? it.hora : '—') + '</span>';
          html += '<span>' + it.icono + '</span>';
          html += '<span>' + this.escapar(it.titulo) + '</span>';
          html += '</div>';
        });
      }

      html += '</div></div>';
    }

    html += '</div>';
    return html;
  },

  /* ═══════════════════════════════════════════════════════
     VISTA MES
     ═══════════════════════════════════════════════════════ */

  renderAgendaMes() {
    const año = this.agendaFecha.getFullYear();
    const mes = this.agendaFecha.getMonth();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const diasSemanaCorto = ['L','M','X','J','V','S','D'];

    const primerDia = new Date(año, mes, 1).getDay();
    const diasAntes = primerDia === 0 ? 6 : primerDia - 1; // Lunes como inicio
    const diasEnMes = new Date(año, mes + 1, 0).getDate();

    // Cargar datos
    const patrones = JSON.parse(localStorage.getItem('horario_semanal') || '[]');
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const keyHoy = this.keyFecha(new Date());

    let html = '<div class="agenda-mes">';
    html += '<div class="mes-titulo">' + meses[mes] + ' ' + año + '</div>';
    html += '<div class="mes-grid">';

    // Cabeceras
    diasSemanaCorto.forEach(d => {
      html += '<div class="mes-cabecera">' + d + '</div>';
    });

    // Celdas vacías al principio
    for (let i = 0; i < diasAntes; i++) {
      html += '<div class="mes-celda vacio"></div>';
    }

    // Días del mes
    for (let d = 1; d <= diasEnMes; d++) {
      const fecha = new Date(año, mes, d);
      const keyDia = this.keyFecha(fecha);
      const diaSemanaNombre = diasSemana[(fecha.getDay() + 6) % 7]; // Lunes=0
      const esHoy = keyDia === keyHoy;

      // ¿Tiene patrones hoy?
      const tienePatron = patrones.some(p => {
        if (!Array.isArray(p.dias)) return false;
        if (!p.dias.includes(diaSemanaNombre)) return false;
        if (p.fechaDesde && keyDia < p.fechaDesde) return false;
        if (p.fechaHasta && keyDia > p.fechaHasta) return false;
        return true;
      });

      const tieneEvento = eventos.some(e => e.fecha === keyDia);
      const tieneEventos = tienePatron || tieneEvento;

      let clases = 'mes-celda';
      if (esHoy) clases += ' hoy';
      if (tieneEventos) clases += ' tiene-eventos';

      html += '<div class="' + clases + '" onclick="Escritorio.irADia(\'' + keyDia + '\')">';
      html += '<span>' + d + '</span>';
      if (tieneEventos) {
        html += '<div class="puntos">';
        if (tienePatron) html += '<div class="punto sesion"></div>';
        if (tieneEvento) html += '<div class="punto evento"></div>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>';

    // Leyenda
    html += '<div class="mes-leyenda">';
    html += '<div><div class="dot sesion"></div> Sesión</div>';
    html += '<div><div class="dot evento"></div> Evento</div>';
    html += '<div><div class="dot hoy"></div> Hoy</div>';
    html += '</div>';

    html += '</div>';
    return html;
  },

  /* ═══════════════════════════════════════════════════════
     ACCIONES DE VISTA
     ═══════════════════════════════════════════════════════ */

  cambiarVista(vista) {
    if (vista === this.agendaVista) return;

    this.agendaVista = vista;
    localStorage.setItem('agenda_vista', vista);

    // NUEVA: no mover la agenda, solo cambiar contenido
    this.refrescarAgendaContenido();
  },

  irADia(keyDia) {
    // Cambiar la fecha ancla al día elegido
    try {
      const partes = keyDia.split('-');
      this.agendaFecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
      this.agendaVistaDia = keyDia;  // Guardar para vista Día
    } catch (e) {}

    this.agendaVista = 'dia';
    localStorage.setItem('agenda_vista', 'dia');
    this.refrescarAgendaContenido();
  },

  refrescarAgendaContenido() {
    const agendaEl = document.getElementById('agendaDia');
    if (!agendaEl) return;

    const menuBtn = agendaEl.querySelector('.menu-flotante-btn');
    const menu = agendaEl.querySelector('.menu-flotante');

    let html = '';
    if (menuBtn) html += menuBtn.outerHTML;
    if (menu) html += menu.outerHTML;
    html += this.renderAgenda(this.calcularAgenda());

    agendaEl.innerHTML = html;
  },

  renderPatronItem(p) {
    const icono = p.icono || '📚';
    const hora = p.horaInicio || '';
    const horaFin = p.horaFin ? ` - ${p.horaFin}` : '';
    const desc = p.desc ? `<small>${this.escapar(p.desc)}</small>` : '';

    return `
      <div class="agenda-item horario"
           onclick="Escritorio.editarEntrada('${p.id}', event)"
           title="Clic para editar">
        <span class="hora">${hora}${horaFin ? '<br><small>' + horaFin + '</small>' : ''}</span>
        <span class="icono">${icono}</span>
        <span class="texto">${this.escapar(p.titulo)}${desc}</span>
        <button class="btn-play" onclick="Escritorio.iniciarPomodoro('${this.escapar(p.titulo)}','${icono}'); event.stopPropagation();">
          <i class="fas fa-play"></i>
        </button>
      </div>
    `;
  },

  renderEventoItem(e) {
    const hora = e.hora ? `<span class="hora">${e.hora}</span>` : '<span class="hora">—</span>';
    const desc = e.desc ? `<small>${this.escapar(e.desc)}</small>` : '';

    return `
      <div class="agenda-item evento"
           onclick="Escritorio.editarEntrada('${e.id}', event)"
           title="Clic para editar">
        ${hora}
        <span class="icono">📝</span>
        <span class="texto">${this.escapar(e.titulo)}${desc}</span>
      </div>
    `;
  },

  editarEntrada(id, event) {
    if (event) event.stopPropagation();
    if (window.AgendaModal) {
      AgendaModal.abrir(id);
    }
  },

  iniciarPomodoro(nombre, icono) {
    if (window.Pomodoro) {
      Pomodoro.setSesion({ nombre, icono });
      Pomodoro.iniciar();
      Pomodoro.toast(`⏱️ Pomodoro iniciado: ${nombre}`);
    }
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
  }
};

window.Escritorio = Escritorio;

/* ═══════════════════════════════════════════════════════════════
   Cerrar menús al clicar fuera
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-flotante') && !e.target.closest('.menu-flotante-btn')) {
    if (window.Escritorio && Escritorio.cerrarTodosLosMenus) {
      Escritorio.cerrarTodosLosMenus();
    }
  }
});
