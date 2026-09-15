/* ============================================================
   ROUTER — Puente entre el Shell y las vistas de la app
   SIN pushState: la URL no cambia al navegar (SPA interna)
   ============================================================ */

const Router = {
  nivel: 'escritorio',
  params: {},

  navegar(nivel, params = {}) {
    // Guardar HTML actual antes de navegar
    if (window.Shell && typeof Shell.guardarHTMLActual === 'function') {
      Shell.guardarHTMLActual();
    }

    this.nivel = nivel;
    this.params = params;
    this.actualizarRuta(nivel, params);
    this.actualizarContexto(nivel, params);

    if (window.Shell && typeof Shell.registrarNavegacion === 'function') {
      Shell.registrarNavegacion(nivel, params);
    }

    // Notificar al Shell para que guarde el estado de la pestaña activa
    if (window.Shell && typeof Shell.registrarNavegacion === 'function') {
      Shell.registrarNavegacion(nivel, params);
    }

    if (window.Vistas && typeof Vistas.render === 'function') {
      Vistas.render(nivel, params);
    } else {
      Shell.setContenido('<div style="padding:40px;text-align:center;color:#718096;">Vista: ' + nivel + '</div>');
    }
  },

  navegarSinHistorial(nivel, params = {}) {
    this.nivel = nivel;
    this.params = params;
    this.actualizarRuta(nivel, params);
    this.actualizarContexto(nivel, params);

    // Intentar restaurar HTML cacheado
    if (window.Shell && typeof Shell.restaurarHTML === 'function') {
      const restaurado = Shell.restaurarHTML();
      if (restaurado) return;
    }

    // Si no hay cache, re-renderizar
    if (window.Vistas && typeof Vistas.render === 'function') {
      Vistas.render(nivel, params);
    }
  },

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

  actualizarContexto(nivel, params) {
    const textos = {
      'escritorio': 'Escritorio',
      'areas': 'Áreas de estudio',
      'cursos': 'Cursos',
      'semestres': 'Semestres',
      'asignaturas': 'Asignaturas',
      'temas': 'Temas',
      'tema': 'Estudiando'
    };
    Shell.setContexto(textos[nivel] || nivel);
  },

  nombreArea(areaId) {
    if (!areaId) return '';
    if (window.AREAS && Array.isArray(window.AREAS)) {
      const a = window.AREAS.find(x => x.id === areaId);
      if (a) return a.nombre || a.id;
    }
    return areaId.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  },

  nombreAsignatura(areaId, asignaturaId) {
    if (!areaId || !asignaturaId) return '';
    if (window.ASIGNATURAS_CACHE && window.ASIGNATURAS_CACHE[areaId]) {
      const a = window.ASIGNATURAS_CACHE[areaId].find(x => x.id === asignaturaId);
      if (a) return a.nombre || a.id;
    }
    return asignaturaId;
  },

  desdeURL() {
    const params = new URLSearchParams(window.location.search);
    const nivel = params.get('nivel') || 'escritorio';
    const p = {};
    if (params.get('area')) p.areaId = params.get('area');
    if (params.get('curso')) p.cursoId = params.get('curso');
    if (params.get('semestre')) p.semestreId = params.get('semestre');
    if (params.get('asignatura')) p.asignaturaId = params.get('asignatura');
    if (params.get('tema')) p.temaId = params.get('tema');
    return { nivel, params: p };
  }
};

window.Router = Router;
