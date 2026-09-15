/* ============================================================
   AGENDA MODAL — Formulario completo para eventos y patrones
   ============================================================ */

const AgendaModal = {
  modoEdicion: false,
  editandoId: null,
  tipoActual: 'evento',

  abrir(eventoId = null) {
    this.modoEdicion = !!eventoId;
    this.editandoId = eventoId;

    let modal = document.getElementById('agendaModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'agendaModal';
      modal.className = 'agenda-modal-overlay';
      modal.innerHTML = this.getTemplate();
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.cerrar();
      });

      this.bindEventos();
    }

    if (eventoId) {
      this.cargarDatos(eventoId);
    } else {
      this.resetFormulario();
    }

    modal.classList.add('show');

    setTimeout(() => {
      const input = document.getElementById('amTitulo');
      if (input) input.focus();
    }, 100);
  },

  cerrar() {
    const modal = document.getElementById('agendaModal');
    if (modal) modal.classList.remove('show');
  },

  getTemplate() {
    return `
      <div class="agenda-modal">
        <div class="agenda-modal-header">
          <h3><i class="fas fa-calendar-plus"></i> <span id="amTituloModal">Nueva entrada</span></h3>
          <button class="close" onclick="AgendaModal.cerrar()">✕</button>
        </div>

        <div class="agenda-modal-body">
          <div class="am-tipo-selector">
            <label class="am-tipo-opcion" id="amTipoEvento">
              <input type="radio" name="amTipo" value="evento" checked>
              <span class="am-tipo-card">
                <i class="fas fa-calendar-day"></i>
                <strong>Evento puntual</strong>
                <small>Un día concreto</small>
              </span>
            </label>
            <label class="am-tipo-opcion" id="amTipoPatron">
              <input type="radio" name="amTipo" value="patron">
              <span class="am-tipo-card">
                <i class="fas fa-redo"></i>
                <strong>Patrón semanal</strong>
                <small>Se repite cada semana</small>
              </span>
            </label>
          </div>

          <label for="amTitulo">Título</label>
          <input type="text" id="amTitulo" placeholder="Ej: Matemáticas, Examen Civil..." maxlength="60">

          <label for="amDesc">Descripción <span class="am-opcional">(opcional)</span></label>
          <textarea id="amDesc" rows="2" placeholder="Detalles, notas, tema..." maxlength="200"></textarea>

          <div id="amBloqueEvento">
            <label for="amFecha">Fecha</label>
            <input type="date" id="amFecha">
            <label for="amHora">Hora <span class="am-opcional">(opcional)</span></label>
            <input type="time" id="amHora">
          </div>

          <div id="amBloquePatron" style="display:none;">
            <label>Días de la semana</label>
            <div class="am-dias-selector">
              <button type="button" class="am-dia" data-dia="lunes">L</button>
              <button type="button" class="am-dia" data-dia="martes">M</button>
              <button type="button" class="am-dia" data-dia="miercoles">X</button>
              <button type="button" class="am-dia" data-dia="jueves">J</button>
              <button type="button" class="am-dia" data-dia="viernes">V</button>
              <button type="button" class="am-dia" data-dia="sabado">S</button>
              <button type="button" class="am-dia" data-dia="domingo">D</button>
            </div>

            <div class="am-horas-grid">
              <div>
                <label for="amHoraInicio">Hora inicio</label>
                <input type="time" id="amHoraInicio" value="18:00">
              </div>
              <div>
                <label for="amHoraFin">Hora fin <span class="am-opcional">(opc.)</span></label>
                <input type="time" id="amHoraFin" value="19:30">
              </div>
            </div>

            <div class="am-horas-grid">
              <div>
                <label for="amFechaDesde">Vigente desde</label>
                <input type="date" id="amFechaDesde">
              </div>
              <div>
                <label for="amFechaHasta">Hasta <span class="am-opcional">(opc.)</span></label>
                <input type="date" id="amFechaHasta">
              </div>
            </div>
          </div>

          <label>Color</label>
          <div class="am-colores">
            <button type="button" class="am-color amarillo" data-color="amarillo" title="Amarillo"></button>
            <button type="button" class="am-color azul activo" data-color="azul" title="Azul"></button>
            <button type="button" class="am-color verde" data-color="verde" title="Verde"></button>
            <button type="button" class="am-color rosa" data-color="rosa" title="Rosa"></button>
            <button type="button" class="am-color naranja" data-color="naranja" title="Naranja"></button>
          </div>
          <input type="hidden" id="amColor" value="azul">
        </div>

        <div class="agenda-modal-acciones">
          <button class="btn-eliminar" id="amBtnEliminar" onclick="AgendaModal.eliminar()" style="display:none;">
            <i class="fas fa-trash"></i> Eliminar
          </button>
          <button class="btn-cancelar" onclick="AgendaModal.cerrar()">Cancelar</button>
          <button class="btn-guardar" onclick="AgendaModal.guardar()">
            <i class="fas fa-check"></i> Guardar
          </button>
        </div>
      </div>
    `;
  },

  bindEventos() {
    document.querySelectorAll('input[name="amTipo"]').forEach(r => {
      r.addEventListener('change', () => this.cambiarTipo(r.value));
    });

    document.querySelectorAll('.am-dia').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('activo');
      });
    });

    document.querySelectorAll('.am-color').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.am-color').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        document.getElementById('amColor').value = btn.dataset.color;
      });
    });

    const hoy = this.keyFecha(new Date());
    document.getElementById('amFecha').value = hoy;
    document.getElementById('amFechaDesde').value = hoy;
  },

  cambiarTipo(tipo) {
    this.tipoActual = tipo;
    document.getElementById('amBloqueEvento').style.display = tipo === 'evento' ? 'block' : 'none';
    document.getElementById('amBloquePatron').style.display = tipo === 'patron' ? 'block' : 'none';
  },

  resetFormulario() {
    document.getElementById('amTitulo').value = '';
    document.getElementById('amDesc').value = '';
    document.getElementById('amHora').value = '';
    document.getElementById('amHoraInicio').value = '18:00';
    document.getElementById('amHoraFin').value = '19:30';
    document.getElementById('amFechaHasta').value = '';
    document.querySelectorAll('.am-dia').forEach(b => b.classList.remove('activo'));
    document.querySelectorAll('.am-color').forEach(b => b.classList.remove('activo'));
    document.querySelector('.am-color.azul').classList.add('activo');
    document.getElementById('amColor').value = 'azul';
    document.querySelector('input[name="amTipo"][value="evento"]').checked = true;
    this.cambiarTipo('evento');
    document.getElementById('amBtnEliminar').style.display = 'none';
    document.getElementById('amTituloModal').textContent = 'Nueva entrada';
  },

  cargarDatos(id) {
    let item = null;
    let tipo = 'evento';

    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    item = eventos.find(e => e.id === id);

    if (!item) {
      const patrones = JSON.parse(localStorage.getItem('horario_semanal') || '[]');
      item = patrones.find(p => p.id === id);
      tipo = 'patron';
    }

    if (!item) return;

    this.tipoActual = tipo;
    document.querySelector(`input[name="amTipo"][value="${tipo}"]`).checked = true;
    this.cambiarTipo(tipo);

    document.getElementById('amTitulo').value = item.titulo || '';
    document.getElementById('amDesc').value = item.desc || '';
    document.getElementById('amColor').value = item.color || 'azul';
    document.querySelectorAll('.am-color').forEach(b => {
      b.classList.toggle('activo', b.dataset.color === (item.color || 'azul'));
    });

    if (tipo === 'evento') {
      document.getElementById('amFecha').value = item.fecha || '';
      document.getElementById('amHora').value = item.hora || '';
    } else {
      document.querySelectorAll('.am-dia').forEach(b => {
        b.classList.toggle('activo', (item.dias || []).includes(b.dataset.dia));
      });
      document.getElementById('amHoraInicio').value = item.horaInicio || '18:00';
      document.getElementById('amHoraFin').value = item.horaFin || '19:30';
      document.getElementById('amFechaDesde').value = item.fechaDesde || '';
      document.getElementById('amFechaHasta').value = item.fechaHasta || '';
    }

    document.getElementById('amBtnEliminar').style.display = 'flex';
    document.getElementById('amTituloModal').textContent = 'Editar entrada';
  },

  guardar() {
    const titulo = document.getElementById('amTitulo').value.trim();
    if (!titulo) {
      alert('El título es obligatorio');
      document.getElementById('amTitulo').focus();
      return;
    }

    const desc = document.getElementById('amDesc').value.trim();
    const color = document.getElementById('amColor').value;
    const tipo = document.querySelector('input[name="amTipo"]:checked').value;

    if (tipo === 'evento') {
      this.guardarEvento(titulo, desc, color);
    } else {
      this.guardarPatron(titulo, desc, color);
    }

    this.cerrar();
    this.refrescarAgenda();
  },

  guardarEvento(titulo, desc, color) {
    const fecha = document.getElementById('amFecha').value;
    const hora = document.getElementById('amHora').value;

    if (!fecha) {
      alert('La fecha es obligatoria para un evento puntual');
      return;
    }

    let eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');

    if (this.modoEdicion) {
      const idx = eventos.findIndex(e => e.id === this.editandoId);
      if (idx >= 0) {
        eventos[idx] = { ...eventos[idx], titulo, desc, color, fecha, hora };
      }
    } else {
      eventos.push({
        id: 'ev-' + Date.now(),
        fecha, hora, titulo, desc, color
      });
    }

    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));
  },

  guardarPatron(titulo, desc, color) {
    const dias = [];
    document.querySelectorAll('.am-dia.activo').forEach(b => dias.push(b.dataset.dia));

    if (dias.length === 0) {
      alert('Selecciona al menos un día');
      return;
    }

    const horaInicio = document.getElementById('amHoraInicio').value;
    const horaFin = document.getElementById('amHoraFin').value;
    const fechaDesde = document.getElementById('amFechaDesde').value;
    const fechaHasta = document.getElementById('amFechaHasta').value;

    let patrones = JSON.parse(localStorage.getItem('horario_semanal') || '[]');

    if (this.modoEdicion) {
      const idx = patrones.findIndex(p => p.id === this.editandoId);
      if (idx >= 0) {
        patrones[idx] = { ...patrones[idx], titulo, desc, color, dias, horaInicio, horaFin, fechaDesde, fechaHasta };
      }
    } else {
      patrones.push({
        id: 'pat-' + Date.now(),
        titulo, desc, color, dias, horaInicio, horaFin, fechaDesde, fechaHasta
      });
    }

    localStorage.setItem('horario_semanal', JSON.stringify(patrones));
  },

  eliminar() {
    if (!this.editandoId) return;
    if (!confirm('¿Eliminar esta entrada?')) return;

    let eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    eventos = eventos.filter(e => e.id !== this.editandoId);
    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));

    let patrones = JSON.parse(localStorage.getItem('horario_semanal') || '[]');
    patrones = patrones.filter(p => p.id !== this.editandoId);
    localStorage.setItem('horario_semanal', JSON.stringify(patrones));

    this.cerrar();
    this.refrescarAgenda();
  },

  refrescarAgenda() {
    const el = document.getElementById('agendaDia');
    if (el && window.Escritorio && typeof Escritorio.renderAgenda === 'function') {
      // Re-renderizar solo el contenido de la agenda (sin el menú flotante)
      const menu = el.querySelector('.menu-flotante');
      const menuBtn = el.querySelector('.menu-flotante-btn');
      const contenidoAgenda = Escritorio.renderAgenda(Escritorio.calcularAgenda());

      // Mantener el menú flotante
      let html = '';
      if (menuBtn) html += menuBtn.outerHTML;
      if (menu) html += menu.outerHTML;
      html += contenidoAgenda;

      el.innerHTML = html;
    }
  },

  keyFecha(fecha) {
    return fecha.getFullYear() + '-' +
           String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
           String(fecha.getDate()).padStart(2, '0');
  }
};

window.AgendaModal = AgendaModal;
