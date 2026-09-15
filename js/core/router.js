/* ============================================================
   ROUTER — Puente entre el Shell y las vistas de la app
   ============================================================ */

const Router = {
  // Estado actual
  nivel: 'escritorio',
  params: {},

  /**
   * Navega a una vista específica
   */
  navegar(nivel, params = {}) {
    this.nivel = nivel;
    this.params = params;

    // Actualizar URL (para que los botones atrás/adelante funcionen)
    const query = this.construirQuery(nivel, params);
    const base = window.BASE || '';
    const path = base + '/';
    window.history.pushState({ nivel, params }, '', path + (query ? '?' + query : ''));

    // Actualizar el breadcrumb
    this.actualizarRuta(nivel, params);

    // Actualizar el contexto de la statusbar
    this.actualizarContexto(nivel, params);

    // Delegar a la vista correspondiente
    if (window.Vistas && typeof Vistas.render === 'function') {
      Vistas.render(nivel, params);
    } else {
      Shell.setContenido('<div style="padding:40px;text-align:center;color:#718096;">Vista: ' + nivel + '</div>');
    }
  },

  /**
   * Construye la query string para la URL
   */
  construirQuery(nivel, params) {
    if (nivel === 'escritorio') return '';
    const q = new URLSearchParams();
    q.set('nivel', nivel);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, v);
    });
    return q.toString();
  },

  /**
   * Actualiza el breadcrumb de la barra de dirección
   */
  actualizarRuta(nivel, params) {
    const niveles = ['estudio'];

    if (nivel === 'escritorio') {
      niveles.push('Escritorio');
    } else if (nivel === 'areas') {
      niveles.push('Áreas');
    } else if (nivel === 'cursos') {
      niveles.push(this.nombreArea(params.areaId) || 'Área');
      niveles.push('Cursos');
    } else if (nivel === 'semestres') {
      niveles.push(this.nombreArea(params.areaId) || 'Área');
      niveles.push('Curso ' + params.cursoId);
      niveles.push('Semestres');
    } else if (nivel === 'asignaturas') {
      niveles.push(this.nombreArea(params.areaId) || 'Área');
      niveles.push('Asignaturas');
    } else if (nivel === 'temas') {
      niveles.push(this.nombreArea(params.areaId) || 'Área');
      niveles.push(this.nombreAsignatura(params.areaId, params.asignaturaId) || 'Asignatura');
      niveles.push('Temas');
    } else if (nivel === 'tema') {
      niveles.push(this.nombreAsignatura(params.areaId, params.asignaturaId) || 'Asignatura');
      niveles.push(params.temaId || 'Tema');
    }

    Shell.setRuta(niveles);
  },

  /**
   * Actualiza el texto de la statusbar
   */
  actualizarContexto(nivel, params) {
    const textos = {
      'escritorio': 'Escritorio',
      'areas': 'Áreas de estudio',
      'cursos': 'Derecho › Cursos',
      'semestres': 'Curso',
      'asignaturas': 'Asignaturas',
      'temas': 'Temas',
      'tema': 'Estudiando'
    };
    Shell.setContexto(textos[nivel] || nivel);
  },

  /**
   * Nombre bonito de un área
   */
  nombreArea(areaId) {
    if (!areaId) return '';
    if (window.AREAS && Array.isArray(window.AREAS)) {
      const a = window.AREAS.find(x => x.id === areaId);
      if (a) return a.nombre || a.id;
    }
    // Fallback: sacar de la URL (grado-derecho → Grado Derecho)
    return areaId.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  },

  /**
   * Nombre bonito de una asignatura
   */
  nombreAsignatura(areaId, asignaturaId) {
    if (!areaId || !asignaturaId) return '';
    if (window.ASIGNATURAS_CACHE && window.ASIGNATURAS_CACHE[areaId]) {
      const a = window.ASIGNATURAS_CACHE[areaId].find(x => x.id === asignaturaId);
      if (a) return a.nombre || a.id;
    }
    return asignaturaId;
  },

  /**
   * Detecta la ruta desde la URL actual (para carga inicial o recarga)
   */
  desdeURL() {
    const params = new URLSearchParams(window.location.search);
    const nivel = params.get('nivel') || 'escritorio';

    const p = {};
    ['area', 'curso', 'semestre', 'asignatura', 'tema'].forEach(k => {
      const v = params.get(k);
      if (v) p[k === 'area' ? 'areaId' : k === 'curso' ? 'cursoId' : k === 'semestre' ? 'semestreId' : k === 'asignatura' ? 'asignaturaId' : 'temaId'] = v;
    });

    return { nivel, params: p };
  }
};

window.Router = Router;
