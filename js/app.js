// ============================================================
// ESTUDIO PERSONAL - NÚCLEO DE LA HERRAMIENTA
// VERSIÓN: ESTILOS SEGÚN ESTADO (matriculada, aprobada, pendiente)
// ============================================================

let areas = [];
let asignaturasCache = {};
let estado = {
    nivel: 'areas',
    areaId: '',
    cursoId: '',
    semestreId: '',
    asignaturaId: '',
    temaId: ''
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 Estudio Personal iniciado');
    cargarAreas();
});

function cargarAreas() {
    const listaAreas = [
        { id: 'grado-derecho', path: 'estudio/grado-derecho/' },
        { id: 'pnl', path: 'estudio/pnl/' },
        { id: 'herramientas', path: 'estudio/herramientas/' },
        { id: 'networking', path: 'estudio/networking/' }
    ];
    
    let cargadas = 0;
    listaAreas.forEach(item => {
        fetch(item.path + 'config.json')
            .then(res => res.json())
            .then(data => {
                areas.push({ id: item.id, path: item.path, ...data });
                cargadas++;
                if (cargadas === listaAreas.length) {
                    console.log('✅ Áreas cargadas:', areas);
                    if (!cargarEstadoDesdeURL()) {
                        cargarVista('dashboard');
                    }
                }
            })
            .catch(err => {
                console.warn('⚠️ Error cargando área:', item.id, err);
                cargadas++;
                if (cargadas === listaAreas.length) {
                    cargarVista('dashboard');
                }
            });
    });
}

function cargarAsignaturas(areaId) {
    return new Promise((resolve, reject) => {
        if (asignaturasCache[areaId]) {
            resolve(asignaturasCache[areaId]);
            return;
        }
        const area = areas.find(a => a.id === areaId);
        if (!area) { reject('Área no encontrada'); return; }
        fetch(area.path + 'asignaturas.json')
            .then(res => res.json())
            .then(data => {
                asignaturasCache[areaId] = data.asignaturas || [];
                console.log('✅ Asignaturas cargadas:', asignaturasCache[areaId].length);
                resolve(asignaturasCache[areaId]);
            })
            .catch(() => {
                asignaturasCache[areaId] = [];
                resolve([]);
            });
    });
}

async function getAsignaturas(areaId) {
    if (asignaturasCache[areaId]) return asignaturasCache[areaId];
    await cargarAsignaturas(areaId);
    return asignaturasCache[areaId] || [];
}

function estaAprobada(areaId, asignaturaId) {
    return localStorage.getItem('aprobada_' + areaId + '_' + asignaturaId) === 'true';
}

function toggleAprobada(areaId, asignaturaId) {
    const actual = estaAprobada(areaId, asignaturaId);
    localStorage.setItem('aprobada_' + areaId + '_' + asignaturaId, actual ? 'false' : 'true');
    cargarVista('estudio');
}

function esMatriculada(asignatura) {
    return asignatura.matriculada === true;
}

function cargarEstadoDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    const nivel = params.get('nivel');
    if (nivel) {
        estado.nivel = nivel;
        estado.areaId = params.get('area') || '';
        estado.cursoId = params.get('curso') || '';
        estado.semestreId = params.get('semestre') || '';
        estado.asignaturaId = params.get('asignatura') || '';
        estado.temaId = params.get('tema') || '';
        cargarVista('estudio');
        return true;
    }
    return false;
}

function cargarVista(vista) {
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(l => {
        const texto = l.textContent.trim().toLowerCase();
        if (texto.includes(vista) || (vista === 'dashboard' && texto.includes('inicio')) ||
            (vista === 'estudio' && texto.includes('área')) ||
            (vista === 'configuracion' && texto.includes('progreso'))) {
            l.classList.add('active');
        }
    });
    const main = document.getElementById('mainContent');
    if (vista === 'dashboard') mostrarDashboard(main);
    else if (vista === 'estudio') mostrarEstudio(main);
    else if (vista === 'configuracion') mostrarConfiguracion(main);
}

function navegar(nivel, areaId, cursoId, semestreId, asignaturaId, temaId) {
    estado.nivel = nivel;
    if (areaId) estado.areaId = areaId;
    if (cursoId) estado.cursoId = cursoId;
    if (semestreId) estado.semestreId = semestreId;
    if (asignaturaId) estado.asignaturaId = asignaturaId;
    if (temaId) estado.temaId = temaId;
    const params = new URLSearchParams();
    params.set('nivel', nivel);
    if (areaId) params.set('area', areaId);
    if (cursoId) params.set('curso', cursoId);
    if (semestreId) params.set('semestre', semestreId);
    if (asignaturaId) params.set('asignatura', asignaturaId);
    if (temaId) params.set('tema', temaId);
    const nuevaUrl = window.location.pathname + '?' + params.toString();
    window.history.pushState({}, '', nuevaUrl);
    cargarVista('estudio');
}

// ============================================================
// DASHBOARD
// ============================================================

async function mostrarDashboard(main) {
    let total = 0, aprobadas = 0, matriculadas = 0;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        total += asig.length;
        aprobadas += asig.filter(a => estaAprobada(area.id, a.id)).length;
        matriculadas += asig.filter(a => esMatriculada(a)).length;
    }
    let html = `
        <h1 class="page-title">📊 Dashboard</h1>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-layer-group"></i></div><div class="stat-info"><h3>Áreas</h3><span class="number">${areas.length}</span></div></div>
            <div class="stat-card"><div class="stat-icon green"><i class="fas fa-book"></i></div><div class="stat-info"><h3>Asignaturas</h3><span class="number">${total}</span></div></div>
            <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-check-circle"></i></div><div class="stat-info"><h3>Aprobadas</h3><span class="number">${aprobadas}</span></div></div>
            <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-graduation-cap"></i></div><div class="stat-info"><h3>Matriculadas</h3><span class="number">${matriculadas}</span></div></div>
        </div>
    `;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        const ap = asig.filter(a => estaAprobada(area.id, a.id)).length;
        const mat = asig.filter(a => esMatriculada(a)).length;
        const totalAsig = asig.length;
        const pct = totalAsig > 0 ? Math.round((ap/totalAsig)*100) : 0;
        html += `
            <div class="card">
                <h2>${area.icon || '📚'} ${area.nombre}</h2>
                <div class="progress-item">
                    <div class="progress-header"><span>${ap}/${totalAsig} aprobadas | ${mat} matriculadas</span><span>${pct}%</span></div>
                    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
                </div>
            </div>
        `;
    }
    main.innerHTML = html;
}

// ============================================================
// ESTUDIO - NAVEGACIÓN JERÁRQUICA
// ============================================================

function mostrarEstudio(main) {
    const nivel = estado.nivel || 'areas';
    const areaId = estado.areaId || '';
    const cursoId = estado.cursoId || '';
    const semestreId = estado.semestreId || '';
    const asignaturaId = estado.asignaturaId || '';
    const temaId = estado.temaId || '';
    
    if (nivel === 'areas') mostrarAreas(main);
    else if (nivel === 'cursos') mostrarCursos(main, areaId);
    else if (nivel === 'semestres') mostrarSemestres(main, areaId, cursoId);
    else if (nivel === 'asignaturas') mostrarAsignaturas(main, areaId, cursoId, semestreId);
    else if (nivel === 'temas') mostrarTemas(main, areaId, cursoId, semestreId, asignaturaId);
    else if (nivel === 'tema') mostrarTema(main, areaId, cursoId, semestreId, asignaturaId, temaId);
}

// ============================================================
// NIVEL 1: ÁREAS
// ============================================================

async function mostrarAreas(main) {
    let html = `<h1 class="page-title">📚 Áreas de Estudio</h1><div class="area-grid">`;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        const ap = asig.filter(a => estaAprobada(area.id, a.id)).length;
        const mat = asig.filter(a => esMatriculada(a)).length;
        const totalAsig = asig.length;
        const pct = totalAsig > 0 ? Math.round((ap/totalAsig)*100) : 0;
        
        // Detectar si el área tiene cursos/semestres
        const tieneCursos = asig.some(a => parseInt(a.curso) > 0 || parseInt(a.semestre) > 0);
        
        if (!tieneCursos) {
            // Área sin cursos/semestres → salto directo a asignaturas
            const color = area.id === 'herramientas' ? '#8b5cf6' : area.id === 'networking' ? '#00b4d8' : area.id === 'pnl' ? '#9b59b6' : '#3498db';
            html += `
                <div class="area-card" onclick="navegar('asignaturas','${area.id}')" style="border: 2px dashed ${color};">
                    <div class="icon">${area.icon || '📚'}</div>
                    <div class="nombre">${area.nombre}</div>
                    <div class="desc">${area.descripcion || ''}</div>
                    <div style="font-size:13px; color:var(--text-secondary); margin-top:8px;">
                        📖 ${asig.length} asignatura${asig.length > 1 ? 's' : ''} disponibles
                    </div>
                </div>
            `;
        } else {
            // Área con cursos/semestres → navegación normal
            html += `
                <div class="area-card" onclick="navegar('cursos','${area.id}')">
                    <div class="icon">${area.icon || '📚'}</div>
                    <div class="nombre">${area.nombre}</div>
                    <div class="desc">${area.descripcion || ''}</div>
                    <div class="progress-track" style="margin-top:8px;">
                        <div class="progress-fill" style="width:${pct}%; height:6px;"></div>
                    </div>
                    <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
                        ${ap}/${totalAsig} aprobadas | ${mat} matriculadas
                    </div>
                </div>
            `;
        }
    }
    html += `</div>`;
    main.innerHTML = html;
}

// ============================================================
// NIVEL 2: CURSOS
// ============================================================

async function mostrarCursos(main, areaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    const asig = await getAsignaturas(areaId);
    const cursos = [...new Set(asig.map(a => a.curso))].sort();
    const nombresCursos = { '1': 'Primer Curso', '2': 'Segundo Curso', '3': 'Tercer Curso', '4': 'Cuarto Curso' };
    const iconosCursos = { '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣' };
    let html = `
        <div class="area-header">
            <button class="btn btn-outline" onclick="navegar('areas')"><i class="fas fa-arrow-left"></i> Volver</button>
            <h1>${area.icon || '📚'} ${area.nombre}</h1>
        </div>
        <div class="area-grid">
    `;
    for (let cursoId of cursos) {
        const asigCurso = asig.filter(a => a.curso == cursoId);
        const ap = asigCurso.filter(a => estaAprobada(areaId, a.id)).length;
        const mat = asigCurso.filter(a => esMatriculada(a)).length;
        const pct = asigCurso.length > 0 ? Math.round((ap/asigCurso.length)*100) : 0;
        const nombre = nombresCursos[cursoId] || 'Curso ' + cursoId;
        const icono = iconosCursos[cursoId] || '📚';
        html += `
            <div class="area-card" onclick="navegar('semestres','${areaId}','${cursoId}')">
                <div class="icon" style="font-size:32px;">${icono}</div>
                <div class="nombre">${nombre}</div>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
                    ${ap}/${asigCurso.length} aprobadas | ${mat} matriculadas (${pct}%)
                </div>
                <div class="progress-track" style="margin-top:8px;">
                    <div class="progress-fill" style="width:${pct}%; height:6px;"></div>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    main.innerHTML = html;
}

// ============================================================
// NIVEL 3: SEMESTRES
// ============================================================

async function mostrarSemestres(main, areaId, cursoId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    const asig = await getAsignaturas(areaId);
    const asigCurso = asig.filter(a => a.curso == cursoId);
    const semestres = [...new Set(asigCurso.map(a => a.semestre))].sort();
    const nombresSemestres = { '0': '📅 Anuales', '1': '📖 Primer Semestre', '2': '📖 Segundo Semestre' };
    const nombresCursos = { '1': 'Primer Curso', '2': 'Segundo Curso', '3': 'Tercer Curso', '4': 'Cuarto Curso' };
    const nombreCurso = nombresCursos[cursoId] || 'Curso ' + cursoId;
    let html = `
        <div class="area-header">
            <button class="btn btn-outline" onclick="navegar('cursos','${areaId}')"><i class="fas fa-arrow-left"></i> Volver</button>
            <h1>${area.icon || '📚'} ${area.nombre} - ${nombreCurso}</h1>
        </div>
        <div class="area-grid">
    `;
    for (let semId of semestres) {
        const asigSem = asigCurso.filter(a => a.semestre == semId);
        const ap = asigSem.filter(a => estaAprobada(areaId, a.id)).length;
        const mat = asigSem.filter(a => esMatriculada(a)).length;
        const total = asigSem.length;
        const pct = total > 0 ? Math.round((ap/total)*100) : 0;
        const nombre = nombresSemestres[semId] || 'Semestre ' + semId;
        html += `
            <div class="area-card" onclick="navegar('asignaturas','${areaId}','${cursoId}','${semId}')">
                <div class="icon" style="font-size:32px;">${nombre.includes('Anual') ? '📅' : '📖'}</div>
                <div class="nombre">${nombre}</div>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
                    ${ap}/${total} aprobadas | ${mat} matriculadas (${pct}%)
                </div>
                <div class="progress-track" style="margin-top:8px;">
                    <div class="progress-fill" style="width:${pct}%; height:6px;"></div>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    main.innerHTML = html;
}

// ============================================================
// NIVEL 4: ASIGNATURAS CON ESTILOS SEGÚN ESTADO
// ============================================================

async function mostrarAsignaturas(main, areaId, cursoId, semestreId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    
    let asig = await getAsignaturas(areaId);
    
    // Detectar si el área tiene cursos/semestres
    const tieneCursos = asig.some(a => parseInt(a.curso) > 0 || parseInt(a.semestre) > 0);
    
    // Si tiene cursos, filtrar por curso y semestre
    if (tieneCursos) {
        asig = asig.filter(a => a.curso == cursoId && a.semestre == semestreId);
    }
    
    // Construir cabecera
    let html = `
        <div class="area-header">
            <button class="btn btn-outline" onclick="navegar('${tieneCursos ? 'semestres' : 'areas'}','${areaId}'${tieneCursos ? ",'"+cursoId+"'" : ''})"><i class="fas fa-arrow-left"></i> Volver</button>
            <h1>${area.icon || '📚'} ${area.nombre}</h1>
    `;
    
    if (tieneCursos) {
        const nombresCursos = { '1': 'Primer Curso', '2': 'Segundo Curso', '3': 'Tercer Curso', '4': 'Cuarto Curso' };
        const nombresSemestres = { '0': 'Anuales', '1': 'Primer Semestre', '2': 'Segundo Semestre' };
        const nombreCurso = nombresCursos[cursoId] || 'Curso ' + cursoId;
        const nombreSemestre = nombresSemestres[semestreId] || 'Semestre ' + semestreId;
        html += `<p style="color:var(--text-secondary);">${nombreCurso} - ${nombreSemestre}</p>`;
    } else {
        html += `<p style="color:var(--text-secondary);">${area.descripcion || ''}</p>`;
    }
    html += `</div><div class="asignaturas-grid">`;
    
    // Mostrar asignaturas
    asig.forEach(a => {
        const ap = estaAprobada(areaId, a.id);
        const matriculada = esMatriculada(a);
        
        let borderColor = '#f59e0b';
        let badge = '';
        let opacidad = '1';
        let estiloAdicional = '';
        
        if (!tieneCursos) {
            // Área sin cursos/semestres: estilo especial
            const colors = { 'herramientas': '#8b5cf6', 'networking': '#00b4d8', 'pnl': '#9b59b6' };
            borderColor = colors[areaId] || '#3498db';
            badge = `<span class="badge-herramienta">📖 Asignatura</span>`;
            opacidad = '1';
        } else if (ap) {
            borderColor = '#10b981';
            badge = '<span class="badge-aprobada">✅ Aprobada</span>';
            opacidad = '0.6';
            estiloAdicional = 'filter: grayscale(0.3);';
        } else if (matriculada) {
            borderColor = '#3b82f6';
            badge = '<span class="badge-matriculada">📌 Matriculada</span>';
            opacidad = '1';
        } else {
            borderColor = '#9ca3af';
            badge = '<span class="badge-no-matriculada">📋 No matriculada</span>';
            opacidad = '0.5';
            estiloAdicional = 'filter: grayscale(0.6);';
        }
        
        const url = area.path + a.path + 'asignatura.html';
        
        html += `
            <div class="asignatura-card" style="border-left: 4px solid ${borderColor}; opacity: ${opacidad}; ${estiloAdicional}">
                <div class="header">
                    <div class="nombre-linea">
                        <span class="nombre">${a.icon || '📚'} ${a.nombre}</span>
                        ${badge}
                    </div>
                    <span class="codigo">${a.codigo || ''}</span>
                </div>
                <div class="info">
                    ${tieneCursos ? `<span><i class="fas fa-star"></i> ${a.creditos || 0} ECTS</span>` : ''}
                    <span><i class="fas fa-tag"></i> ${a.caracter || ''}</span>
                </div>
                <div class="acciones">
                    ${tieneCursos ? `
                        <button onclick="toggleAprobada('${areaId}','${a.id}')" class="btn ${ap ? 'btn-success' : 'btn-outline'}" style="${ap ? 'background:#10b981;color:white;' : ''}">
                            ${ap ? '✅ Desmarcar aprobada' : '📋 Marcar aprobada'}
                        </button>
                    ` : ''}
                    <button onclick="window.location.href='${url}'" class="btn btn-primary">${tieneCursos ? '📖 Ver contenido' : '🔧 Abrir'}</button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    main.innerHTML = html;
}

// ============================================================
// NIVEL 5: TEMAS (SPA)
// ============================================================

function mostrarTemas(main, areaId, cursoId, semestreId, asignaturaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    let asignatura = null;
    if (asignaturasCache[areaId]) {
        asignatura = asignaturasCache[areaId].find(a => a.id === asignaturaId);
    }
    if (!asignatura) {
        main.innerHTML = '<h2>Asignatura no encontrada</h2>';
        return;
    }
    const path = area.path + asignatura.path + 'config.json';
    fetch(path)
        .then(res => res.json())
        .then(data => {
            let html = `
                <div class="area-header">
                    <button class="btn btn-outline" onclick="navegar('asignaturas','${areaId}','${cursoId}','${semestreId}')"><i class="fas fa-arrow-left"></i> Volver</button>
                    <h1>${asignatura.icon || '📚'} ${asignatura.nombre}</h1>
                    <p style="color:var(--text-secondary);">${asignatura.codigo} | ${asignatura.creditos} ECTS</p>
                </div>
                <div class="card">
                    <h2>📑 Temas</h2>
                    <div class="temas-list">
            `;
            const temas = data.temas || [];
            if (temas.length === 0) {
                html += `<p style="color:var(--text-secondary);">No hay temas cargados.</p>`;
            } else {
                temas.forEach((t, i) => {
                    html += `
                        <div class="tema-item" onclick="navegar('tema','${areaId}','${cursoId}','${semestreId}','${asignaturaId}','${t.id}')">
                            <div class="tema-info">
                                <span class="tema-numero">${i+1}</span>
                                <span class="tema-titulo">${t.titulo}</span>
                            </div>
                            <div class="tema-progreso">
                                <span>0%</span>
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div></div>`;
            main.innerHTML = html;
        })
        .catch(() => {
            main.innerHTML = `
                <div class="area-header">
                    <button class="btn btn-outline" onclick="navegar('asignaturas','${areaId}','${cursoId}','${semestreId}')"><i class="fas fa-arrow-left"></i> Volver</button>
                    <h1>${asignatura.icon || '📚'} ${asignatura.nombre}</h1>
                    <p style="color:var(--text-secondary);">No hay configuración cargada.</p>
                </div>
                <div class="card">
                    <h2>📑 Temas</h2>
                    <p style="color:var(--text-secondary);">Crea un archivo config.json en la carpeta de la asignatura.</p>
                </div>
            `;
        });
}

// ============================================================
// NIVEL 6: TEMA (SPA)
// ============================================================

function mostrarTema(main, areaId, cursoId, semestreId, asignaturaId, temaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    let asignatura = null;
    if (asignaturasCache[areaId]) {
        asignatura = asignaturasCache[areaId].find(a => a.id === asignaturaId);
    }
    if (!asignatura) {
        main.innerHTML = '<h2>Asignatura no encontrada</h2>';
        return;
    }
    const path = area.path + asignatura.path + 'temas/' + temaId + '/tema.html';
    fetch(path)
        .then(res => {
            if (!res.ok) throw new Error('Tema no encontrado');
            return res.text();
        })
        .then(html => {
            main.innerHTML = html;
            const scripts = main.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
            });
        })
        .catch(() => {
            main.innerHTML = `
                <div class="area-header">
                    <button class="btn btn-outline" onclick="navegar('temas','${areaId}','${cursoId}','${semestreId}','${asignaturaId}')"><i class="fas fa-arrow-left"></i> Volver</button>
                    <h1>📖 Tema: ${temaId}</h1>
                    <p style="color:var(--text-secondary);">No se encuentra el contenido.</p>
                </div>
                <div class="card">
                    <p style="color:var(--text-secondary);">Crea un archivo tema.html en la carpeta temas/${temaId}/</p>
                </div>
            `;
        });
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

async function mostrarConfiguracion(main) {
    let total = 0, ap = 0, mat = 0;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        total += asig.length;
        ap += asig.filter(a => estaAprobada(area.id, a.id)).length;
        mat += asig.filter(a => esMatriculada(a)).length;
    }
    main.innerHTML = `
        <h1 class="page-title">⚙️ Configuración</h1>
        <div class="card">
            <h2>📋 Datos del Sistema</h2>
            <p><strong>Áreas:</strong> ${areas.length}</p>
            <p><strong>Asignaturas:</strong> ${total}</p>
            <p><strong>Aprobadas:</strong> ${ap}</p>
            <p><strong>Matriculadas:</strong> ${mat}</p>
        </div>
        <div class="card">
            <h2>🧹 Limpieza</h2>
            <button class="btn btn-danger" onclick="if(confirm('¿Borrar todo el progreso?')){localStorage.clear();alert('Reiniciado');cargarVista('configuracion');}"><i class="fas fa-trash"></i> Reiniciar Progreso</button>
        </div>
    `;
}

// ============================================================
// TEMA OSCURO / CLARO
// ============================================================

document.getElementById('themeToggle').addEventListener('click', function() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    this.querySelector('i').className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', newTheme);
});

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (savedTheme === 'dark') document.querySelector('#themeToggle i').className = 'fas fa-sun';

document.getElementById('menuToggle').addEventListener('click', function() {
    document.getElementById('navLinks').classList.toggle('open');
});

window.cargarVista = cargarVista;
window.navegar = navegar;
window.toggleAprobada = toggleAprobada;