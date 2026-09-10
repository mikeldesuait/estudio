// ============================================================
// ESTUDIO PERSONAL - DASHBOARD CON WIDGETS (Drag & Drop manual)
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
// DASHBOARD - WIDGETS CON DRAG & DROP MANUAL
// ============================================================

async function mostrarDashboard(main) {
    let ultimaAsignatura = null;
    let ultimoProgreso = 0;
    let notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    let eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    
    for (let area of areas) {
        const ultimaVisita = localStorage.getItem('ultima_visita');
        if (ultimaVisita) {
            try {
                const data = JSON.parse(ultimaVisita);
                ultimaAsignatura = data;
                if (data.areaId && data.asignaturaId && data.temaId) {
                    const key = 'progreso_' + data.asignaturaId + '_' + data.temaId;
                    ultimoProgreso = parseInt(localStorage.getItem(key)) || 0;
                }
            } catch(e) {}
        }
    }
    
    const colors = {
        'grado-derecho': '#3b82f6',
        'pnl': '#9b59b6',
        'herramientas': '#8b5cf6',
        'networking': '#00b4d8'
    };
    
    // Guardar estado para las notas
    window._colorNotaWidget = '#ffd93d';
    
    let html = `
    <style>
        .dashboard-widgets {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            height: calc(100vh - 150px);
            min-height: 450px;
            padding: 5px 0;
        }
        
        .widget {
            background: var(--bg-card);
            border-radius: 16px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: box-shadow 0.2s;
            position: relative;
        }
        .widget:hover { box-shadow: var(--shadow-hover); }
        
        .widget-header {
            padding: 8px 14px;
            cursor: grab;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            background: var(--bg-card);
            border-radius: 16px 16px 0 0;
            user-select: none;
        }
        .widget-header:active { cursor: grabbing; }
        .widget-header .titulo {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .widget-header .acciones {
            display: flex;
            gap: 4px;
        }
        .widget-header .acciones button {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 13px;
            padding: 2px 6px;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .widget-header .acciones button:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .widget-body {
            padding: 10px 14px;
            flex: 1;
            overflow-y: auto;
        }
        
        /* Widget Áreas */
        .areas-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .areas-grid .btn-area {
            padding: 6px 14px;
            border-radius: 8px;
            border: 2px solid var(--border);
            background: var(--bg-card);
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--text-primary);
            text-decoration: none;
            flex: 1 1 auto;
            min-width: 80px;
            justify-content: center;
        }
        .areas-grid .btn-area:hover {
            transform: translateY(-2px);
            border-color: var(--accent);
        }
        .areas-grid .btn-area.continuar {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
        }
        .areas-grid .btn-area .badge {
            font-size: 9px;
            background: rgba(0,0,0,0.1);
            padding: 1px 6px;
            border-radius: 10px;
        }
        .areas-grid .btn-area.continuar .badge {
            background: rgba(255,255,255,0.2);
        }
        
        /* Widget Corcho */
        .corcho-body {
            background: #c4956a;
            background-image: radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px);
            background-size: 20px 20px;
            border-radius: 12px;
            border: 4px solid #a87b53;
            padding: 8px 10px;
            flex: 1;
            min-height: 100px;
            display: flex;
            flex-direction: column;
            margin: -4px;
        }
        .corcho-body .notas-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            flex: 1;
            align-content: flex-start;
            padding: 4px 0;
            overflow-y: auto;
            min-height: 60px;
        }
        .corcho-body .nota-item {
            background: #ffd93d;
            padding: 6px 10px 4px 10px;
            border-radius: 3px 3px 6px 6px;
            font-size: 11px;
            min-width: 50px;
            max-width: 140px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            position: relative;
            transform: rotate(var(--rot, 0deg));
            word-break: break-word;
            cursor: grab;
        }
        .corcho-body .nota-item:active { cursor: grabbing; }
        .corcho-body .nota-item:hover { transform: scale(1.02) rotate(0deg); z-index: 10; }
        .corcho-body .nota-item::before {
            content: '📌';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .corcho-body .nota-item .nota-texto { margin-top: 2px; line-height: 1.2; }
        .corcho-body .nota-item .nota-del {
            position: absolute;
            top: -4px;
            right: -4px;
            background: rgba(0,0,0,0.25);
            border: none;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            color: white;
            font-size: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .corcho-body .nota-item:hover .nota-del { opacity: 1; }
        .corcho-body .nota-item .nota-del:hover { background: rgba(200,0,0,0.6); }
        .corcho-body .nota-vacia {
            width: 100%;
            text-align: center;
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            padding: 10px 0;
        }
        .corcho-body .nota-input {
            display: flex;
            gap: 4px;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 2px solid rgba(255,255,255,0.15);
            flex-shrink: 0;
        }
        .corcho-body .nota-input textarea {
            flex: 1;
            padding: 4px 8px;
            border-radius: 6px;
            border: none;
            background: rgba(255,255,255,0.9);
            color: #2d3748;
            font-size: 11px;
            min-height: 28px;
            max-height: 50px;
            resize: vertical;
            font-family: inherit;
        }
        .corcho-body .nota-input textarea:focus { outline: 2px solid rgba(255,255,255,0.4); }
        .corcho-body .nota-input .btn-add {
            padding: 4px 12px;
            border-radius: 6px;
            border: none;
            background: rgba(255,255,255,0.9);
            color: #2d3748;
            font-weight: 600;
            font-size: 11px;
            cursor: pointer;
        }
        .corcho-body .nota-input .btn-add:hover { background: white; }
        .corcho-body .nota-colores {
            display: flex;
            gap: 3px;
            margin-top: 4px;
            flex-shrink: 0;
        }
        .corcho-body .nota-colores .c-btn {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.25);
            cursor: pointer;
            transition: all 0.15s;
        }
        .corcho-body .nota-colores .c-btn:hover { transform: scale(1.1); }
        .corcho-body .nota-colores .c-btn.sel { border-color: white; }
        
        /* Widget Calendario */
        .cal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        .cal-header .cal-titulo {
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .cal-nav {
            display: flex;
            gap: 2px;
        }
        .cal-nav button {
            background: none;
            border: none;
            padding: 2px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        .cal-nav button:hover { background: var(--bg-hover); color: var(--text-primary); }
        .cal-nav .vista-btn.active { background: var(--accent); color: white; }
        .cal-grid {
            display: grid;
            gap: 2px;
        }
        .cal-grid .cal-dia-semana {
            font-size: 8px;
            text-align: center;
            font-weight: 700;
            color: var(--text-secondary);
            padding: 2px 0;
            text-transform: uppercase;
        }
        .cal-grid .cal-dia {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s;
            background: var(--bg-hover);
            color: var(--text-primary);
            font-weight: 500;
            position: relative;
            min-height: 28px;
        }
        .cal-grid .cal-dia:hover { background: var(--accent); color: white; }
        .cal-grid .cal-dia.hoy { background: var(--accent); color: white; font-weight: 700; }
        .cal-grid .cal-dia.estudio { background: #4ecdc4; color: white; }
        .cal-grid .cal-dia.evento { background: #ff6b6b; color: white; }
        .cal-grid .cal-dia.vacio { background: transparent; cursor: default; }
        .cal-info {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--text-secondary);
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid var(--border);
            flex-shrink: 0;
        }
        
        .widget-full { grid-column: 1 / -1; }
        .widget-half { grid-column: span 1; }
        
        @media (max-width: 768px) {
            .dashboard-widgets {
                grid-template-columns: 1fr;
                height: auto;
                min-height: auto;
            }
            .widget-half { grid-column: 1; }
            .widget { min-height: 200px; }
        }
    </style>
    
    <div class="dashboard-widgets" id="widgetContainer">
        
        <!-- WIDGET 1: ÁREAS -->
        <div class="widget widget-full" id="widgetAreas" style="grid-column: 1 / -1;">
            <div class="widget-header">
                <span class="titulo"><i class="fas fa-grip-lines"></i> 🚀 Áreas de Estudio</span>
                <div class="acciones">
                    <button onclick="recargarWidget('widgetAreas')" title="Recargar">⟳</button>
                </div>
            </div>
            <div class="widget-body">
                <div class="areas-grid">
                    ${ultimaAsignatura ? `
                        <a class="btn-area continuar" href="${ultimaAsignatura.url || '#'}">
                            ▶ Continuar <span class="badge">${ultimoProgreso}%</span>
                        </a>
                    ` : ''}
                    ${areas.map(area => `
                        <a class="btn-area" href="/estudio/?area=${area.id}" style="border-color: ${colors[area.id] || '#6c757d'};">
                            ${area.icon || '📚'} ${area.nombre}
                        </a>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <!-- WIDGET 2: CALENDARIO -->
        <div class="widget widget-half" id="widgetCalendario">
            <div class="widget-header">
                <span class="titulo"><i class="fas fa-grip-lines"></i> 📅 Calendario</span>
                <div class="acciones">
                    <button onclick="cambiarVistaCalendario('dia')" class="vista-btn" data-vista="dia">Día</button>
                    <button onclick="cambiarVistaCalendario('semana')" class="vista-btn active" data-vista="semana">Sem</button>
                    <button onclick="cambiarVistaCalendario('mes')" class="vista-btn" data-vista="mes">Mes</button>
                    <button onclick="recargarWidget('widgetCalendario')" title="Recargar">⟳</button>
                </div>
            </div>
            <div class="widget-body" id="calendarioBody">
                ${renderCalendario(eventos)}
            </div>
        </div>
        
        <!-- WIDGET 3: CORCHO -->
        <div class="widget widget-half" id="widgetCorcho">
            <div class="widget-header">
                <span class="titulo"><i class="fas fa-grip-lines"></i> 📌 Notas</span>
                <div class="acciones">
                    <button onclick="recargarWidget('widgetCorcho')" title="Recargar">⟳</button>
                </div>
            </div>
            <div class="widget-body" style="padding: 4px 6px;">
                <div class="corcho-body">
                    <div class="notas-container" id="notasContainer">
                        ${notas.length === 0 ? '<div class="nota-vacia">📌 Pincha una nota</div>' : ''}
                        ${notas.map((n, i) => `
                            <div class="nota-item" style="background:${n.color || '#ffd93d'}; --rot: ${(Math.random() - 0.5) * 4}deg;" data-index="${i}">
                                <button class="nota-del" onclick="eliminarNotaWidget(${i})">✕</button>
                                <div class="nota-texto">${n.texto}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="nota-input">
                        <textarea id="notaInputWidget" placeholder="Nota..." rows="1"></textarea>
                        <button class="btn-add" onclick="agregarNotaWidget()">+</button>
                    </div>
                    <div class="nota-colores" id="notaColoresWidget"></div>
                </div>
            </div>
        </div>
        
    </div>
    `;
    
    main.innerHTML = html;
    
    // Inicializar eventos
    inicializarNotasWidget();
    inicializarDragWidgets();
}

// ============================================================
// RENDERIZADO DE CALENDARIO
// ============================================================

function renderCalendario(eventos) {
    const hoy = new Date();
    const mes = hoy.getMonth();
    const año = hoy.getFullYear();
    const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    
    // Vista semanal (por defecto)
    let html = `
        <div class="cal-header">
            <span class="cal-titulo" onclick="abrirCalendarioModal()">
                <i class="fas fa-calendar-alt"></i> ${meses[mes]} ${año}
            </span>
        </div>
        <div class="cal-grid" style="grid-template-columns: repeat(7, 1fr);">
    `;
    
    diasSemana.forEach(d => {
        html += `<div class="cal-dia-semana">${d}</div>`;
    });
    
    const primerDia = new Date(año, mes, 1).getDay();
    const diasAntes = primerDia === 0 ? 6 : primerDia - 1;
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const hoyNum = hoy.getDate();
    const hoyMes = hoy.getMonth();
    const hoyAño = hoy.getFullYear();
    
    for (let i = 0; i < diasAntes; i++) {
        html += `<div class="cal-dia vacio"></div>`;
    }
    for (let d = 1; d <= diasEnMes; d++) {
        const esHoy = (d === hoyNum && mes === hoyMes && año === hoyAño);
        const key = año + '-' + String(mes+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        const esEstudio = localStorage.getItem('estudio_fecha_' + key);
        const tieneEvento = eventos.some(e => e.fecha === key);
        let clase = 'cal-dia';
        if (esHoy) clase += ' hoy';
        if (esEstudio) clase += ' estudio';
        if (tieneEvento) clase += ' evento';
        html += `<div class="${clase}" onclick="seleccionarDiaCalendario(${d})">${d}</div>`;
    }
    
    html += `
        </div>
        <div class="cal-info">
            <span>${hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <span>📌 ${eventos.length} eventos</span>
        </div>
    `;
    
    return html;
}

// ============================================================
// FUNCIONES DE WIDGETS
// ============================================================

let colorNotaWidget = '#ffd93d';

function inicializarNotasWidget() {
    // Colores
    const colores = ['#ffd93d', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#dda0dd', '#ff9ff3', '#feca57'];
    const container = document.getElementById('notaColoresWidget');
    if (container) {
        container.innerHTML = colores.map(c => `
            <button class="c-btn ${c === colorNotaWidget ? 'sel' : ''}" onclick="seleccionarColorWidget('${c}')" style="background:${c};"></button>
        `).join('');
    }
    
    // Autoajuste textarea
    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'notaInputWidget') {
            e.target.style.height = 'auto';
            e.target.style.height = (e.target.scrollHeight) + 'px';
        }
    });
}

function seleccionarColorWidget(color) {
    colorNotaWidget = color;
    document.querySelectorAll('#notaColoresWidget .c-btn').forEach(b => {
        b.classList.toggle('sel', b.style.background === color);
    });
}

function agregarNotaWidget() {
    const input = document.getElementById('notaInputWidget');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto) return;
    
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    notas.push({
        texto: texto,
        color: colorNotaWidget || '#ffd93d',
        fecha: new Date().toLocaleDateString()
    });
    localStorage.setItem('tablero_notas', JSON.stringify(notas));
    input.value = '';
    recargarWidget('widgetCorcho');
}

function eliminarNotaWidget(index) {
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    notas.splice(index, 1);
    localStorage.setItem('tablero_notas', JSON.stringify(notas));
    recargarWidget('widgetCorcho');
}

function recargarWidget(widgetId) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    
    if (widgetId === 'widgetCorcho') {
        const body = widget.querySelector('.widget-body');
        if (body) {
            const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
            const container = body.querySelector('.notas-container');
            if (container) {
                if (notas.length === 0) {
                    container.innerHTML = '<div class="nota-vacia">📌 Pincha una nota</div>';
                } else {
                    container.innerHTML = notas.map((n, i) => `
                        <div class="nota-item" style="background:${n.color || '#ffd93d'}; --rot: ${(Math.random() - 0.5) * 4}deg;" data-index="${i}">
                            <button class="nota-del" onclick="eliminarNotaWidget(${i})">✕</button>
                            <div class="nota-texto">${n.texto}</div>
                        </div>
                    `).join('');
                }
            }
        }
    } else if (widgetId === 'widgetCalendario') {
        const body = document.getElementById('calendarioBody');
        if (body) {
            const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
            body.innerHTML = renderCalendario(eventos);
        }
    }
}

function cambiarVistaCalendario(vista) {
    document.querySelectorAll('#widgetCalendario .vista-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.vista === vista);
    });
    recargarWidget('widgetCalendario');
}

function seleccionarDiaCalendario(dia) {
    const hoy = new Date();
    const fecha = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const diaEventos = eventos.filter(e => e.fecha === fecha);
    alert(`📅 Eventos del día ${dia}:\n\n${diaEventos.length > 0 ? diaEventos.map(e => '📌 ' + e.titulo).join('\n') : 'No hay eventos'}`);
}

function abrirCalendarioModal() {
    const hoy = new Date();
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const hoyEventos = eventos.filter(e => e.fecha === hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0'));
    alert(`📅 Eventos de hoy (${hoy.toLocaleDateString('es-ES')}):\n\n${hoyEventos.length > 0 ? hoyEventos.map(e => '📌 ' + e.titulo).join('\n') : 'No hay eventos'}`);
}

// ============================================================
// DRAG & DROP DE WIDGETS
// ============================================================

function inicializarDragWidgets() {
    const container = document.getElementById('widgetContainer');
    if (!container) return;
    
    // Guardar la posición de los widgets
    let widgetOrder = JSON.parse(localStorage.getItem('widget_order') || '["widgetAreas","widgetCalendario","widgetCorcho"]');
    
    // Reordenar widgets según el orden guardado
    const widgets = container.querySelectorAll('.widget');
    const widgetMap = {};
    widgets.forEach(w => { widgetMap[w.id] = w; });
    
    // Limpiar y reordenar
    container.innerHTML = '';
    widgetOrder.forEach(id => {
        if (widgetMap[id]) {
            container.appendChild(widgetMap[id]);
        }
    });
    
    // Añadir eventos de drag
    let draggedWidget = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragClone = null;
    
    document.querySelectorAll('.widget-header').forEach(header => {
        const widget = header.closest('.widget');
        
        header.addEventListener('mousedown', function(e) {
            if (e.target.closest('.acciones')) return;
            draggedWidget = widget;
            const rect = widget.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            // Crear clon para el arrastre
            dragClone = widget.cloneNode(true);
            dragClone.style.position = 'fixed';
            dragClone.style.width = rect.width + 'px';
            dragClone.style.height = rect.height + 'px';
            dragClone.style.left = rect.left + 'px';
            dragClone.style.top = rect.top + 'px';
            dragClone.style.zIndex = '9999';
            dragClone.style.opacity = '0.8';
            dragClone.style.pointerEvents = 'none';
            dragClone.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';
            document.body.appendChild(dragClone);
            
            widget.style.opacity = '0.3';
            
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
        });
    });
    
    function onDragMove(e) {
        if (!dragClone) return;
        dragClone.style.left = (e.clientX - dragOffsetX) + 'px';
        dragClone.style.top = (e.clientY - dragOffsetY) + 'px';
        
        // Detectar sobre qué widget está
        const allWidgets = document.querySelectorAll('.widget');
        allWidgets.forEach(w => {
            if (w === draggedWidget) return;
            const rect = w.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            if (e.clientX > rect.left && e.clientX < rect.right &&
                e.clientY > rect.top && e.clientY < rect.bottom) {
                w.style.borderColor = 'var(--accent)';
                w.style.borderStyle = 'dashed';
            } else {
                w.style.borderColor = 'var(--border)';
                w.style.borderStyle = 'solid';
            }
        });
    }
    
    function onDragEnd(e) {
        if (!draggedWidget) return;
        
        // Eliminar clon
        if (dragClone) {
            dragClone.remove();
            dragClone = null;
        }
        draggedWidget.style.opacity = '1';
        
        // Encontrar el widget de destino
        let targetWidget = null;
        const allWidgets = document.querySelectorAll('.widget');
        allWidgets.forEach(w => {
            w.style.borderColor = 'var(--border)';
            w.style.borderStyle = 'solid';
            if (w === draggedWidget) return;
            const rect = w.getBoundingClientRect();
            if (e.clientX > rect.left && e.clientX < rect.right &&
                e.clientY > rect.top && e.clientY < rect.bottom) {
                targetWidget = w;
            }
        });
        
        if (targetWidget && targetWidget !== draggedWidget) {
            // Intercambiar posición
            const container = document.getElementById('widgetContainer');
            const draggedIndex = Array.from(container.children).indexOf(draggedWidget);
            const targetIndex = Array.from(container.children).indexOf(targetWidget);
            
            if (draggedIndex < targetIndex) {
                container.insertBefore(draggedWidget, targetWidget.nextSibling);
            } else {
                container.insertBefore(draggedWidget, targetWidget);
            }
            
            // Guardar orden
            const newOrder = [];
            container.querySelectorAll('.widget').forEach(w => newOrder.push(w.id));
            localStorage.setItem('widget_order', JSON.stringify(newOrder));
        }
        
        draggedWidget = null;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
    }
}

// ============================================================
// RESTO DE FUNCIONES (ESTUDIO, ÁREAS, CURSOS, SEMESTRES, ETC.)
// ============================================================

function mostrarEstudio(main) {
    const nivel = estado.nivel || 'areas';
    const areaId = estado.areaId || '';
    
    if ((areaId === 'herramientas' || areaId === 'networking' || areaId === 'pnl') && nivel === 'asignaturas') {
        mostrarAsignaturas(main, areaId, '0', '0');
        return;
    }
    
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

async function mostrarAreas(main) {
    let html = `<h1 class="page-title">📚 Áreas de Estudio</h1><div class="area-grid">`;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        const ap = asig.filter(a => estaAprobada(area.id, a.id)).length;
        const mat = asig.filter(a => esMatriculada(a)).length;
        const totalAsig = asig.length;
        const pct = totalAsig > 0 ? Math.round((ap/totalAsig)*100) : 0;
        
        if (area.id === 'herramientas' || area.id === 'networking' || area.id === 'pnl') {
            const color = area.id === 'herramientas' ? '#8b5cf6' : area.id === 'networking' ? '#00b4d8' : '#9b59b6';
            const label = area.id === 'herramientas' ? 'Herramientas' : area.id === 'networking' ? 'Recursos' : 'Formación';
            html += `
                <div class="area-card" onclick="navegar('asignaturas','${area.id}')" style="border: 2px dashed ${color};">
                    <div class="icon">${area.icon || '🔧'}</div>
                    <div class="nombre">${area.nombre}</div>
                    <div class="desc">${area.descripcion || ''}</div>
                    <div style="font-size:13px; color:var(--text-secondary); margin-top:8px;">
                        ⚡ ${label} disponibles: ${asig.length}
                    </div>
                </div>
            `;
        } else {
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

async function mostrarAsignaturas(main, areaId, cursoId, semestreId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    
    const esHerramientas = (areaId === 'herramientas' || areaId === 'networking' || areaId === 'pnl');
    let asig = await getAsignaturas(areaId);
    
    if (!esHerramientas) {
        asig = asig.filter(a => a.curso == cursoId && a.semestre == semestreId);
    }
    
    let html = `
        <div class="area-header">
            <button class="btn btn-outline" onclick="navegar('${esHerramientas ? 'areas' : 'semestres'}','${areaId}'${esHerramientas ? '' : ",'"+cursoId+"'"})"><i class="fas fa-arrow-left"></i> Volver</button>
            <h1>${area.icon || '📚'} ${area.nombre}</h1>
    `;
    
    if (!esHerramientas) {
        const nombresCursos = { '1': 'Primer Curso', '2': 'Segundo Curso', '3': 'Tercer Curso', '4': 'Cuarto Curso' };
        const nombresSemestres = { '0': 'Anuales', '1': 'Primer Semestre', '2': 'Segundo Semestre' };
        const nombreCurso = nombresCursos[cursoId] || 'Curso ' + cursoId;
        const nombreSemestre = nombresSemestres[semestreId] || 'Semestre ' + semestreId;
        html += `<p style="color:var(--text-secondary);">${nombreCurso} - ${nombreSemestre}</p>`;
    } else {
        html += `<p style="color:var(--text-secondary);">${area.descripcion || ''}</p>`;
    }
    html += `</div><div class="asignaturas-grid">`;
    
    asig.forEach(a => {
        const ap = estaAprobada(areaId, a.id);
        const matriculada = esMatriculada(a);
        
        let borderColor = '#f59e0b';
        let badge = '';
        let opacidad = '1';
        let estiloAdicional = '';
        
        if (esHerramientas) {
            borderColor = areaId === 'herramientas' ? '#8b5cf6' : areaId === 'networking' ? '#00b4d8' : '#9b59b6';
            const label = areaId === 'herramientas' ? '🔧 Herramienta' : areaId === 'networking' ? '🌐 Recurso' : '🧠 Asignatura';
            badge = `<span class="badge-herramienta">${label}</span>`;
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
                    ${!esHerramientas ? `<span><i class="fas fa-star"></i> ${a.creditos || 0} ECTS</span>` : ''}
                    <span><i class="fas fa-tag"></i> ${a.caracter || ''}</span>
                </div>
                <div class="acciones">
                    ${!esHerramientas ? `
                        <button onclick="toggleAprobada('${areaId}','${a.id}')" class="btn ${ap ? 'btn-success' : 'btn-outline'}" style="${ap ? 'background:#10b981;color:white;' : ''}">
                            ${ap ? '✅ Desmarcar aprobada' : '📋 Marcar aprobada'}
                        </button>
                    ` : ''}
                    <button onclick="window.location.href='${url}'" class="btn btn-primary">${esHerramientas ? '🔧 Abrir herramienta' : '📖 Ver contenido'}</button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    main.innerHTML = html;
}

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

function volverAsignaturas() {
    const params = new URLSearchParams(window.location.search);
    const area = params.get('area') || '';
    const curso = params.get('curso') || '0';
    const semestre = params.get('semestre') || '0';
    
    let areaId = area;
    if (!areaId) {
        const path = window.location.pathname;
        if (path.includes('grado-derecho')) areaId = 'grado-derecho';
        else if (path.includes('pnl')) areaId = 'pnl';
        else if (path.includes('herramientas')) areaId = 'herramientas';
        else if (path.includes('networking')) areaId = 'networking';
    }
    
    if (!areaId) {
        window.location.href = '../../index.html';
        return;
    }
    
    const areaObj = areas.find(a => a.id === areaId);
    let tieneCursos = false;
    if (areaObj) {
        const asig = asignaturasCache[areaId] || [];
        tieneCursos = asig.some(a => parseInt(a.curso) > 0 || parseInt(a.semestre) > 0);
    }
    
    let url = '../../?nivel=asignaturas&area=' + areaId;
    
    if (tieneCursos) {
        url += '&curso=' + curso + '&semestre=' + semestre;
    } else {
        url += '&curso=0&semestre=0';
    }
    
    window.location.href = url;
}
window.volverAsignaturas = volverAsignaturas;

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
window.recargarWidget = recargarWidget;
window.agregarNotaWidget = agregarNotaWidget;
window.eliminarNotaWidget = eliminarNotaWidget;
window.seleccionarColorWidget = seleccionarColorWidget;
window.cambiarVistaCalendario = cambiarVistaCalendario;
window.seleccionarDiaCalendario = seleccionarDiaCalendario;
window.abrirCalendarioModal = abrirCalendarioModal;
