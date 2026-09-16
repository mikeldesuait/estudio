/* ============================================================
   BOOKMARKS — Marcadores manuales elegidos por el usuario
   ============================================================ */

const Bookmarks = {
  // Caché de asignaturas por área
  asignaturasCache: {},

  /* ═══════════════════════════════════════════════════════
     CRUD
     ═══════════════════════════════════════════════════════ */

  listar() {
    try {
      return JSON.parse(localStorage.getItem('accesos_rapidos') || '[]');
    } catch (e) {
      return [];
    }
  },

  guardar(lista) {
    localStorage.setItem('accesos_rapidos', JSON.stringify(lista));
  },

  añadir(areaId, asignaturaId) {
    const lista = this.listar();

    // Evitar duplicados
    if (lista.some(m => m.areaId === areaId && m.asignaturaId === asignaturaId)) {
      return { ok: false, msg: 'Este marcador ya existe' };
    }

    // Buscar la asignatura para obtener nombre e icono
    const asig = this.buscarAsignatura(areaId, asignaturaId);
    if (!asig) return { ok: false, msg: 'No se encontró la asignatura' };

    lista.push({
      id: 'acc-' + Date.now(),
      areaId,
      asignaturaId,
      nombre: asig.nombre || asignaturaId,
      icono: asig.icon || '📚'
    });

    this.guardar(lista);
    return { ok: true };
  },

  eliminar(id) {
    let lista = this.listar();
    lista = lista.filter(m => m.id !== id);
    this.guardar(lista);
  },

  buscarAsignatura(areaId, asignaturaId) {
    const lista = this.asignaturasCache[areaId] || [];
    return lista.find(a => a.id === asignaturaId);
  },

  /* ═══════════════════════════════════════════════════════
     CARGA DE ASIGNATURAS
     ═══════════════════════════════════════════════════════ */

  async cargarAsignaturas(areaId) {
    if (this.asignaturasCache[areaId]) return this.asignaturasCache[areaId];

    try {
      const r = await fetch(window.url('estudio/' + areaId + '/asignaturas.json'));
      const data = await r.json();
      this.asignaturasCache[areaId] = data.asignaturas || [];
      return this.asignaturasCache[areaId];
    } catch (e) {
      console.warn('Error cargando asignaturas de', areaId, e);
      return [];
    }
  },

  /* ═══════════════════════════════════════════════════════
     RENDER EN LA BARRA
     ═══════════════════════════════════════════════════════ */

  render() {
    const contenedor = document.getElementById('shellBookmarks');
    if (!contenedor) return;

    // ¿Cuál es el área activa? (pestaña actual del shell)
    const pestanaActiva = window.Shell ? Shell.pestanaActiva : 'escritorio';

    // En escritorio → sin marcadores visibles
    if (pestanaActiva === 'escritorio') {
      contenedor.innerHTML = `
        <span class="etiqueta"><i class="fas fa-bookmark"></i> Marcadores:</span>
        <span style="font-size:11px;color:var(--text-secondary);font-style:italic;">
          Selecciona un área para ver sus marcadores
        </span>
      `;
      return;
    }

    // Filtrar marcadores por el área activa
    const todos = this.listar();
    const lista = todos.filter(m => m.areaId === pestanaActiva);

    let html = '<span class="etiqueta"><i class="fas fa-bookmark"></i> Marcadores:</span>';

    if (lista.length === 0) {
      html += '<span style="font-size:11px;color:var(--text-secondary);font-style:italic;margin-right:8px;">Sin marcadores en esta área</span>';
    } else {
      const marcadorActivo = (window.Shell && Shell.marcadorActivo && Shell.marcadorActivo[pestanaActiva]) || null;

      html += lista.map(m => {
        const clave = m.areaId + '::' + m.asignaturaId;
        const estaActivo = marcadorActivo === clave;
        const estaAbierto = window.Shell && Shell.marcadoresAbiertos && 
                           Shell.marcadoresAbiertos[pestanaActiva] && 
                           Shell.marcadoresAbiertos[pestanaActiva][clave];

        return `
          <div class="shell-marcador ${estaActivo ? 'activo' : ''} ${estaAbierto ? 'abierto' : ''}"
               title="${m.nombre} · clic para abrir · clic derecho o pulsación larga para eliminar"
               data-id="${m.id}"
               onclick="Bookmarks.irA('${m.areaId}', '${m.asignaturaId}')"
               oncontextmenu="event.preventDefault(); Bookmarks.eliminarConConfirm('${m.id}')">
            <span class="favicon">${m.icono}</span>
            <span class="nombre-marcador">${m.nombre}</span>
            <button class="marcador-del"
                    onclick="event.stopPropagation(); Bookmarks.eliminarConConfirm('${m.id}')"
                    title="Eliminar marcador">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
      }).join('');
    }

    html += `
      <div class="shell-marcador add" onclick="Bookmarks.abrirModal()">
        <i class="fas fa-plus"></i> Añadir
      </div>
    `;

    contenedor.innerHTML = html;

    // Activar pulsación larga en cada marcador (para táctil)
    this.activarPulsacionLargaMarcadores();
  },

  /**
   * Activa la pulsación larga (500ms) en cada marcador para eliminar
   * Útil en tablets/táctil donde no hay clic derecho
   */
  activarPulsacionLargaMarcadores() {
    const marcadores = document.querySelectorAll('.shell-marcador[data-id]');

    marcadores.forEach(marcador => {
      let timer = null;
      let activado = false;

      const empezar = (e) => {
        // No activar si fue en el botón ✕
        if (e.target.closest('.marcador-del')) return;

        activado = false;
        marcador.classList.add('pressing');

        timer = setTimeout(() => {
          activado = true;
          marcador.classList.remove('pressing');
          const id = marcador.dataset.id;
          this.eliminarConConfirm(id);
        }, 600);  // 600ms de pulsación larga
      };

      const cancelar = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        marcador.classList.remove('pressing');
      };

      marcador.addEventListener('mousedown', empezar);
      marcador.addEventListener('touchstart', empezar, { passive: true });
      marcador.addEventListener('mouseup', cancelar);
      marcador.addEventListener('mouseleave', cancelar);
      marcador.addEventListener('touchend', cancelar);
      marcador.addEventListener('touchcancel', cancelar);

      // Prevenir que la pulsación larga abra el marcador
      marcador.addEventListener('click', (e) => {
        if (activado) {
          e.preventDefault();
          e.stopPropagation();
          activado = false;
        }
      });
    });
  },

  /* ═══════════════════════════════════════════════════════
     ACCIONES
     ═══════════════════════════════════════════════════════ */

  async irA(areaId, asignaturaId) {
    // Si el marcador ya estaba abierto, solo activarlo
    // Si no, abrirlo (crea su propio iframe persistente)
    if (window.Shell && typeof Shell.abrirMarcador === 'function') {
      // Guardar el path en cache antes de abrir
      if (!Shell._asignaturasCache) Shell._asignaturasCache = {};
      if (!Shell._asignaturasCache[areaId]) {
        await this.cargarAsignaturas(areaId);
        Shell._asignaturasCache[areaId] = this.asignaturasCache[areaId] || [];
      }

      Shell.abrirMarcador(areaId, asignaturaId);

      // Actualizar breadcrumb
      if (window.Router) {
        const nombreAsig = Router.nombreAsignatura(areaId, asignaturaId) || asignaturaId;
        Router.actualizarRuta('asignatura', { areaId, asignaturaId });
        Router.actualizarContexto('asignatura', { areaId, asignaturaId });
        Router.nivel = 'asignatura';
        Router.params = { areaId, asignaturaId };
      }
    }
  },

  eliminarConConfirm(id) {
    if (!confirm('¿Eliminar este marcador?')) return;
    this.eliminar(id);
    this.render();
  },

  /* ═══════════════════════════════════════════════════════
     MODAL
     ═══════════════════════════════════════════════════════ */

  async abrirModal() {
    let modal = document.getElementById('bookmarkModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bookmarkModal';
      modal.className = 'bookmark-modal-overlay';
      modal.innerHTML = `
        <div class="bookmark-modal">
          <div class="bookmark-modal-header">
            <h3><i class="fas fa-bookmark"></i> Añadir marcador</h3>
            <button class="close" onclick="Bookmarks.cerrarModal()">✕</button>
          </div>
          <div class="bookmark-modal-body">
            <label for="bmArea">Área</label>
            <select id="bmArea" onchange="Bookmarks.onAreaChange()">
              <option value="">Selecciona un área...</option>
            </select>

            <label for="bmCurso">Curso</label>
            <select id="bmCurso" onchange="Bookmarks.onCursoChange()" disabled>
              <option value="">Primero elige un área</option>
            </select>

            <label for="bmSemestre">Semestre</label>
            <select id="bmSemestre" onchange="Bookmarks.onSemestreChange()" disabled>
              <option value="">Primero elige un curso</option>
            </select>

            <label for="bmAsignatura">Asignatura</label>
            <select id="bmAsignatura" disabled>
              <option value="">Primero elige un semestre</option>
            </select>
          </div>
          <div class="bookmark-modal-acciones">
            <button class="btn-cancelar" onclick="Bookmarks.cerrarModal()">Cancelar</button>
            <button class="btn-guardar" onclick="Bookmarks.guardarDesdeModal()">Añadir marcador</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.cerrarModal();
      });

      const selectArea = document.getElementById('bmArea');
      (window.AREAS || []).forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = (a.icon || a.icono || '📚') + ' ' + a.nombre;
        selectArea.appendChild(opt);
      });
    }

    modal.classList.add('show');

    // Reset
    document.getElementById('bmArea').value = '';
    document.getElementById('bmCurso').innerHTML = '<option value="">Primero elige un área</option>';
    document.getElementById('bmCurso').disabled = true;
    document.getElementById('bmSemestre').innerHTML = '<option value="">Primero elige un curso</option>';
    document.getElementById('bmSemestre').disabled = true;
    document.getElementById('bmAsignatura').innerHTML = '<option value="">Primero elige un semestre</option>';
    document.getElementById('bmAsignatura').disabled = true;
  },

  /**
   * Cuando cambia el área → carga los cursos disponibles
   */
  async onAreaChange() {
    const areaId = document.getElementById('bmArea').value;
    const selCurso = document.getElementById('bmCurso');
    const selSem = document.getElementById('bmSemestre');
    const selAsig = document.getElementById('bmAsignatura');

    // Reset
    selSem.innerHTML = '<option value="">Primero elige un curso</option>';
    selSem.disabled = true;
    selAsig.innerHTML = '<option value="">Primero elige un semestre</option>';
    selAsig.disabled = true;

    if (!areaId) {
      selCurso.innerHTML = '<option value="">Primero elige un área</option>';
      selCurso.disabled = true;
      return;
    }

    const asignaturas = await this.cargarAsignaturas(areaId);

    // Cursos únicos
    const cursos = [...new Set(asignaturas.map(a => a.curso).filter(c => c !== undefined))].sort();

    if (cursos.length === 0) {
      selCurso.innerHTML = '<option value="">Sin cursos</option>';
      selCurso.disabled = true;
      return;
    }

    selCurso.innerHTML = '<option value="">Selecciona un curso...</option>';
    cursos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = (c === '0' ? 'Sin curso' : 'Curso ' + c);
      selCurso.appendChild(opt);
    });
    selCurso.disabled = false;
  },

  /**
   * Cuando cambia el curso → carga los semestres disponibles
   */
  async onCursoChange() {
    const areaId = document.getElementById('bmArea').value;
    const cursoId = document.getElementById('bmCurso').value;
    const selSem = document.getElementById('bmSemestre');
    const selAsig = document.getElementById('bmAsignatura');

    selAsig.innerHTML = '<option value="">Primero elige un semestre</option>';
    selAsig.disabled = true;

    if (!cursoId) {
      selSem.innerHTML = '<option value="">Primero elige un curso</option>';
      selSem.disabled = true;
      return;
    }

    const asignaturas = await this.cargarAsignaturas(areaId);
    const semestres = [...new Set(
      asignaturas
        .filter(a => a.curso === cursoId)
        .map(a => a.semestre)
        .filter(s => s !== undefined)
    )].sort();

    if (semestres.length === 0) {
      selSem.innerHTML = '<option value="">Sin semestres</option>';
      selSem.disabled = true;
      return;
    }

    selSem.innerHTML = '<option value="">Selecciona un semestre...</option>';
    semestres.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = (s === '0' ? 'Anual' : 'Semestre ' + s);
      selSem.appendChild(opt);
    });
    selSem.disabled = false;
  },

  /**
   * Cuando cambia el semestre → carga las asignaturas
   */
  async onSemestreChange() {
    const areaId = document.getElementById('bmArea').value;
    const cursoId = document.getElementById('bmCurso').value;
    const semestreId = document.getElementById('bmSemestre').value;
    const selAsig = document.getElementById('bmAsignatura');

    if (!semestreId) {
      selAsig.innerHTML = '<option value="">Primero elige un semestre</option>';
      selAsig.disabled = true;
      return;
    }

    const asignaturas = await this.cargarAsignaturas(areaId);
    const filtradas = asignaturas.filter(a => a.curso === cursoId && a.semestre === semestreId);

    if (filtradas.length === 0) {
      selAsig.innerHTML = '<option value="">Sin asignaturas</option>';
      selAsig.disabled = true;
      return;
    }

    selAsig.innerHTML = '<option value="">Selecciona una asignatura...</option>';
    filtradas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      const marca = a.matriculada ? ' ✓' : '';
      opt.textContent = (a.icon || '📚') + ' ' + a.nombre + marca;
      selAsig.appendChild(opt);
    });
    selAsig.disabled = false;
  },

  guardarDesdeModal() {
    const areaId = document.getElementById('bmArea').value;
    const asignaturaId = document.getElementById('bmAsignatura').value;

    if (!areaId || !asignaturaId) {
      alert('Selecciona área y asignatura');
      return;
    }

    const res = this.añadir(areaId, asignaturaId);
    if (!res.ok) {
      alert(res.msg);
      return;
    }

    this.cerrarModal();
    this.render();
  },

  cerrarModal() {
    const modal = document.getElementById('bookmarkModal');
    if (modal) modal.classList.remove('show');
  }
};

window.Bookmarks = Bookmarks;
