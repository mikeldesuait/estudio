// ============================================================
// ESTUDIO PERSONAL - ESCRITORIO LIBRE v3
// - Modo mover ON/OFF (arreglado: destruye y recrea interact)
// - URLs de áreas correctas
// - Calendario con consulta/edición
// ============================================================

let areas = [];
let asignaturasCache = {};
let estado = { nivel: 'areas', areaId: '', cursoId: '', semestreId: '', asignaturaId: '', temaId: '' };
let modoMover = false;

document.addEventListener('DOMContentLoaded', () => {
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
            .then(r => r.json())
            .then(data => {
                areas.push({ id: item.id, path: item.path, ...data });
                cargadas++;
                if (cargadas === listaAreas.length) {
                    if (!cargarEstadoDesdeURL()) cargarVista('dashboard');
                }
            })
            .catch(() => {
                cargadas++;
                if (cargadas === listaAreas.length) cargarVista('dashboard');
            });
    });
}

function cargarAsignaturas(areaId) {
    return new Promise((resolve) => {
        if (asignaturasCache[areaId]) return resolve(asignaturasCache[areaId]);
        const area = areas.find(a => a.id === areaId);
        if (!area) return resolve([]);
        fetch(area.path + 'asignaturas.json')
            .then(r => r.json())
            .then(data => {
                asignaturasCache[areaId] = data.asignaturas || [];
                resolve(asignaturasCache[areaId]);
            })
            .catch(() => resolve([]));
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
function esMatriculada(a) { return a.matriculada === true; }

function cargarEstadoDesdeURL() {
    const p = new URLSearchParams(window.location.search);
    const nivel = p.get('nivel');
    if (nivel) {
        // Si la URL tiene # o nivel=areas sin contenido, ir al dashboard
        if (window.location.hash === '#' || (nivel === 'areas' && !p.get('area'))) {
            window.history.pushState({}, '', '/estudio/');
            cargarVista('dashboard');
            return true;
        }
        estado.nivel = nivel;
        estado.areaId = p.get('area') || '';
        estado.cursoId = p.get('curso') || '';
        estado.semestreId = p.get('semestre') || '';
        estado.asignaturaId = p.get('asignatura') || '';
        estado.temaId = p.get('tema') || '';
        cargarVista('estudio');
        return true;
    }
    return false;
}

function cargarVista(vista) {
    if (vista === 'dashboard') {
        window.history.pushState({}, '', '/estudio/');
    }
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(l => {
        const t = l.textContent.toLowerCase();
        if ((vista === 'dashboard' && t.includes('escritorio')) ||
            (vista === 'estudio' && t.includes('área')) ||
            (vista === 'configuracion' && t.includes('progreso'))) {
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
    window.history.pushState({}, '', window.location.pathname + '?' + params.toString());
    cargarVista('estudio');
}

// ============================================================
// DASHBOARD - ESCRITORIO LIBRE
// ============================================================

function mostrarDashboard(main) {
    let elementos = JSON.parse(localStorage.getItem('escritorio_elementos') || 'null');
    if (!elementos) {
        elementos = {
            areas: areas.map((a, i) => ({
                id: 'area-' + a.id,
                tipo: 'area',
                areaId: a.id,
                x: 20 + (i % 4) * 170,
                y: 20,
                w: 160,
                h: 50
            })),
            calendario: {
                id: 'calendario',
                tipo: 'calendario',
                x: Math.max(20, window.innerWidth - 440),
                y: 20,
                w: 420,
                h: 340,
                vista: 'semana'
            },
            notas: []
        };
        localStorage.setItem('escritorio_elementos', JSON.stringify(elementos));
    }
    
    window._escritorio = elementos;
    window._areas = areas;
    window._colors = {
        'grado-derecho': '#3b82f6',
        'pnl': '#9b59b6',
        'herramientas': '#8b5cf6',
        'networking': '#00b4d8'
    };
    
    let html = `
    <style>
        #mainContent.container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            height: calc(100vh - 130px);
            overflow: hidden;
        }
        
        .escritorio {
            position: relative;
            width: 100%;
            height: 100%;
            background: #c4956a;
            background-image: 
                radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px),
                radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 24px 24px, 48px 48px;
            background-position: 0 0, 12px 12px;
            overflow: auto;
            user-select: none;
            box-shadow: inset 0 0 100px rgba(0,0,0,0.1);
        }
        
        .elemento-flotante {
            position: absolute;
            touch-action: none;
            user-select: none;
            z-index: 10;
        }
        .elemento-flotante.dragging { z-index: 1000; }
        .elemento-flotante.resizing { z-index: 1001; }
        
        /* Modo mover ON - permite arrastrar */
        body.modo-mover .elemento-flotante { cursor: grab; }
        body.modo-mover .elemento-flotante.dragging { cursor: grabbing; }
        body.modo-mover .elem-area { pointer-events: auto; cursor: grab; }
        body.modo-mover .elem-nota .nota-texto { pointer-events: none; }
        
        /* Modo mover OFF - permite editar e interactuar */
        body:not(.modo-mover) .elem-area { cursor: pointer; }
        body:not(.modo-mover) .elem-nota .nota-texto { cursor: text; pointer-events: auto; }
        
        /* Botón de área */
        .elem-area {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 10px;
            background: var(--bg-card);
            border: 2px solid var(--border);
            font-weight: 600;
            font-size: 13px;
            color: var(--text-primary);
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.15s, box-shadow 0.15s;
            white-space: nowrap;
            overflow: hidden;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
        }
        body:not(.modo-mover) .elem-area:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            background: var(--accent);
            color: white;
        }
        
        /* Calendario */
        .elem-calendario {
            background: var(--bg-card);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid var(--border);
            height: 100%;
            width: 100%;
            box-sizing: border-box;
        }
        .elem-calendario .cal-header {
            padding: 6px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-hover);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
        }
        body.modo-mover .elem-calendario .cal-header { cursor: grab; }
        .elem-calendario .cal-titulo {
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .elem-calendario .cal-nav {
            display: flex;
            gap: 2px;
        }
        .elem-calendario .cal-nav button {
            background: none;
            border: none;
            padding: 2px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        .elem-calendario .cal-nav button:hover { background: var(--bg-card); color: var(--text-primary); }
        .elem-calendario .cal-nav .vista-btn.active { background: var(--accent); color: white; }
        .elem-calendario .cal-body {
            flex: 1;
            padding: 6px 10px;
            overflow-y: auto;
        }
        
        .cal-grid {
            display: grid;
            gap: 2px;
        }
        .cal-grid .cal-dia-semana {
            font-size: 9px;
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
            min-height: 26px;
            padding: 2px;
        }
        .cal-grid .cal-dia:hover { background: var(--accent); color: white; transform: scale(1.05); }
        .cal-grid .cal-dia.hoy { background: var(--accent); color: white; font-weight: 700; }
        .cal-grid .cal-dia.estudio { background: #4ecdc4; color: white; }
        .cal-grid .cal-dia.evento { background: #ff6b6b; color: white; }
        .cal-grid .cal-dia.vacio { background: transparent; cursor: default; }
        .cal-grid .cal-dia .punto {
            position: absolute;
            bottom: 2px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: rgba(255,255,255,0.8);
        }
        
        .cal-dia-detalle {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .cal-dia-detalle .fecha-grande {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 6px;
            text-align: center;
        }
        .cal-dia-detalle .evento-item {
            background: var(--bg-hover);
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }
        .cal-dia-detalle .evento-item .info { flex: 1; min-width: 0; }
        .cal-dia-detalle .evento-item .titulo { font-weight: 600; word-break: break-word; }
        .cal-dia-detalle .evento-item .hora { font-size: 10px; color: var(--text-secondary); }
        .cal-dia-detalle .evento-item .desc { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
        .cal-dia-detalle .evento-item .btn-del-evento {
            background: none;
            border: none;
            color: #ff6b6b;
            cursor: pointer;
            font-size: 14px;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .cal-dia-detalle .evento-item .btn-del-evento:hover { background: rgba(255,0,0,0.1); }
        .cal-dia-detalle .btn-add-evento {
            background: var(--accent);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 6px;
        }
        
        /* Nota */
        .elem-nota {
            background: #ffd93d;
            border-radius: 3px 3px 8px 8px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1);
            padding: 12px 14px 10px 14px;
            font-size: 13px;
            color: #2d3748;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
        }
        .elem-nota::before {
            content: '📌';
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 20px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            pointer-events: none;
        }
        .elem-nota .nota-texto {
            flex: 1;
            word-break: break-word;
            white-space: pre-wrap;
            overflow-y: auto;
            line-height: 1.4;
            margin-top: 4px;
            outline: none;
            padding: 4px;
        }
        .elem-nota .nota-texto:focus {
            background: rgba(255,255,255,0.4);
            border-radius: 4px;
        }
        .elem-nota .nota-del {
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0,0,0,0.15);
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            color: rgba(0,0,0,0.6);
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 5;
        }
        .elem-nota:hover .nota-del { opacity: 1; }
        .elem-nota .nota-del:hover { background: rgba(200,0,0,0.3); color: white; }
        
        /* Barra inferior */
        .widgets-bar {
            position: fixed;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            border-radius: 16px;
            border: 1px solid var(--border);
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            padding: 8px 12px;
            display: flex;
            gap: 6px;
            z-index: 500;
            align-items: center;
        }
        .widgets-bar .bar-label {
            font-size: 11px;
            color: var(--text-secondary);
            font-weight: 600;
            padding: 0 8px;
            border-right: 1px solid var(--border);
            margin-right: 4px;
        }
        .widgets-bar button {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .widgets-bar button:hover {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
        }
        .widgets-bar button.modo-mover-activo {
            background: #10b981;
            color: white;
            border-color: #10b981;
        }
        .widgets-bar button.modo-mover-activo:hover {
            background: #059669;
        }
        
        /* Modal evento */
        .modal-evento-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
        }
        .modal-evento-overlay.show { display: flex; }
        .modal-evento {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 24px;
            width: 90%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-height: 85vh;
            overflow-y: auto;
        }
        .modal-evento h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-evento h3 .close {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 20px;
            color: var(--text-secondary);
        }
        .modal-evento h3 .close:hover { color: var(--text-primary); }
        .modal-evento label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 4px;
            margin-top: 12px;
        }
        .modal-evento input, .modal-evento textarea {
            width: 100%;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--bg-input);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 14px;
            box-sizing: border-box;
        }
        .modal-evento input:focus, .modal-evento textarea:focus {
            outline: none;
            border-color: var(--accent);
        }
        .modal-evento .acciones {
            display: flex;
            gap: 8px;
            margin-top: 16px;
            justify-content: flex-end;
        }
        .modal-evento .acciones button {
            padding: 8px 16px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
        }
        .modal-evento .btn-cancelar { background: var(--bg-hover); color: var(--text-primary); }
        .modal-evento .btn-guardar { background: var(--accent); color: white; }
        .modal-evento .btn-eliminar { background: #ef4444; color: white; margin-right: auto; }
        
        .eventos-dia-lista {
            margin-top: 12px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        @media (max-width: 768px) {
            #mainContent.container { height: calc(100vh - 110px); }
            .widgets-bar { bottom: 60px; font-size: 11px; flex-wrap: wrap; max-width: 95vw; }
            .widgets-bar .bar-label { display: none; }
            .widgets-bar button { padding: 5px 8px; font-size: 11px; }
        }
    </style>
    
    <div class="escritorio" id="escritorio"></div>
    
    <div class="widgets-bar">
        <span class="bar-label">➕ Añadir:</span>
        <button onclick="añadirNota()"><i class="fas fa-sticky-note"></i> Nota</button>
        <button onclick="abrirModalEvento()"><i class="fas fa-calendar-plus"></i> Evento</button>
        <button onclick="resetEscritorio()"><i class="fas fa-undo"></i> Reset</button>
        <button id="btnModoMover" onclick="toggleModoMover()"><i class="fas fa-arrows-alt"></i> Mover: OFF</button>
    </div>
    
    <div class="modal-evento-overlay" id="modalEvento">
        <div class="modal-evento">
            <h3>
                <span id="modalEventoTitulo">📅 Evento</span>
                <button class="close" onclick="cerrarModalEvento()">✕</button>
            </h3>
            <div id="eventosExistentesContainer"></div>
            <div id="formEventoContainer">
                <input type="hidden" id="eventoId" />
                <label>Fecha</label>
                <input type="date" id="eventoFecha" />
                <label>Hora (opcional)</label>
                <input type="time" id="eventoHora" />
                <label>Título</label>
                <input type="text" id="eventoTitulo" placeholder="Ej: Examen de Derecho" />
                <label>Descripción (opcional)</label>
                <textarea id="eventoDesc" rows="2" placeholder="Detalles..."></textarea>
                <div class="acciones">
                    <button class="btn-eliminar" id="btnEliminarEvento" onclick="eliminarEventoActual()" style="display:none;">🗑️ Eliminar</button>
                    <button class="btn-cancelar" onclick="cerrarModalEvento()">Cancelar</button>
                    <button class="btn-guardar" onclick="guardarEvento()">Guardar</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    main.innerHTML = html;
    renderizarEscritorio();
    
    // Aplicar estado del modo mover
    actualizarBotonModoMover();
}

// ============================================================
// MODO MOVER
// ============================================================

function toggleModoMover() {
    modoMover = !modoMover;
    
    if (modoMover) {
        document.body.classList.add('modo-mover');
    } else {
        document.body.classList.remove('modo-mover');
    }
    
    actualizarBotonModoMover();
    // Re-renderizar para aplicar/quitar interact
    renderizarEscritorio();
}

function actualizarBotonModoMover() {
    const btn = document.getElementById('btnModoMover');
    if (!btn) return;
    if (modoMover) {
        btn.classList.add('modo-mover-activo');
        btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Mover: ON';
    } else {
        btn.classList.remove('modo-mover-activo');
        btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Mover: OFF';
    }
}

// ============================================================
// RENDERIZAR ELEMENTOS
// ============================================================

function renderizarEscritorio() {
    const escritorio = document.getElementById('escritorio');
    if (!escritorio) return;
    escritorio.innerHTML = '';
    
    const elementos = window._escritorio;
    const colors = window._colors || {};
    
    // Botones de áreas
    (elementos.areas || []).forEach(elem => {
        const area = areas.find(a => a.id === elem.areaId);
        if (!area) return;
        
        const div = document.createElement('a');
        div.className = 'elemento-flotante elem-area';
        div.id = elem.id;
        // URL CORRECTA con nivel y area
        const areasConCursos = ['grado-derecho'];
        if (areasConCursos.includes(area.id)) {
            div.href = '/estudio/?nivel=cursos&area=' + area.id;
        } else {
            div.href = '/estudio/?nivel=asignaturas&area=' + area.id + '&curso=0&semestre=0';
        }
        div.style.left = elem.x + 'px';
        div.style.top = elem.y + 'px';
        div.style.width = elem.w + 'px';
        div.style.height = elem.h + 'px';
        div.style.borderColor = colors[area.id] || '#6c757d';
        div.innerHTML = `<span style="font-size:16px;pointer-events:none;">${area.icon || '📚'}</span> <span style="pointer-events:none;">${area.nombre}</span>`;
        
        // Si está modo mover, bloquear el clic para poder arrastrar
        div.addEventListener('click', (e) => {
            if (modoMover) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        escritorio.appendChild(div);
        
        // Solo activar interact si modo mover está ON
        if (modoMover) {
            hacerArrastrable(div, elem);
        }
    });
    
    // Calendario
    if (elementos.calendario) {
        const elem = elementos.calendario;
        const div = document.createElement('div');
        div.className = 'elemento-flotante elem-calendario';
        div.id = elem.id;
        div.style.left = elem.x + 'px';
        div.style.top = elem.y + 'px';
        div.style.width = elem.w + 'px';
        div.style.height = elem.h + 'px';
        div.innerHTML = renderCalendarioHTML(elem.vista || 'semana');
        
        escritorio.appendChild(div);
        
        if (modoMover) {
            hacerArrastrable(div, elem);
        }
    }
    
    // Notas
    (elementos.notas || []).forEach(elem => {
        const div = document.createElement('div');
        div.className = 'elemento-flotante elem-nota';
        div.id = elem.id;
        div.style.left = elem.x + 'px';
        div.style.top = elem.y + 'px';
        div.style.width = elem.w + 'px';
        div.style.height = elem.h + 'px';
        div.style.background = elem.color || '#ffd93d';
        div.innerHTML = `
            <button class="nota-del" onclick="eliminarNota('${elem.id}')">✕</button>
            <div class="nota-texto" contenteditable="${modoMover ? 'false' : 'true'}" spellcheck="false">${elem.texto || ''}</div>
        `;
        
        const textoDiv = div.querySelector('.nota-texto');
        textoDiv.addEventListener('blur', () => {
            if (!modoMover) {
                guardarTextoNota(elem.id, textoDiv.textContent);
            }
        });
        
        escritorio.appendChild(div);
        
        if (modoMover) {
            hacerArrastrable(div, elem);
        }
    });
}

// ============================================================
// CALENDARIO HTML
// ============================================================

function renderCalendarioHTML(vista) {
    const hoy = new Date();
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const diasSemanaLargo = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const diasSemanaCorto = ['L','M','X','J','V','S','D'];
    
    let cuerpo = '';
    
    if (vista === 'dia') {
        const key = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
        const diaEventos = eventos.filter(e => e.fecha === key).sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
        cuerpo = `
            <div class="cal-dia-detalle">
                <div class="fecha-grande">${diasSemanaLargo[hoy.getDay() === 0 ? 6 : hoy.getDay()-1]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]}</div>
                ${diaEventos.length === 0 ? '<p style="text-align:center;color:var(--text-secondary);font-size:12px;">Sin eventos</p>' : ''}
                ${diaEventos.map(e => `
                    <div class="evento-item">
                        <div class="info">
                            <div class="titulo">${e.titulo}</div>
                            ${e.hora ? `<div class="hora">⏰ ${e.hora}</div>` : ''}
                            ${e.desc ? `<div class="desc">${e.desc}</div>` : ''}
                        </div>
                        <button class="btn-del-evento" onclick="eliminarEventoPorId('${e.id}')">🗑️</button>
                    </div>
                `).join('')}
                <button class="btn-add-evento" onclick="abrirModalEvento('${key}')">+ Añadir evento</button>
            </div>
        `;
    } else if (vista === 'semana') {
        const diaSemana = hoy.getDay();
        const diff = diaSemana === 0 ? 6 : diaSemana - 1;
        const inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - diff);
        
        let grid = '<div class="cal-grid" style="grid-template-columns: repeat(7, 1fr);">';
        diasSemanaCorto.forEach(d => grid += `<div class="cal-dia-semana">${d}</div>`);
        
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(inicio);
            fecha.setDate(inicio.getDate() + i);
            const dia = fecha.getDate();
            const mesNum = fecha.getMonth() + 1;
            const añoNum = fecha.getFullYear();
            const key = añoNum + '-' + String(mesNum).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
            const esHoy = fecha.toDateString() === hoy.toDateString();
            const tieneEvento = eventos.some(e => e.fecha === key);
            let clase = 'cal-dia';
            if (esHoy) clase += ' hoy';
            if (tieneEvento) clase += ' evento';
            grid += `<div class="${clase}" onclick="abrirDiaCalendario('${key}')" style="min-height:48px;">
                <div style="font-weight:700;">${dia}</div>
                <div style="font-size:9px;opacity:0.7;">${meses[mesNum-1].substring(0,3)}</div>
                ${tieneEvento ? '<div class="punto"></div>' : ''}
            </div>`;
        }
        grid += '</div>';
        cuerpo = grid;
    } else {
        const año = hoy.getFullYear();
        const mes = hoy.getMonth();
        const primerDia = new Date(año, mes, 1).getDay();
        const diasAntes = primerDia === 0 ? 6 : primerDia - 1;
        const diasEnMes = new Date(año, mes + 1, 0).getDate();
        const hoyNum = hoy.getDate();
        const hoyMes = hoy.getMonth();
        const hoyAño = hoy.getFullYear();
        
        let grid = '<div class="cal-grid" style="grid-template-columns: repeat(7, 1fr);">';
        diasSemanaCorto.forEach(d => grid += `<div class="cal-dia-semana">${d}</div>`);
        
        for (let i = 0; i < diasAntes; i++) grid += `<div class="cal-dia vacio"></div>`;
        
        for (let d = 1; d <= diasEnMes; d++) {
            const esHoy = (d === hoyNum && mes === hoyMes && año === hoyAño);
            const key = año + '-' + String(mes+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
            const tieneEvento = eventos.some(e => e.fecha === key);
            let clase = 'cal-dia';
            if (esHoy) clase += ' hoy';
            if (tieneEvento) clase += ' evento';
            grid += `<div class="${clase}" onclick="abrirDiaCalendario('${key}')">${d}</div>`;
        }
        grid += '</div>';
        cuerpo = grid;
    }
    
    return `
        <div class="cal-header">
            <span class="cal-titulo">
                <i class="fas fa-calendar-alt"></i> ${vista === 'dia' ? 'Hoy' : meses[hoy.getMonth()].substring(0,3) + ' ' + hoy.getFullYear()}
            </span>
            <div class="cal-nav">
                <button onclick="cambiarVista('dia')" class="vista-btn ${vista === 'dia' ? 'active' : ''}">Día</button>
                <button onclick="cambiarVista('semana')" class="vista-btn ${vista === 'semana' ? 'active' : ''}">Sem</button>
                <button onclick="cambiarVista('mes')" class="vista-btn ${vista === 'mes' ? 'active' : ''}">Mes</button>
            </div>
        </div>
        <div class="cal-body">${cuerpo}</div>
    `;
}

function cambiarVista(vista) {
    const elementos = window._escritorio;
    if (!elementos.calendario) return;
    elementos.calendario.vista = vista;
    localStorage.setItem('escritorio_elementos', JSON.stringify(elementos));
    
    const cal = document.getElementById('calendario');
    if (cal) {
        cal.innerHTML = renderCalendarioHTML(vista);
    }
}

// ============================================================
// MODAL EVENTO
// ============================================================

let _fechaEventoActual = null;

function abrirModalEvento(fecha) {
    _fechaEventoActual = fecha || null;
    
    const hoy = new Date();
    const fechaInput = document.getElementById('eventoFecha');
    if (fecha && typeof fecha === 'string' && fecha.includes('-')) {
        fechaInput.value = fecha;
    } else {
        fechaInput.value = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
    }
    
    document.getElementById('eventoId').value = '';
    document.getElementById('eventoTitulo').value = '';
    document.getElementById('eventoHora').value = '';
    document.getElementById('eventoDesc').value = '';
    document.getElementById('btnEliminarEvento').style.display = 'none';
    
    mostrarEventosExistentes(fechaInput.value);
    
    document.getElementById('modalEventoTitulo').textContent = '📅 Evento';
    document.getElementById('modalEvento').classList.add('show');
    
    fechaInput.onchange = () => {
        mostrarEventosExistentes(fechaInput.value);
    };
    
    setTimeout(() => document.getElementById('eventoTitulo').focus(), 100);
}

function mostrarEventosExistentes(fecha) {
    const container = document.getElementById('eventosExistentesContainer');
    if (!container) return;
    
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const delDia = eventos.filter(e => e.fecha === fecha).sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
    
    if (delDia.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <label style="margin-top:0;">📌 Eventos existentes (${delDia.length}):</label>
        <div class="eventos-dia-lista">
            ${delDia.map(e => `
                <div style="background:var(--bg-hover);padding:8px;border-radius:6px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:13px;">${e.titulo}</div>
                        ${e.hora ? `<div style="font-size:11px;color:var(--text-secondary);">⏰ ${e.hora}</div>` : ''}
                        ${e.desc ? `<div style="font-size:11px;color:var(--text-secondary);">${e.desc}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:4px;">
                        <button onclick="editarEvento('${e.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:4px;" title="Editar">✏️</button>
                        <button onclick="eliminarEventoPorId('${e.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:4px;color:#ff6b6b;" title="Eliminar">🗑️</button>
                    </div>
                </div>
            `).join('')}
        </div>
        <hr style="margin:12px 0;border:none;border-top:1px solid var(--border);" />
    `;
}

function editarEvento(id) {
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const evento = eventos.find(e => e.id === id);
    if (!evento) return;
    
    document.getElementById('eventoId').value = evento.id;
    document.getElementById('eventoFecha').value = evento.fecha;
    document.getElementById('eventoHora').value = evento.hora || '';
    document.getElementById('eventoTitulo').value = evento.titulo;
    document.getElementById('eventoDesc').value = evento.desc || '';
    document.getElementById('btnEliminarEvento').style.display = 'inline-block';
    document.getElementById('modalEventoTitulo').textContent = '✏️ Editar evento';
    document.getElementById('eventoTitulo').focus();
}

function cerrarModalEvento() {
    document.getElementById('modalEvento').classList.remove('show');
}

function guardarEvento() {
    const id = document.getElementById('eventoId').value;
    const fecha = document.getElementById('eventoFecha').value;
    const hora = document.getElementById('eventoHora').value;
    const titulo = document.getElementById('eventoTitulo').value.trim();
    const desc = document.getElementById('eventoDesc').value.trim();
    
    if (!fecha || !titulo) {
        alert('Por favor, rellena al menos la fecha y el título');
        return;
    }
    
    let eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    
    if (id) {
        const idx = eventos.findIndex(e => e.id === id);
        if (idx >= 0) {
            eventos[idx] = { ...eventos[idx], fecha, hora, titulo, desc };
        }
    } else {
        eventos.push({ id: 'ev-' + Date.now(), fecha, hora, titulo, desc });
    }
    
    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));
    
    cerrarModalEvento();
    refrescarCalendario();
}

function eliminarEventoActual() {
    const id = document.getElementById('eventoId').value;
    if (!id) return;
    if (!confirm('¿Eliminar este evento?')) return;
    eliminarEventoPorId(id);
    cerrarModalEvento();
}

function eliminarEventoPorId(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    let eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    eventos = eventos.filter(e => e.id !== id);
    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));
    refrescarCalendario();
    
    if (document.getElementById('modalEvento').classList.contains('show')) {
        const fecha = document.getElementById('eventoFecha').value;
        mostrarEventosExistentes(fecha);
    }
}

function refrescarCalendario() {
    const cal = document.getElementById('calendario');
    if (cal && window._escritorio.calendario) {
        cal.innerHTML = renderCalendarioHTML(window._escritorio.calendario.vista || 'semana');
    }
}

function abrirDiaCalendario(key) {
    abrirModalEvento(key);
}

// ============================================================
// DRAG & RESIZE CON INTERACT.JS
// ============================================================

function hacerArrastrable(elemento, elemData) {
    // Destruir instancias previas si existen
    interact(elemento).unset();
    
    interact(elemento)
        .draggable({
            inertia: false,
            autoScroll: true,
            listeners: {
                start() { elemento.classList.add('dragging'); },
                move(event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end() {
                    elemento.classList.remove('dragging');
                    const x = parseFloat(elemento.getAttribute('data-x')) || 0;
                    const y = parseFloat(elemento.getAttribute('data-y')) || 0;
                    elemData.x = Math.max(0, elemData.x + x);
                    elemData.y = Math.max(0, elemData.y + y);
                    elemento.style.transform = '';
                    elemento.setAttribute('data-x', 0);
                    elemento.setAttribute('data-y', 0);
                    elemento.style.left = elemData.x + 'px';
                    elemento.style.top = elemData.y + 'px';
                    guardarEscritorio();
                }
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                start() { elemento.classList.add('resizing'); },
                move(event) {
                    const target = event.target;
                    let x = (parseFloat(target.getAttribute('data-x')) || 0);
                    let y = (parseFloat(target.getAttribute('data-y')) || 0);
                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';
                    x += event.deltaRect.left;
                    y += event.deltaRect.top;
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    elemData.w = event.rect.width;
                    elemData.h = event.rect.height;
                },
                end() {
                    elemento.classList.remove('resizing');
                    const x = parseFloat(elemento.getAttribute('data-x')) || 0;
                    const y = parseFloat(elemento.getAttribute('data-y')) || 0;
                    elemData.x = elemData.x + x;
                    elemData.y = elemData.y + y;
                    elemData.w = parseFloat(elemento.style.width);
                    elemData.h = parseFloat(elemento.style.height);
                    elemento.style.transform = '';
                    elemento.setAttribute('data-x', 0);
                    elemento.setAttribute('data-y', 0);
                    elemento.style.left = elemData.x + 'px';
                    elemento.style.top = elemData.y + 'px';
                    guardarEscritorio();
                }
            }
        });
}

function guardarEscritorio() {
    localStorage.setItem('escritorio_elementos', JSON.stringify(window._escritorio));
}

// ============================================================
// ACCIONES
// ============================================================

function añadirNota() {
    const elementos = window._escritorio;
    const colores = ['#ffd93d', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#dda0dd', '#ff9ff3', '#feca57'];
    elementos.notas.push({
        id: 'nota-' + Date.now(),
        tipo: 'nota',
        texto: '',
        color: colores[Math.floor(Math.random() * colores.length)],
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 200,
        w: 180,
        h: 140
    });
    guardarEscritorio();
    renderizarEscritorio();
}

function eliminarNota(id) {
    const elementos = window._escritorio;
    elementos.notas = elementos.notas.filter(n => n.id !== id);
    guardarEscritorio();
    renderizarEscritorio();
}

function guardarTextoNota(id, texto) {
    const elementos = window._escritorio;
    const nota = elementos.notas.find(n => n.id === id);
    if (nota) {
        nota.texto = texto;
        guardarEscritorio();
    }
}

function resetEscritorio() {
    if (!confirm('¿Resetear el escritorio a su estado inicial?')) return;
    localStorage.removeItem('escritorio_elementos');
    mostrarDashboard(document.getElementById('mainContent'));
}

// ============================================================
// RESTO DE VISTAS
// ============================================================

function mostrarEstudio(main) {
    main.style.cssText = 'padding:24px;max-width:1400px;margin:0 auto;height:auto;overflow:auto;';
    
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

async function mostrarAreas(main) {
    let html = `<h1 class="page-title">📚 Áreas de Estudio</h1><div class="area-grid">`;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        const ap = asig.filter(a => estaAprobada(area.id, a.id)).length;
        const mat = asig.filter(a => esMatriculada(a)).length;
        const total = asig.length;
        const pct = total > 0 ? Math.round((ap/total)*100) : 0;
        
        if (area.id === 'herramientas' || area.id === 'networking' || area.id === 'pnl') {
            const color = area.id === 'herramientas' ? '#8b5cf6' : area.id === 'networking' ? '#00b4d8' : '#9b59b6';
            html += `<div class="area-card" onclick="navegar('asignaturas','${area.id}')" style="border:2px dashed ${color};">
                <div class="icon">${area.icon || '📚'}</div>
                <div class="nombre">${area.nombre}</div>
                <div class="desc">${area.descripcion || ''}</div>
                <div style="font-size:13px;color:var(--text-secondary);margin-top:8px;">⚡ ${asig.length} disponibles</div>
            </div>`;
        } else {
            html += `<div class="area-card" onclick="navegar('cursos','${area.id}')">
                <div class="icon">${area.icon || '📚'}</div>
                <div class="nombre">${area.nombre}</div>
                <div class="desc">${area.descripcion || ''}</div>
                <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%;height:6px;"></div></div>
                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${ap}/${total} aprobadas | ${mat} matriculadas</div>
            </div>`;
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
    const nombres = { '1': 'Primer Curso', '2': 'Segundo Curso', '3': 'Tercer Curso', '4': 'Cuarto Curso' };
    const iconos = { '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣' };
    let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('areas')"><i class="fas fa-arrow-left"></i> Volver</button><h1>${area.icon || '📚'} ${area.nombre}</h1></div><div class="area-grid">`;
    for (let c of cursos) {
        const ac = asig.filter(a => a.curso == c);
        const ap = ac.filter(a => estaAprobada(areaId, a.id)).length;
        const pct = ac.length > 0 ? Math.round((ap/ac.length)*100) : 0;
        html += `<div class="area-card" onclick="navegar('semestres','${areaId}','${c}')">
            <div class="icon" style="font-size:32px;">${iconos[c] || '📚'}</div>
            <div class="nombre">${nombres[c] || 'Curso ' + c}</div>
            <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%;height:6px;"></div></div>
        </div>`;
    }
    html += `</div>`;
    main.innerHTML = html;
}

async function mostrarSemestres(main, areaId, cursoId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const asig = await getAsignaturas(areaId);
    const ac = asig.filter(a => a.curso == cursoId);
    const semestres = [...new Set(ac.map(a => a.semestre))].sort();
    const nombres = { '0': '📅 Anuales', '1': '📖 Primer Semestre', '2': '📖 Segundo Semestre' };
    let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('cursos','${areaId}')"><i class="fas fa-arrow-left"></i> Volver</button><h1>${area.icon || '📚'} ${area.nombre}</h1></div><div class="area-grid">`;
    for (let s of semestres) {
        const as = ac.filter(a => a.semestre == s);
        const ap = as.filter(a => estaAprobada(areaId, a.id)).length;
        const pct = as.length > 0 ? Math.round((ap/as.length)*100) : 0;
        html += `<div class="area-card" onclick="navegar('asignaturas','${areaId}','${cursoId}','${s}')">
            <div class="icon" style="font-size:32px;">${(nombres[s]||'').includes('Anual') ? '📅' : '📖'}</div>
            <div class="nombre">${nombres[s] || 'Semestre ' + s}</div>
            <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%;height:6px;"></div></div>
        </div>`;
    }
    html += `</div>`;
    main.innerHTML = html;
}

async function mostrarAsignaturas(main, areaId, cursoId, semestreId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const esH = (areaId === 'herramientas' || areaId === 'networking' || areaId === 'pnl');
    let asig = await getAsignaturas(areaId);
    if (!esH) asig = asig.filter(a => a.curso == cursoId && a.semestre == semestreId);
    let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('${esH ? 'areas' : 'semestres'}','${areaId}'${esH ? '' : ",'"+cursoId+"'"})"><i class="fas fa-arrow-left"></i> Volver</button><h1>${area.icon || '📚'} ${area.nombre}</h1></div><div class="asignaturas-grid">`;
    asig.forEach(a => {
        const ap = estaAprobada(areaId, a.id);
        const mat = esMatriculada(a);
        const bc = esH ? '#8b5cf6' : (ap ? '#10b981' : mat ? '#3b82f6' : '#9ca3af');
        const url = area.path + a.path + 'asignatura.html';
        html += `<div class="asignatura-card" style="border-left:4px solid ${bc};opacity:${ap&&!esH?'0.6':'1'};">
            <div class="header"><div class="nombre-linea"><span class="nombre">${a.icon || '📚'} ${a.nombre}</span></div><span class="codigo">${a.codigo || ''}</span></div>
            <div class="acciones"><button onclick="window.location.href='${url}'" class="btn btn-primary">${esH ? '🔧 Abrir' : '📖 Ver contenido'}</button></div>
        </div>`;
    });
    html += `</div>`;
    main.innerHTML = html;
}

function mostrarTemas(main, areaId, cursoId, semestreId, asignaturaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    let asignatura = asignaturasCache[areaId]?.find(a => a.id === asignaturaId);
    if (!asignatura) return;
    fetch(area.path + asignatura.path + 'config.json').then(r => r.json()).then(data => {
        let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('asignaturas','${areaId}','${cursoId}','${semestreId}')"><i class="fas fa-arrow-left"></i> Volver</button><h1>${asignatura.icon || '📚'} ${asignatura.nombre}</h1></div><div class="card"><h2>📑 Temas</h2><div class="temas-list">`;
        (data.temas || []).forEach((t, i) => {
            html += `<div class="tema-item" onclick="navegar('tema','${areaId}','${cursoId}','${semestreId}','${asignaturaId}','${t.id}')"><div class="tema-info"><span class="tema-numero">${i+1}</span><span class="tema-titulo">${t.titulo}</span></div><div class="tema-progreso"><i class="fas fa-chevron-right"></i></div></div>`;
        });
        html += `</div></div>`;
        main.innerHTML = html;
    });
}

function mostrarTema(main, areaId, cursoId, semestreId, asignaturaId, temaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    let asignatura = asignaturasCache[areaId]?.find(a => a.id === asignaturaId);
    if (!asignatura) return;
    fetch(area.path + asignatura.path + 'temas/' + temaId + '/tema.html').then(r => r.text()).then(html => {
        main.innerHTML = html;
        main.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.textContent = oldScript.textContent;
            document.body.appendChild(newScript);
        });
    });
}

async function mostrarConfiguracion(main) {
    main.style.cssText = 'padding:24px;max-width:1400px;margin:0 auto;height:auto;overflow:auto;';
    let total = 0, ap = 0, mat = 0;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        total += asig.length;
        ap += asig.filter(a => estaAprobada(area.id, a.id)).length;
        mat += asig.filter(a => esMatriculada(a)).length;
    }
    main.innerHTML = `<h1 class="page-title">⚙️ Configuración</h1>
        <div class="card"><h2>📋 Datos</h2><p><strong>Áreas:</strong> ${areas.length}</p><p><strong>Asignaturas:</strong> ${total}</p><p><strong>Aprobadas:</strong> ${ap}</p><p><strong>Matriculadas:</strong> ${mat}</p></div>
        <div class="card"><h2>🧹 Limpieza</h2><button class="btn btn-danger" onclick="if(confirm('¿Borrar todo?')){localStorage.clear();location.reload();}"><i class="fas fa-trash"></i> Reiniciar</button></div>`;
}

// ============================================================
// TEMA OSCURO / CLARO
// ============================================================

document.getElementById('themeToggle').addEventListener('click', function() {
    const html = document.documentElement;
    const t = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', t);
    this.querySelector('i').className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', t);
});

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (savedTheme === 'dark') document.querySelector('#themeToggle i').className = 'fas fa-sun';

document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
});

// Exponer
window.cargarVista = cargarVista;
window.navegar = navegar;
window.toggleAprobada = toggleAprobada;
window.cambiarVista = cambiarVista;
window.abrirDiaCalendario = abrirDiaCalendario;
window.abrirModalEvento = abrirModalEvento;
window.cerrarModalEvento = cerrarModalEvento;
window.guardarEvento = guardarEvento;
window.editarEvento = editarEvento;
window.eliminarEventoPorId = eliminarEventoPorId;
window.eliminarEventoActual = eliminarEventoActual;
window.añadirNota = añadirNota;
window.eliminarNota = eliminarNota;
window.guardarTextoNota = guardarTextoNota;
window.resetEscritorio = resetEscritorio;
window.toggleModoMover = toggleModoMover;
