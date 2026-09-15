/* ============================================================
   VISTAS — Puente entre Router y las funciones de app.js
   ============================================================ */

const Vistas = {
  async render(nivel, params) {
    const main = document.getElementById('shellContenido');
    if (!main) return;

    // Mostrar cargando
    main.innerHTML = '<div style="padding:40px;text-align:center;color:#718096;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    try {
      switch (nivel) {
        case 'escritorio':
          this.renderEscritorio(main);
          break;
        case 'areas':
          await this.renderAreas(main);
          break;
        case 'cursos':
          await this.renderCursos(main, params);
          break;
        case 'semestres':
          await this.renderSemestres(main, params);
          break;
        case 'asignaturas':
          await this.renderAsignaturas(main, params);
          break;
        case 'temas':
          await this.renderTemas(main, params);
          break;
        case 'tema':
          await this.renderTema(main, params);
          break;
        default:
          main.innerHTML = '<div style="padding:40px;text-align:center;">Vista no encontrada: ' + nivel + '</div>';
      }
    } catch (e) {
      console.error('Error al renderizar vista:', e);
      main.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444;">Error: ' + e.message + '</div>';
    }
  },

  /* ═══════════════════════════════════════════════════════
     VISTAS — de momento, placeholders con botones reales
     Después conectaremos con app.js
     ═══════════════════════════════════════════════════════ */

  renderEscritorio(main) {
    if (window.Escritorio && typeof Escritorio.render === 'function') {
      return Escritorio.render(main);
    }
    main.innerHTML = `
      <div style="padding:40px;text-align:center;font-family:Inter,sans-serif;">
        <h2 style="color:#2d3748;margin:0 0 8px;">🏠 Escritorio</h2>
        <p style="color:#718096;">Aquí irá el corcho con post-its y la agenda del día.</p>
      </div>
    `;
  },

  async renderAreas(main) {
    // Esperar a que las áreas estén cargadas
    if (!window.AREAS || window.AREAS.length === 0) {
      main.innerHTML = '<div style="padding:40px;text-align:center;color:#718096;">Cargando áreas...</div>';
      setTimeout(() => this.renderAreas(main), 300);
      return;
    }

    let html = '<div style="padding:24px;">';
    html += '<h1 style="font-family:Inter;font-size:24px;margin:0 0 20px;">📚 Áreas de Estudio</h1>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">';

    window.AREAS.forEach(area => {
      html += `
        <div onclick="Router.navegar('asignaturas', {areaId:'${area.id}'})"
             style="background:#fff;border:2px solid #e2ddd3;border-radius:12px;padding:20px;cursor:pointer;text-align:center;transition:all .15s;"
             onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'"
             onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div style="font-size:36px;margin-bottom:8px;">${area.icon || area.icono || '📚'}</div>
          <div style="font-weight:600;color:#2d3748;margin-bottom:4px;">${area.nombre}</div>
          <div style="font-size:12px;color:#718096;">${area.descripcion || ''}</div>
        </div>
      `;
    });

    html += '</div></div>';
    main.innerHTML = html;
  },

  async renderCursos(main, params) {
    main.innerHTML = `
      <div style="padding:24px;">
        <button onclick="Router.navegar('areas')" style="background:none;border:1px solid #e2ddd3;padding:8px 16px;border-radius:8px;cursor:pointer;margin-bottom:16px;">
          <i class="fas fa-arrow-left"></i> Volver
        </button>
        <h1 style="font-family:Inter;font-size:24px;margin:0 0 8px;">Cursos · ${params.areaId}</h1>
        <p style="color:#718096;">(Vista en desarrollo)</p>
      </div>
    `;
  },

  async renderSemestres(main, params) {
    main.innerHTML = '<div style="padding:24px;">Semestres · ' + params.areaId + ' (en desarrollo)</div>';
  },

  async renderAsignaturas(main, params) {
    // Cargar asignaturas del área
    try {
      const r = await fetch(`estudio/${params.areaId}/asignaturas.json`);
      const data = await r.json();
      const asignaturas = (data.asignaturas || []).filter(a => a.matriculada !== false);

      let html = '<div style="padding:24px;">';
      html += '<button onclick="Router.navegar(\'areas\')" style="background:none;border:1px solid #e2ddd3;padding:8px 16px;border-radius:8px;cursor:pointer;margin-bottom:16px;font-family:Inter;">';
      html += '<i class="fas fa-arrow-left"></i> Volver</button>';
      html += `<h1 style="font-family:Inter;font-size:24px;margin:0 0 20px;">${Router.nombreArea(params.areaId)}</h1>`;
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">';

      asignaturas.forEach(a => {
        const aprobada = localStorage.getItem(`aprobada_${params.areaId}_${a.id}`) === 'true';
        html += `
          <div onclick="window.location.href=window.url('estudio/${params.areaId}/${a.path}asignatura.html')"
               style="background:#fff;border:1px solid #e2ddd3;border-left:4px solid ${aprobada ? '#10b981' : '#3b82f6'};border-radius:8px;padding:14px;cursor:pointer;transition:all .15s;"
               onmouseover="this.style.transform='translateX(3px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
               onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style="font-size:20px;margin-bottom:6px;">${a.icon || '📚'}</div>
            <div style="font-weight:600;color:#2d3748;font-size:14px;margin-bottom:4px;">${a.nombre}</div>
            <div style="font-size:11px;color:#718096;">${a.codigo || ''}${aprobada ? ' · ✅ Aprobada' : ''}</div>
          </div>
        `;
      });

      html += '</div></div>';
      main.innerHTML = html;
    } catch (e) {
      main.innerHTML = '<div style="padding:24px;color:#ef4444;">Error cargando asignaturas: ' + e.message + '</div>';
    }
  },

  async renderTemas(main, params) {
    main.innerHTML = '<div style="padding:24px;">Temas de ' + params.asignaturaId + ' (en desarrollo)</div>';
  },

  async renderTema(main, params) {
    main.innerHTML = '<div style="padding:24px;">Tema ' + params.temaId + ' (en desarrollo)</div>';
  }
};

window.Vistas = Vistas;
