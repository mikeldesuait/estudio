// ============================================================
// ESTUDIO PERSONAL - NÚCLEO DE LA HERRAMIENTA
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
// DASHBOARD - VERSIÓN FINAL COMPLETA
// ============================================================

async function mostrarDashboard(main) {
    let ultimaAsignatura = null;
    let ultimoProgreso = 0;
    
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
    
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    const colors = {
        'grado-derecho': '#3b82f6',
        'pnl': '#9b59b6',
        'herramientas': '#8b5cf6',
        'networking': '#00b4d8'
    };
    
    // Estado del calendario
    let mesActual = new Date().getMonth();
    let añoActual = new Date().getFullYear();
    
    let html = `
    <style>
        .dashboard-final {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 16px;
            height: calc(100vh - 150px);
            min-height: 400px;
            padding: 5px 0;
        }
        
        .col-izquierda {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .areas-pestanas {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .btn-area-pestana {
            padding: 8px 16px;
            border-radius: 10px;
            border: 2px solid var(--border);
            background: var(--bg-card);
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--text-primary);
            max-width: 140px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            flex-shrink: 0;
            text-decoration: none;
        }
        .btn-area-pestana .icono { font-size: 16px; flex-shrink: 0; }
        .btn-area-pestana .nombre {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .btn-area-pestana:hover {
            transform: translateY(-2px);
            border-color: var(--accent);
            box-shadow: var(--shadow-hover);
        }
        .btn-area-pestana.continuar {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
        }
        .btn-area-pestana.continuar:hover { opacity: 0.85; }
        .btn-area-pestana .badge {
            font-size: 10px;
            background: rgba(0,0,0,0.1);
            padding: 1px 8px;
            border-radius: 12px;
            flex-shrink: 0;
        }
        .btn-area-pestana.continuar .badge {
            background: rgba(255,255,255,0.2);
        }
        
        .col-derecha {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        /* CALENDARIO */
        .calendario-completo {
            background: var(--bg-card);
            border-radius: 16px;
            border: 1px solid var(--border);
            padding: 12px 14px;
            box-shadow: var(--shadow);
        }
        .calendario-completo .cal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        .calendario-completo .cal-header h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .calendario-completo .cal-header h4 i { font-size: 14px; color: var(--text-secondary); }
        .calendario-completo .cal-header .cal-nav {
            display: flex;
            gap: 4px;
        }
        .calendario-completo .cal-header .cal-nav button {
            background: none;
            border: none;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        .calendario-completo .cal-header .cal-nav button:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        .calendario-completo .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
        }
        .calendario-completo .cal-grid .cal-dia-semana {
            font-size: 9px;
            text-align: center;
            font-weight: 700;
            color: var(--text-secondary);
            padding: 4px 0;
            text-transform: uppercase;
        }
        .calendario-completo .cal-grid .cal-dia {
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
            background: var(--bg-hover);
            color: var(--text-primary);
            font-weight: 500;
            position: relative;
            min-height: 32px;
        }
        .calendario-completo .cal-grid .cal-dia:hover { 
            background: var(--accent); 
            color: white; 
            transform: scale(1.05);
        }
        .calendario-completo .cal-grid .cal-dia.hoy { 
            background: var(--accent); 
            color: white; 
            font-weight: 700;
        }
        .calendario-completo .cal-grid .cal-dia.estudio { 
            background: #4ecdc4; 
            color: white; 
        }
        .calendario-completo .cal-grid .cal-dia.evento { 
            background: #ff6b6b; 
            color: white; 
        }
        .calendario-completo .cal-grid .cal-dia .punto {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #ff6b6b;
            position: absolute;
            bottom: 2px;
        }
        .calendario-completo .cal-grid .cal-dia.vacio { 
            background: transparent; 
            cursor: default;
        }
        .calendario-completo .cal-info {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid var(--border);
        }
        .calendario-completo .cal-info .eventos-hoy {
            cursor: pointer;
            color: var(--accent);
            font-weight: 500;
        }
        .calendario-completo .cal-info .eventos-hoy:hover { text-decoration: underline; }
        
        /* CORCHO */
        .corcho-final {
            background: #c4956a;
            background-image: radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px);
            background-size: 20px 20px;
            border-radius: 16px;
            border: 4px solid #a87b53;
            padding: 12px 14px;
            box-shadow: inset 0 4px 20px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08);
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 150px;
        }
        .corcho-final .corcho-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        .corcho-final .corcho-header h4 {
            margin: 0;
            font-size: 12px;
            color: rgba(255,255,255,0.9);
            font-weight: 600;
            text-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .corcho-final .corcho-header span {
            font-size: 10px;
            color: rgba(255,255,255,0.6);
        }
        .corcho-final .notas-corcho {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            flex: 1;
            align-content: flex-start;
            padding: 4px 0;
            overflow-y: auto;
            min-height: 60px;
        }
        .corcho-final .nota-corcho {
            background: #ffd93d;
            padding: 8px 12px 6px 12px;
            border-radius: 3px 3px 8px 8px;
            font-size: 12px;
            min-width: 60px;
            max-width: 160px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            position: relative;
            transform: rotate(var(--rot, 0deg));
            transition: transform 0.2s, box-shadow 0.2s;
            word-break: break-word;
            cursor: grab;
            user-select: none;
            line-height: 1.3;
        }
        .corcho-final .nota-corcho:active { cursor: grabbing; }
        .corcho-final .nota-corcho:hover {
            transform: scale(1.02) rotate(0deg);
            z-index: 10;
            box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .corcho-final .nota-corcho.dragging {
            opacity: 0.5;
            transform: scale(0.95);
        }
        .corcho-final .nota-corcho::before {
            content: '📌';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .corcho-final .nota-corcho .nota-texto { 
            margin-top: 2px; 
            line-height: 1.3;
            white-space: pre-wrap;
        }
        .corcho-final .nota-corcho .nota-del {
            position: absolute;
            top: -4px;
            right: -4px;
            background: rgba(0,0,0,0.25);
            border: none;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            color: white;
            font-size: 11px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .corcho-final .nota-corcho:hover .nota-del { opacity: 1; }
        .corcho-final .nota-corcho .nota-del:hover { background: rgba(200,0,0,0.6); }
        .corcho-final .nota-vacia {
            width: 100%;
            text-align: center;
            color: rgba(255,255,255,0.6);
            font-size: 13px;
            padding: 20px 0;
        }
        .corcho-final .nota-input-row {
            display: flex;
            gap: 4px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 2px solid rgba(255,255,255,0.15);
        }
        .corcho-final .nota-input-row textarea {
            flex: 1;
            padding: 4px 10px;
            border-radius: 6px;
            border: none;
            background: rgba(255,255,255,0.9);
            color: #2d3748;
            font-size: 11px;
            min-height: 32px;
            max-height: 60px;
            resize: vertical;
            font-family: inherit;
        }
        .corcho-final .nota-input-row textarea:focus { outline: 2px solid rgba(255,255,255,0.4); }
        .corcho-final .nota-input-row .btn-add {
            padding: 4px 14px;
            border-radius: 6px;
            border: none;
            background: rgba(255,255,255,0.9);
            color: #2d3748;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
        }
        .corcho-final .nota-input-row .btn-add:hover { background: white; }
        .corcho-final .nota-colores {
            display: flex;
            gap: 4px;
            margin-top: 4px;
        }
        .corcho-final .nota-colores .c-btn {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.25);
            cursor: pointer;
            transition: all 0.15s;
        }
        .corcho-final .nota-colores .c-btn:hover { transform: scale(1.1); }
        .corcho-final .nota-colores .c-btn.sel { border-color: white; box-shadow: 0 0 10px rgba(255,255,255,0.4); }
        
        /* MODAL CALENDARIO */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
        }
        .modal-overlay.show { display: flex; }
        .modal-calendario {
            background: var(--bg-card);
            border-radius: 20px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            border: 1px solid var(--border);
        }
        .modal-calendario .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        .modal-calendario .modal-header h2 {
            margin: 0;
            font-size: 20px;
        }
        .modal-calendario .modal-header .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0 8px;
        }
        .modal-calendario .modal-header .close-btn:hover { color: var(--text-primary); }
        .modal-calendario .modal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        .modal-calendario .modal-grid .modal-dia-semana {
            font-size: 11px;
            text-align: center;
            font-weight: 700;
            color: var(--text-secondary);
            padding: 6px 0;
        }
        .modal-calendario .modal-grid .modal-dia {
            padding: 8px 4px;
            text-align: center;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.15s;
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        .modal-calendario .modal-grid .modal-dia:hover { background: var(--accent); color: white; }
        .modal-calendario .modal-grid .modal-dia.hoy { background: var(--accent); color: white; font-weight: 700; }
        .modal-calendario .modal-grid .modal-dia.evento { background: #ff6b6b; color: white; }
        .modal-calendario .modal-grid .modal-dia.vacio { background: transparent; cursor: default; }
        .modal-calendario .modal-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .modal-calendario .modal-nav button {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 4px 12px;
            border-radius: 6px;
        }
        .modal-calendario .modal-nav button:hover { background: var(--bg-hover); color: var(--text-primary); }
        .modal-calendario .modal-eventos-dia {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border);
        }
        .modal-calendario .modal-eventos-dia .evento-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
            border-radius: 6px;
            background: var(--bg-hover);
            margin-bottom: 4px;
            font-size: 13px;
        }
        .modal-calendario .modal-eventos-dia .evento-item .del-evento {
            background: none;
            border: none;
            color: #ff6b6b;
            cursor: pointer;
            font-size: 14px;
        }
        .modal-calendario .modal-eventos-dia .evento-item .del-evento:hover { color: #e74c3c; }
        
        @media (max-width: 768px) {
            .dashboard-final {
                grid-template-columns: 1fr;
                height: auto;
                min-height: auto;
            }
            .col-derecha { order: -1; }
            .btn-area-pestana { max-width: 120px; font-size: 12px; padding: 6px 12px; }
            .corcho-final { min-height: 100px; }
        }
    </style>
    
    <div class="dashboard-final">
        
        <!-- COLUMNA IZQUIERDA: ÁREAS -->
        <div class="col-izquierda">
            <div class="areas-pestanas">
                ${ultimaAsignatura ? `
                    <a class="btn-area-pestana continuar" href="${ultimaAsignatura.url || '#'}">
                        <span class="icono">▶</span>
                        <span class="nombre">Continuar</span>
                        <span class="badge">${ultimoProgreso}%</span>
                    </a>
                ` : ''}
                ${areas.map(area => `
                    <a class="btn-area-pestana" href="/estudio/?area=${area.id}" style="border-color: ${colors[area.id] || '#6c757d'};">
                        <span class="icono">${area.icon || '📚'}</span>
                        <span class="nombre">${area.nombre}</span>
                    </a>
                `).join('')}
            </div>
            
            <!-- Espacio para futuros widgets -->
            <div style="flex:1; min-height:50px;"></div>
        </div>
        
        <!-- COLUMNA DERECHA: CALENDARIO + CORCHO -->
        <div class="col-derecha">
            
            <!-- CALENDARIO COMPLETO -->
            <div class="calendario-completo">
                <div class="cal-header">
                    <h4 onclick="abrirCalendarioModal()">
                        <i class="fas fa-calendar-alt"></i> 
                        <span id="calMesTitulo"></span>
                    </h4>
                    <div class="cal-nav">
                        <button onclick="cambiarMesCalendario(-1)">◀</button>
                        <button onclick="cambiarMesCalendario(1)">▶</button>
                        <button onclick="resetearMesCalendario()" style="font-size:11px;">Hoy</button>
                    </div>
                </div>
                <div class="cal-grid" id="calGridFinal"></div>
                <div class="cal-info">
                    <span id="calInfoFecha"></span>
                    <span class="eventos-hoy" id="eventosHoyBtn" onclick="abrirCalendarioModal()">📌 0 eventos hoy</span>
                </div>
            </div>
            
            <!-- CORCHO NOTAS -->
            <div class="corcho-final">
                <div class="corcho-header">
                    <h4><i class="fas fa-thumbtack"></i> Notas</h4>
                    <span>📌 ${notas.length}</span>
                </div>
                <div class="notas-corcho" id="notasCorchoFinal">
                    ${notas.length === 0 ? `<div class="nota-vacia">📌 Pincha una nota</div>` : ''}
                </div>
                <div class="nota-input-row">
                    <textarea id="notaInputFinal" placeholder="Escribe una nota..." rows="1"></textarea>
                    <button class="btn-add" onclick="agregarNotaFinal()">+</button>
                </div>
                <div class="nota-colores" id="notaColoresFinal"></div>
            </div>
            
        </div>
    </div>
    
    <!-- MODAL CALENDARIO -->
    <div class="modal-overlay" id="modalCalendario">
        <div class="modal-calendario">
            <div class="modal-header">
                <h2 id="modalTitulo">📅 Calendario</h2>
                <button class="close-btn" onclick="cerrarCalendarioModal()">✕</button>
            </div>
            <div class="modal-nav">
                <button onclick="cambiarMesModal(-1)">◀</button>
                <span id="modalMesTitulo" style="font-weight:600; font-size:16px;"></span>
                <button onclick="cambiarMesModal(1)">▶</button>
            </div>
            <div class="modal-grid" id="modalGrid"></div>
            <div class="modal-eventos-dia" id="modalEventosDia">
                <p style="color:var(--text-secondary); font-size:13px;">Selecciona un día para ver eventos</p>
            </div>
        </div>
    </div>
    `;
    
    main.innerHTML = html;
    
    // Estado del calendario
    window._mesCalendario = new Date().getMonth();
    window._añoCalendario = new Date().getFullYear();
    window._fechaSeleccionada = null;
    
    inicializarCalendarioFinal();
    inicializarNotasFinal();
    inicializarDragNotas();
}

// ============================================================
// CALENDARIO COMPLETO
// ============================================================

function inicializarCalendarioFinal() {
    const grid = document.getElementById('calGridFinal');
    if (!grid) return;
    
    const hoy = new Date();
    const mes = window._mesCalendario;
    const año = window._añoCalendario;
    const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    
    let html = diasSemana.map(d => `<div class="cal-dia-semana">${d}</div>`).join('');
    
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
        
        html += `<div class="${clase}" onclick="seleccionarDiaCalendario(${d}, ${mes+1}, ${año})">
            ${d}
            ${tieneEvento ? '<span class="punto"></span>' : ''}
        </div>`;
    }
    grid.innerHTML = html;
    
    // Actualizar títulos
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const titulo = document.getElementById('calMesTitulo');
    if (titulo) titulo.textContent = `${meses[mes]} ${año}`;
    
    const infoFecha = document.getElementById('calInfoFecha');
    if (infoFecha) {
        infoFecha.textContent = `${meses[mes]} ${año}`;
    }
    
    actualizarEventosHoy();
}

function cambiarMesCalendario(delta) {
    window._mesCalendario += delta;
    if (window._mesCalendario < 0) {
        window._mesCalendario = 11;
        window._añoCalendario--;
    } else if (window._mesCalendario > 11) {
        window._mesCalendario = 0;
        window._añoCalendario++;
    }
    inicializarCalendarioFinal();
}

function resetearMesCalendario() {
    const hoy = new Date();
    window._mesCalendario = hoy.getMonth();
    window._añoCalendario = hoy.getFullYear();
    inicializarCalendarioFinal();
}

function seleccionarDiaCalendario(dia, mes, año) {
    const fecha = año + '-' + String(mes).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
    window._fechaSeleccionada = fecha;
    abrirCalendarioModal();
}

function actualizarEventosHoy() {
    const hoy = new Date();
    const key = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const hoyEventos = eventos.filter(e => e.fecha === key);
    const el = document.getElementById('eventosHoyBtn');
    if (el) el.textContent = `📌 ${hoyEventos.length} eventos hoy`;
}

// ============================================================
// MODAL CALENDARIO
// ============================================================

let _modalMes = new Date().getMonth();
let _modalAño = new Date().getFullYear();

function abrirCalendarioModal() {
    document.getElementById('modalCalendario').classList.add('show');
    _modalMes = window._mesCalendario;
    _modalAño = window._añoCalendario;
    renderizarModal();
}

function cerrarCalendarioModal() {
    document.getElementById('modalCalendario').classList.remove('show');
}

function cambiarMesModal(delta) {
    _modalMes += delta;
    if (_modalMes < 0) { _modalMes = 11; _modalAño--; }
    else if (_modalMes > 11) { _modalMes = 0; _modalAño++; }
    renderizarModal();
}

function renderizarModal() {
    const grid = document.getElementById('modalGrid');
    const titulo = document.getElementById('modalMesTitulo');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    titulo.textContent = `${meses[_modalMes]} ${_modalAño}`;
    
    const diasSemana = ['L','M','X','J','V','S','D'];
    let html = diasSemana.map(d => `<div class="modal-dia-semana">${d}</div>`).join('');
    
    const primerDia = new Date(_modalAño, _modalMes, 1).getDay();
    const diasAntes = primerDia === 0 ? 6 : primerDia - 1;
    const diasEnMes = new Date(_modalAño, _modalMes + 1, 0).getDate();
    const hoy = new Date();
    const hoyNum = hoy.getDate();
    const hoyMes = hoy.getMonth();
    const hoyAño = hoy.getFullYear();
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    
    for (let i = 0; i < diasAntes; i++) {
        html += `<div class="modal-dia vacio"></div>`;
    }
    for (let d = 1; d <= diasEnMes; d++) {
        const esHoy = (d === hoyNum && _modalMes === hoyMes && _modalAño === hoyAño);
        const key = _modalAño + '-' + String(_modalMes+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        const tieneEvento = eventos.some(e => e.fecha === key);
        let clase = 'modal-dia';
        if (esHoy) clase += ' hoy';
        if (tieneEvento) clase += ' evento';
        html += `<div class="${clase}" onclick="seleccionarDiaModal(${d})">${d}</div>`;
    }
    grid.innerHTML = html;
    
    // Si hay fecha seleccionada, mostrar eventos
    if (window._fechaSeleccionada) {
        mostrarEventosDia(window._fechaSeleccionada);
    } else {
        const hoyKey = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
        mostrarEventosDia(hoyKey);
    }
}

function seleccionarDiaModal(dia) {
    const key = _modalAño + '-' + String(_modalMes+1).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
    window._fechaSeleccionada = key;
    mostrarEventosDia(key);
}

function mostrarEventosDia(fecha) {
    const container = document.getElementById('modalEventosDia');
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const diaEventos = eventos.filter(e => e.fecha === fecha);
    
    if (diaEventos.length === 0) {
        container.innerHTML = `
            <p style="color:var(--text-secondary); font-size:13px;">📅 No hay eventos este día</p>
            <button onclick="agregarEventoFecha('${fecha}')" style="padding:4px 12px; border-radius:6px; border:1px solid var(--border); background:transparent; cursor:pointer; font-size:12px; color:var(--text-secondary);">
                + Añadir evento
            </button>
        `;
        return;
    }
    
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:600; font-size:14px;">📌 ${diaEventos.length} eventos</span>
        <button onclick="agregarEventoFecha('${fecha}')" style="padding:4px 12px; border-radius:6px; border:1px solid var(--border); background:transparent; cursor:pointer; font-size:12px;">+ Añadir</button>
    </div>`;
    diaEventos.forEach((e, i) => {
        html += `<div class="evento-item">
            <span>${e.titulo}</span>
            <button class="del-evento" onclick="eliminarEvento(${i}, '${fecha}')">✕</button>
        </div>`;
    });
    container.innerHTML = html;
}

function agregarEventoFecha(fecha) {
    const titulo = prompt('📌 Título del evento:');
    if (!titulo) return;
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    eventos.push({ titulo, fecha });
    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));
    renderizarModal();
    inicializarCalendarioFinal();
    actualizarEventosHoy();
}

function eliminarEvento(index, fecha) {
    let eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    eventos = eventos.filter((e, i) => !(i === index && e.fecha === fecha));
    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));
    renderizarModal();
    inicializarCalendarioFinal();
    actualizarEventosHoy();
}

// ============================================================
// NOTAS CON ARRASTRE
// ============================================================

let colorNotaFinal = '#ffd93d';
let notaArrastrando = null;
let offsetX, offsetY;

function inicializarNotasFinal() {
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    const container = document.getElementById('notasCorchoFinal');
    if (!container) return;
    
    const colores = ['#ffd93d', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#dda0dd', '#ff9ff3', '#feca57'];
    
    if (notas.length === 0) {
        container.innerHTML = '<div class="nota-vacia">📌 Pincha una nota</div>';
    } else {
        container.innerHTML = notas.map((n, i) => `
            <div class="nota-corcho" style="background:${n.color || '#ffd93d'}; --rot: ${(Math.random() - 0.5) * 4}deg;" data-index="${i}">
                <button class="nota-del" onclick="eliminarNotaFinal(${i})">✕</button>
                <div class="nota-texto">${n.texto}</div>
            </div>
        `).join('');
    }
    
    const colorContainer = document.getElementById('notaColoresFinal');
    if (colorContainer) {
        colorContainer.innerHTML = colores.map(c => `
            <button class="c-btn ${c === colorNotaFinal ? 'sel' : ''}" onclick="seleccionarColorFinal('${c}')" style="background:${c};"></button>
        `).join('');
    }
    
    inicializarDragNotas();
}

function inicializarDragNotas() {
    const notas = document.querySelectorAll('.nota-corcho');
    const container = document.getElementById('notasCorchoFinal');
    if (!container) return;
    
    notas.forEach(nota => {
        nota.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('nota-del')) return;
            iniciarArrastre(e, this, container);
        });
        nota.addEventListener('touchstart', function(e) {
            if (e.target.classList.contains('nota-del')) return;
            const touch = e.touches[0];
            const me = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            iniciarArrastre(me, this, container);
        }, { passive: true });
    });
}

function iniciarArrastre(e, nota, container) {
    const rect = nota.getBoundingClientRect();
    notaArrastrando = nota;
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    nota.style.position = 'fixed';
    nota.style.zIndex = '999';
    nota.style.width = rect.width + 'px';
    nota.classList.add('dragging');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
}

function onMouseMove(e) {
    if (!notaArrastrando) return;
    notaArrastrando.style.left = (e.clientX - offsetX) + 'px';
    notaArrastrando.style.top = (e.clientY - offsetY) + 'px';
}

function onMouseUp() {
    if (!notaArrastrando) return;
    notaArrastrando.classList.remove('dragging');
    notaArrastrando.style.position = '';
    notaArrastrando.style.left = '';
    notaArrastrando.style.top = '';
    notaArrastrando.style.zIndex = '';
    notaArrastrando.style.width = '';
    notaArrastrando = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

function onTouchMove(e) {
    e.preventDefault();
    if (!notaArrastrando) return;
    const touch = e.touches[0];
    notaArrastrando.style.left = (touch.clientX - offsetX) + 'px';
    notaArrastrando.style.top = (touch.clientY - offsetY) + 'px';
}

function onTouchEnd() {
    if (!notaArrastrando) return;
    notaArrastrando.classList.remove('dragging');
    notaArrastrando.style.position = '';
    notaArrastrando.style.left = '';
    notaArrastrando.style.top = '';
    notaArrastrando.style.zIndex = '';
    notaArrastrando.style.width = '';
    notaArrastrando = null;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
}

function seleccionarColorFinal(color) {
    colorNotaFinal = color;
    document.querySelectorAll('#notaColoresFinal .c-btn').forEach(b => {
        b.classList.toggle('sel', b.style.background === color);
    });
}

function agregarNotaFinal() {
    const input = document.getElementById('notaInputFinal');
    const texto = input.value.trim();
    if (!texto) return;
    
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    notas.push({
        texto: texto,
        color: colorNotaFinal || '#ffd93d',
        fecha: new Date().toLocaleDateString()
    });
    localStorage.setItem('tablero_notas', JSON.stringify(notas));
    input.value = '';
    input.style.height = 'auto';
    inicializarNotasFinal();
}

function eliminarNotaFinal(index) {
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    notas.splice(index, 1);
    localStorage.setItem('tablero_notas', JSON.stringify(notas));
    inicializarNotasFinal();
}

// Autoajuste del textarea
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'notaInputFinal') {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    }
});

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

// Exponer funciones globales
window.cargarVista = cargarVista;
window.navegar = navegar;
window.toggleAprobada = toggleAprobada;
window.agregarNotaFinal = agregarNotaFinal;
window.eliminarNotaFinal = eliminarNotaFinal;
window.seleccionarColorFinal = seleccionarColorFinal;
window.cambiarMesCalendario = cambiarMesCalendario;
window.resetearMesCalendario = resetearMesCalendario;
window.seleccionarDiaCalendario = seleccionarDiaCalendario;
window.abrirCalendarioModal = abrirCalendarioModal;
window.cerrarCalendarioModal = cerrarCalendarioModal;
window.cambiarMesModal = cambiarMesModal;
window.seleccionarDiaModal = seleccionarDiaModal;
window.agregarEventoFecha = agregarEventoFecha;
window.eliminarEvento = eliminarEvento;
