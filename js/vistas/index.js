/* ============================================================
   VISTAS — Puente entre Router y las vistas de la app
   ============================================================ */

const Vistas = {
  // Filtro actual: 'matriculadas' | 'todas'
  filtroAsignaturas: 'matriculadas',
  async render(nivel, params) {
    const main = window.Shell
      ? Shell.getContenedorActual()
      : document.getElementById('shellContenido');

    if (!main) {
      console.error('❌ No hay contenedor para la pestaña activa');
      return;
    }

    // Si vamos a la raíz (escritorio/asignaturas), ocultar marcadores abiertos
    if (window.Shell && (nivel === 'escritorio' || nivel === 'asignaturas' || nivel === 'areas')) {
      Shell.volverARaiz();
    }

    // Quitar modo asignatura si estaba activo
    main.classList.remove('asignatura-abierta');

    // Mostrar cargando
    main.innerHTML = '<div style="padding:40px;text-align:center;color:#718096;font-family:Inter,sans-serif;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    try {
      switch (nivel) {
        case 'escritorio':
          this.renderEscritorio(main);
          break;
        case 'areas':
          await this.renderAreas(main);
          break;
        case 'asignaturas':
          await this.renderAsignaturas(main, params);
          break;
        case 'asignatura':
          await this.renderAsignatura(main, params);
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
     ESCRITORIO
     ═══════════════════════════════════════════════════════ */

  renderEscritorio(main) {
    if (window.Escritorio && typeof Escritorio.render === 'function') {
      return Escritorio.render(main);
    }
    main.innerHTML = '<div style="padding:40px;text-align:center;">Escritorio no disponible</div>';
  },

  /* ═══════════════════════════════════════════════════════
     ÁREAS
     ═══════════════════════════════════════════════════════ */

  async renderAreas(main) {
    if (!window.AREAS || window.AREAS.length === 0) {
      main.innerHTML = '<div style="padding:40px;text-align:center;color:#718096;">Cargando áreas...</div>';
      setTimeout(() => this.renderAreas(main), 300);
      return;
    }

    let html = '<div style="padding:24px;font-family:Inter,sans-serif;">';
    html += '<h1 style="font-size:24px;margin:0 0 20px;">📚 Áreas de Estudio</h1>';
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

  /* ═══════════════════════════════════════════════════════
     ASIGNATURAS DE UN ÁREA
     ═══════════════════════════════════════════════════════ */

  async renderAsignaturas(main, params) {
    try {
      const r = await fetch(window.url('estudio/' + params.areaId + '/asignaturas.json'));
      const data = await r.json();
      const todas = data.asignaturas || [];

      // Detectar si es área tipo "herramienta" (curso 0, semestre 0)
      const esHerramienta = todas.length > 0 && todas.every(a => a.curso === '0' && a.semestre === '0');

      // Aplicar filtro
      let asignaturas;
      if (esHerramienta) {
        asignaturas = todas;
      } else if (this.filtroAsignaturas === 'todas') {
        asignaturas = todas;
      } else {
        asignaturas = todas.filter(a => a.matriculada === true);
      }

      const nombreArea = window.Router ? Router.nombreArea(params.areaId) : params.areaId;
      const totalMatriculadas = todas.filter(a => a.matriculada === true).length;
      const totalTodas = todas.length;

      let html = '<div style="padding:24px;font-family:Inter,sans-serif;">';

      // ─── Cabecera con filtro ───
      html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">';
      html += '<h1 style="font-size:24px;margin:0;">' + nombreArea + '</h1>';

      // Mostrar filtro solo si hay diferencia entre matriculadas y todas
      if (!esHerramienta && totalTodas > totalMatriculadas) {
        html += '<div class="filtro-asignaturas">';
        html += '<button class="filtro-btn ' + (this.filtroAsignaturas === 'matriculadas' ? 'activo' : '') + '" ';
        html += 'onclick="Vistas.cambiarFiltro(\'matriculadas\')">';
        html += '<i class="fas fa-check-circle"></i> Matriculadas <span class="filtro-count">' + totalMatriculadas + '</span>';
        html += '</button>';
        html += '<button class="filtro-btn ' + (this.filtroAsignaturas === 'todas' ? 'activo' : '') + '" ';
        html += 'onclick="Vistas.cambiarFiltro(\'todas\')">';
        html += '<i class="fas fa-book"></i> Todas <span class="filtro-count">' + totalTodas + '</span>';
        html += '</button>';
        html += '</div>';
      }

      html += '</div>';

      if (asignaturas.length === 0) {
        html += '<p style="color:#718096;">No hay asignaturas para mostrar.</p>';
      } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">';
        asignaturas.forEach(a => {
          const aprobada = localStorage.getItem('aprobada_' + params.areaId + '_' + a.id) === 'true';
          const matriculada = a.matriculada === true;

          // Estilos según matriculada o no
          let estilo = 'background:#fff;border:1px solid #e2ddd3;';
          let colorBorde = aprobada ? '#10b981' : (matriculada ? '#3b82f6' : '#cbd5e0');
          let opacidad = matriculada ? '1' : '0.7';

          estilo += 'border-left:4px solid ' + colorBorde + ';';
          estilo += 'border-radius:8px;padding:14px;cursor:pointer;transition:all .15s;opacity:' + opacidad + ';';

          html += '<div onclick="Router.navegar(\'asignatura\', {areaId:\'' + params.areaId + '\', asignaturaId:\'' + a.id + '\'})" ';
          html += 'style="' + estilo + '" ';
          html += 'onmouseover="this.style.transform=\'translateX(3px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.08)\';this.style.opacity=\'1\'" ';
          html += 'onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';this.style.opacity=\'' + opacidad + '\'">';

          html += '<div style="font-size:20px;margin-bottom:6px;">' + (a.icon || '📚') + '</div>';
          html += '<div style="font-weight:600;color:#2d3748;font-size:14px;margin-bottom:4px;">' + a.nombre + '</div>';
          html += '<div style="font-size:11px;color:#718096;">' + (a.codigo || '') + (aprobada ? ' · ✅ Aprobada' : '') + '</div>';

          // Etiqueta "no matriculada"
          if (!matriculada && !esHerramienta) {
            html += '<div style="margin-top:6px;display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#f0ebe2;color:#718096;padding:2px 6px;border-radius:4px;">No matriculada</div>';
          }

          html += '</div>';
        });
        html += '</div>';
      }

      html += '</div>';
      main.innerHTML = html;

    } catch (e) {
      main.innerHTML = '<div style="padding:24px;color:#ef4444;">Error cargando asignaturas: ' + e.message + '</div>';
    }
  },

  cambiarFiltro(filtro) {
    this.filtroAsignaturas = filtro;
    // Re-renderizar la vista actual
    if (window.Router && Router.nivel === 'asignaturas') {
      this.renderAsignaturas(
        document.querySelector('.shell-contenido-pestana.shell-activa .pestana-root'),
        Router.params
      );
    }
  },

  /* ═══════════════════════════════════════════════════════
     ASIGNATURA (iframe)
     ═══════════════════════════════════════════════════════ */

  async renderAsignatura(main, params) {
    // Buscar el path de la asignatura
    let path = '';
    try {
      const rAsig = await fetch(window.url('estudio/' + params.areaId + '/asignaturas.json'));
      const dataAsig = await rAsig.json();
      const asig = (dataAsig.asignaturas || []).find(a => a.id === params.asignaturaId);
      if (asig && asig.path) path = asig.path;
    } catch (e) {
      console.warn('No se pudo cargar la asignatura:', e);
    }

    if (!path) {
      main.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444;">No se encontró la asignatura</div>';
      return;
    }

    const urlAsignatura = window.url('estudio/' + params.areaId + '/' + path + 'asignatura.html');

    // Ajustar el contenedor para que el iframe llene todo
    // ya no se usa

    // Crear el iframe
    main.innerHTML = `
      <div style="width:100%;height:100%;padding:0;margin:0;background:#ffffff;">
        <iframe id="iframeAsignatura"
                style="width:100%;height:100%;border:none;display:block;"
                title="Asignatura">
        </iframe>
      </div>
    `;

    const iframe = document.getElementById('iframeAsignatura');
    if (!iframe) return;

    // Escuchar cuando el iframe termine de cargar
    iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc || !doc.head) return;

        // NOTA: no inyectamos <base> porque rompe los enlaces internos
        // de la asignatura. Los CSS rotos se arreglarán en los propios HTMLs.

        // Inyectar estilos base para que se vea coherente
        if (!doc.querySelector('style[data-shell-inject]')) {
          const style = doc.createElement('style');
          style.setAttribute('data-shell-inject', 'true');
          style.textContent = `
            body {
              background: #ffffff;
              color: #2d3748;
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 24px;
            }
            a { color: #6366f1; }
            h1, h2, h3 { color: #1e293b; }
          `;
          doc.head.appendChild(style);
        }
      } catch (e) {
        console.warn('No se pudo ajustar el iframe:', e);
      }
    });

    // Cargar el HTML del asignatura
    iframe.src = urlAsignatura;
  },

  /* ═══════════════════════════════════════════════════════
     TEMAS
     ═══════════════════════════════════════════════════════ */

  async renderTemas(main, params) {
    main.innerHTML = '<div style="padding:24px;">Temas (en desarrollo)</div>';
  },

  async renderTema(main, params) {
    main.innerHTML = '<div style="padding:24px;">Tema (en desarrollo)</div>';
  }
};

window.Vistas = Vistas;
