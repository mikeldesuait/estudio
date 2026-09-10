// ============================================================
// ESTUDIO PERSONAL - ESCRITORIO LIBRE (CORCHO INFINITO)
// ============================================================

let areas = [];
let asignaturasCache = {};
let estado = { nivel: 'areas', areaId: '', cursoId: '', semestreId: '', asignaturaId: '', temaId: '' };

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
    // Cargar elementos guardados
    let elementos = JSON.parse(localStorage.getItem('escritorio_elementos') || 'null');
    if (!elementos) {
        // Elementos por defecto
        elementos = {
            areas: areas.map((a, i) => ({
                id: 'area-' + a.id,
                tipo: 'area',
                areaId: a.id,
                x: 20 + (i % 4) * 160,
                y: 20,
                w: 150,
                h: 50
            })),
            calendario: {
                id: 'calendario',
                tipo: 'calendario',
                x: window.innerWidth - 420,
                y: 20,
                w: 400,
                h: 320,
                vista: 'semana'
            },
            notas: []
        };
        localStorage.setItem('escritorio_elementos', JSON.stringify(elementos));
    }
    
    // Guardar datos globales
    window._escritorio = elementos;
    window._areas = areas;
    
    const colors = {
        'grado-derecho': '#3b82f6',
        'pnl': '#9b59b6',
        'herramientas': '#8b5cf6',
        'networking': '#00b4d8'
    };
    window._colors = colors;
    
    let html = `
    <style>
        /* Reset del main para el escritorio */
        #mainContent.container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            height: calc(100vh - 130px);
            overflow: hidden;
        }
        
        /* Escritorio (corcho gigante) */
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
        
        /* Elemento flotante genérico */
        .elemento-flotante {
            position: absolute;
            touch-action: none;
            user-select: none;
            z-index: 10;
        }
        .elemento-flotante.dragging { z-index: 1000; }
        .elemento-flotante.resizing { z-index: 1001; }
        
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
            cursor: pointer;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.15s, box-shadow 0.15s;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            height: 100%;
            width: 100%;
        }
        .elem-area:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .elem-area.continuar {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
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
        }
        .elem-calendario .cal-header {
            padding: 6px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-hover);
            border-bottom: 1px solid var(--border);
            cursor: move;
            flex-shrink: 0;
        }
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
        
        /* Grid calendario */
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
        
        /* Vista DÍA del calendario */
        .cal-dia-detalle {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .cal-dia-detalle .fecha-grande {
            font-size: 18px;
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
        }
        .cal-dia-detalle .evento-item .titulo { font-weight: 500; }
        .cal-dia-detalle .evento-item .hora { font-size: 10px; color: var(--text-secondary); }
        .cal-dia-detalle .btn-add-evento {
            background: var(--accent);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 4px;
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
            cursor: move;
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
            cursor: text;
        }
        .elem-nota .nota-texto:focus {
            background: rgba(255,255,255,0.3);
            border-radius: 4px;
            padding: 4px;
            margin: 0 -4px;
            margin-top: 4px;
            margin-bottom: -4px;
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
        }
        .elem-nota:hover .nota-del { opacity: 1; }
        .elem-nota .nota-del:hover { background: rgba(200,0,0,0.3); color: white; }
        
        /* Tienda de widgets (barra inferior) */
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
            transform: translateY(-2px);
        }
        
        /* Modal de eventos */
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
            max-width: 400px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .modal-evento h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
        }
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
        .modal-evento .btn-cancelar {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        .modal-evento .btn-guardar {
            background: var(--accent);
            color: white;
        }
        
        @media (max-width: 768px) {
            #mainContent.container {
                height: calc(100vh - 110px);
            }
            .widgets-bar {
                bottom: 60px;
                font-size: 11px;
            }
            .widgets-bar .bar-label { display: none; }
        }
    </style>
    
    <div class="escritorio" id="escritorio">
        <!-- Los elementos flotantes se insertan aquí por JS -->
    </div>
    
    <div class="widgets-bar">
        <span class="bar-label">➕ Añadir:</span>
        <button onclick="añadirNota()"><i class="fas fa-sticky-note"></i> Nota</button>
        <button onclick="añadirCalendario()"><i class="fas fa-calendar-alt"></i> Calendario</button>
        <button onclick="resetEscritorio()"><i class="fas fa-undo"></i> Reset</button>
    </div>
    
    <div class="modal-evento-overlay" id="modalEvento">
        <div class="modal-evento">
            <h3 id="modalEventoTitulo">📅 Nuevo evento</h3>
            <label>Fecha</label>
            <input type="date" id="eventoFecha" />
            <label>Hora (opcional)</label>
            <input type="time" id="eventoHora" />
            <label>Título</label>
            <input type="text" id="eventoTitulo" placeholder="Ej: Examen de Derecho" />
            <label>Descripción (opcional)</label>
            <textarea id="eventoDesc" rows="2" placeholder="Detalles..."></textarea>
            <div class="acciones">
                <button class="btn-cancelar" onclick="cerrarModalEvento()">Cancelar</button>
                <button class="btn-guardar" onclick="guardarEvento()">Guardar</button>
            </div>
        </div>
    </div>
    `;
    
    main.innerHTML = html;
    
    // Renderizar los elementos del escritorio
    renderizarEscritorio();
}

// ============================================================
// RENDERIZAR ELEMENTOS DEL ESCRITORIO
// ============================================================

function renderizarEscritorio() {
    const escritorio = document.getElementById('escritorio');
    if (!escritorio) return;
    escritorio.innerHTML = '';
    
    const elementos = window._escritorio;
    const colors = window._colors || {};
    
    // Renderizar botones de áreas
    (elementos.areas || []).forEach(elem => {
        const area = areas.find(a => a.id === elem.areaId);
        if (!area) return;
        
        const div = document.createElement('a');
        div.className = 'elemento-flotante elem-area';
        div.id = elem.id;
        div.href = '/estudio/?area=' + area.id;
        div.style.left = elem.x + 'px';
        div.style.top = elem.y + 'px';
        div.style.width = elem.w + 'px';
        div.style.height = elem.h + 'px';
        div.style.borderColor = colors[area.id] || '#6c757d';
        div.innerHTML = `<span style="font-size:16px;">${area.icon || '📚'}</span> ${area.nombre}`;
        
        // Evitar que al arrastrar se active el enlace
        div.addEventListener('dragstart', e => e.preventDefault());
        
        escritorio.appendChild(div);
        hacerArrastrable(div, elem);
    });
    
    // Renderizar calendario
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
        hacerArrastrable(div, elem);
    }
    
    // Renderizar notas
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
            <div class="nota-texto" contenteditable="true" spellcheck="false" 
                 onblur="guardarTextoNota('${elem.id}', this.textContent)"
                 onmousedown="event.stopPropagation()">${elem.texto || ''}</div>
        `;
        
        escritorio.appendChild(div);
        hacerArrastrable(div, elem);
    });
    
    // Habilitar interact.js para redimensionar y arrastrar
    habilitarInteract();
}

// ============================================================
// CALENDARIO HTML (día / semana / mes)
// ============================================================

function renderCalendarioHTML(vista) {
    const hoy = new Date();
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const diasSemanaLargo = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const diasSemanaCorto = ['L','M','X','J','V','S','D'];
    
    let cuerpo = '';
    
    if (vista === 'dia') {
        // Vista DÍA
        const key = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
        const diaEventos = eventos.filter(e => e.fecha === key);
        cuerpo = `
            <div class="cal-dia-detalle">
                <div class="fecha-grande">${diasSemanaLargo[hoy.getDay() === 0 ? 6 : hoy.getDay()-1]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]}</div>
                ${diaEventos.length === 0 ? '<p style="text-align:center;color:var(--text-secondary);font-size:12px;">Sin eventos</p>' : ''}
                ${diaEventos.map((e, i) => `
                    <div class="evento-item">
                        <div>
                            <div class="titulo">${e.titulo}</div>
                            ${e.hora ? `<div class="hora">${e.hora}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
                <button class="btn-add-evento" onclick="abrirModalEvento('${key}')">+ Añadir evento</button>
            </div>
        `;
    } else if (vista === 'semana') {
        // Vista SEMANA
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
            grid += `<div class="${clase}" onclick="abrirDia('${key}')" style="min-height:48px;">
                <div style="font-weight:700;">${dia}</div>
                <div style="font-size:9px;color:inherit;opacity:0.7;">${meses[mesNum-1].substring(0,3)}</div>
                ${tieneEvento ? '<div class="punto"></div>' : ''}
            </div>`;
        }
        grid += '</div>';
        cuerpo = grid;
    } else {
        // Vista MES
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
            grid += `<div class="${clase}" onclick="abrirDia('${key}')">${d}</div>`;
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
    
    // Actualizar solo el calendario
    const cal = document.getElementById('calendario');
    if (cal) {
        // Mantener el header, cambiar solo body
        const body = cal.querySelector('.cal-body');
        const header = cal.querySelector('.cal-header');
        if (header && body) {
            const nuevoHTML = renderCalendarioHTML(vista);
            const temp = document.createElement('div');
            temp.innerHTML = nuevoHTML;
            cal.innerHTML = nuevoHTML;
        } else {
            cal.innerHTML = renderCalendarioHTML(vista);
        }
    }
}

function abrirDia(key) {
    // Abrir modal para añadir evento a ese día
    abrirModalEvento(key);
}

// ============================================================
// MODAL EVENTO
// ============================================================

let _fechaEventoActual = null;

function abrirModalEvento(fecha) {
    _fechaEventoActual = fecha;
    const hoy = new Date();
    const fechaInput = document.getElementById('eventoFecha');
    if (fechaInput) {
        // Si fecha es string YYYY-MM-DD
        if (typeof fecha === 'string' && fecha.includes('-')) {
            fechaInput.value = fecha;
        } else {
            fechaInput.value = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
        }
    }
    document.getElementById('modalEventoTitulo').textContent = '📅 Nuevo evento';
    document.getElementById('eventoTitulo').value = '';
    document.getElementById('eventoHora').value = '';
    document.getElementById('eventoDesc').value = '';
    document.getElementById('modalEvento').classList.add('show');
    setTimeout(() => document.getElementById('eventoTitulo').focus(), 100);
}

function cerrarModalEvento() {
    document.getElementById('modalEvento').classList.remove('show');
}

function guardarEvento() {
    const fecha = document.getElementById('eventoFecha').value;
    const hora = document.getElementById('eventoHora').value;
    const titulo = document.getElementById('eventoTitulo').value.trim();
    const desc = document.getElementById('eventoDesc').value.trim();
    
    if (!fecha || !titulo) {
        alert('Por favor, rellena al menos la fecha y el título');
        return;
    }
    
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    eventos.push({ fecha, hora, titulo, desc });
    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));
    
    cerrarModalEvento();
    // Recargar calendario
    const cal = document.getElementById('calendario');
    if (cal && window._escritorio.calendario) {
        cal.innerHTML = renderCalendarioHTML(window._escritorio.calendario.vista || 'semana');
    }
}

// ============================================================
// DRAG & DROP + RESIZE CON INTERACT.JS
// ============================================================

function hacerArrastrable(elemento, elemData) {
    // Guardar datos en el elemento
    elemento.dataset.elemId = elemData.id;
    
    interact(elemento)
        .draggable({
            inertia: false,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: false
                })
            ],
            autoScroll: true,
            listeners: {
                start(event) {
                    elemento.classList.add('dragging');
                },
                move(event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end(event) {
                    elemento.classList.remove('dragging');
                    const x = parseFloat(elemento.getAttribute('data-x')) || 0;
                    const y = parseFloat(elemento.getAttribute('data-y')) || 0;
                    
                    // Actualizar posición en datos
                    const nuevaX = elemData.x + x;
                    const nuevaY = elemData.y + y;
                    elemData.x = Math.max(0, nuevaX);
                    elemData.y = Math.max(0, nuevaY);
                    
                    // Reset transform y aplicar posición absoluta
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
                start(event) {
                    elemento.classList.add('resizing');
                },
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
                    
                    // Actualizar dimensiones en datos
                    elemData.w = event.rect.width;
                    elemData.h = event.rect.height;
                },
                end(event) {
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
// ACCIONES DEL ESCRITORIO
// ============================================================

function añadirNota() {
    const elementos = window._escritorio;
    const colores = ['#ffd93d', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#dda0dd', '#ff9ff3', '#feca57'];
    const nuevaNota = {
        id: 'nota-' + Date.now(),
        tipo: 'nota',
        texto: '',
        color: colores[Math.floor(Math.random() * colores.length)],
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 200,
        w: 180,
        h: 140
    };
    elementos.notas.push(nuevaNota);
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

function añadirCalendario() {
    const elementos = window._escritorio;
    // Si ya existe, no añadir otro
    if (elementos.calendario) {
        alert('Ya tienes un calendario');
        return;
    }
    elementos.calendario = {
        id: 'calendario',
        tipo: 'calendario',
        x: 200,
        y: 200,
        w: 400,
        h: 320,
        vista: 'semana'
    };
    guardarEscritorio();
    renderizarEscritorio();
}

function resetEscritorio() {
    if (!confirm('¿Resetear el escritorio a su estado inicial?')) return;
    localStorage.removeItem('escritorio_elementos');
    mostrarDashboard(document.getElementById('mainContent'));
}

// ============================================================
// RESTO DE VISTAS (ESTUDIO, CONFIGURACIÓN)
// ============================================================

function mostrarEstudio(main) {
    // Restaurar padding del container
    main.style.padding = '24px';
    main.style.maxWidth = '1400px';
    main.style.margin = '0 auto';
    main.style.height = 'auto';
    main.style.overflow = 'auto';
    
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
        const totalAsig = asig.length;
        const pct = totalAsig > 0 ? Math.round((ap/totalAsig)*100) : 0;
        
        if (area.id === 'herramientas' || area.id === 'networking' || area.id === 'pnl') {
            const color = area.id === 'herramientas' ? '#8b5cf6' : area.id === 'networking' ? '#00b4d8' : '#9b59b6';
            html += `
                <div class="area-card" onclick="navegar('asignaturas','${area.id}')" style="border: 2px dashed ${color};">
                    <div class="icon">${area.icon || '🔧'}</div>
                    <div class="nombre">${area.nombre}</div>
                    <div class="desc">${area.descripcion || ''}</div>
                    <div style="font-size:13px; color:var(--text-secondary); margin-top:8px;">
                        ⚡ ${asig.length} disponibles
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
    let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('areas')"><i class="fas fa-arrow-left"></i> Volver</button><h1>${area.icon || '📚'} ${area.nombre}</h1></div><div class="area-grid">`;
    for (let cursoId of cursos) {
        const asigCurso = asig.filter(a => a.curso == cursoId);
        const ap = asigCurso.filter(a => estaAprobada(areaId, a.id)).length;
        const mat = asigCurso.filter(a => esMatriculada(a)).length;
        const pct = asigCurso.length > 0 ? Math.round((ap/asigCurso.length)*100) : 0;
        html += `<div class="area-card" onclick="navegar('semestres','${areaId}','${cursoId}')">
            <div class="icon" style="font-size:32px;">${iconosCursos[cursoId] || '📚'}</div>
            <div class="nombre">${nombresCursos[cursoId] || 'Curso ' + cursoId}</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">${ap}/${asigCurso.length} aprobadas | ${mat} matriculadas (${pct}%)</div>
            <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%; height:6px;"></div></div>
        </div>`;
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
    let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('cursos','${areaId}')"><i class="fas fa-arrow-left"></i> Volver</button><h1>${area.icon || '📚'} ${area.nombre} - ${nombresCursos[cursoId] || 'Curso ' + cursoId}</h1></div><div class="area-grid">`;
    for (let semId of semestres) {
        const asigSem = asigCurso.filter(a => a.semestre == semId);
        const ap = asigSem.filter(a => estaAprobada(areaId, a.id)).length;
        const mat = asigSem.filter(a => esMatriculada(a)).length;
        const total = asigSem.length;
        const pct = total > 0 ? Math.round((ap/total)*100) : 0;
        html += `<div class="area-card" onclick="navegar('asignaturas','${areaId}','${cursoId}','${semId}')">
            <div class="icon" style="font-size:32px;">${nombresSemestres[semId].includes('Anual') ? '📅' : '📖'}</div>
            <div class="nombre">${nombresSemestres[semId] || 'Semestre ' + semId}</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">${ap}/${total} aprobadas | ${mat} matriculadas (${pct}%)</div>
            <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%; height:6px;"></div></div>
        </div>`;
    }
    html += `</div>`;
    main.innerHTML = html;
}

async function mostrarAsignaturas(main, areaId, cursoId, semestreId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    const esHerramientas = (areaId === 'herramientas' || areaId === 'networking' || areaId === 'pnl');
    let asig = await getAsignaturas(areaId);
    if (!esHerramientas) asig = asig.filter(a => a.curso == cursoId && a.semestre == semestreId);
    
    let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('${esHerramientas ? 'areas' : 'semestres'}','${areaId}'${esHerramientas ? '' : ",'"+cursoId+"'"})"><i class="fas fa-arrow-left"></i> Volver</button><h1>${area.icon || '📚'} ${area.nombre}</h1></div><div class="asignaturas-grid">`;
    
    asig.forEach(a => {
        const ap = estaAprobada(areaId, a.id);
        const matriculada = esMatriculada(a);
        let borderColor = esHerramientas ? (areaId === 'herramientas' ? '#8b5cf6' : areaId === 'networking' ? '#00b4d8' : '#9b59b6') : (ap ? '#10b981' : matriculada ? '#3b82f6' : '#9ca3af');
        let badge = esHerramientas ? '<span class="badge-herramienta">📖 Asignatura</span>' : (ap ? '<span class="badge-aprobada">✅ Aprobada</span>' : (matriculada ? '<span class="badge-matriculada">📌 Matriculada</span>' : '<span class="badge-no-matriculada">📋 No matriculada</span>'));
        const url = area.path + a.path + 'asignatura.html';
        html += `<div class="asignatura-card" style="border-left: 4px solid ${borderColor}; opacity: ${ap && !esHerramientas ? '0.6' : '1'};">
            <div class="header"><div class="nombre-linea"><span class="nombre">${a.icon || '📚'} ${a.nombre}</span>${badge}</div><span class="codigo">${a.codigo || ''}</span></div>
            <div class="info">${!esHerramientas ? `<span><i class="fas fa-star"></i> ${a.creditos || 0} ECTS</span>` : ''}<span><i class="fas fa-tag"></i> ${a.caracter || ''}</span></div>
            <div class="acciones">${!esHerramientas ? `<button onclick="toggleAprobada('${areaId}','${a.id}')" class="btn ${ap ? 'btn-success' : 'btn-outline'}">${ap ? '✅ Desmarcar' : '📋 Marcar aprobada'}</button>` : ''}<button onclick="window.location.href='${url}'" class="btn btn-primary">${esHerramientas ? '🔧 Abrir' : '📖 Ver contenido'}</button></div>
        </div>`;
    });
    html += `</div>`;
    main.innerHTML = html;
}

function mostrarTemas(main, areaId, cursoId, semestreId, asignaturaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) { main.innerHTML = '<h2>Área no encontrada</h2>'; return; }
    let asignatura = asignaturasCache[areaId]?.find(a => a.id === asignaturaId);
    if (!asignatura) { main.innerHTML = '<h2>Asignatura no encontrada</h2>'; return; }
    fetch(area.path + asignatura.path + 'config.json')
        .then(r => r.json())
        .then(data => {
            let html = `<div class="area-header"><button class="btn btn-outline" onclick="navegar('asignaturas','${areaId}','${cursoId}','${semestreId}')"><i class="fas fa-arrow-left"></i> Volver</button><h1>${asignatura.icon || '📚'} ${asignatura.nombre}</h1></div><div class="card"><h2>📑 Temas</h2><div class="temas-list">`;
            (data.temas || []).forEach((t, i) => {
                html += `<div class="tema-item" onclick="navegar('tema','${areaId}','${cursoId}','${semestreId}','${asignaturaId}','${t.id}')"><div class="tema-info"><span class="tema-numero">${i+1}</span><span class="tema-titulo">${t.titulo}</span></div><div class="tema-progreso"><span>0%</span><i class="fas fa-chevron-right"></i></div></div>`;
            });
            html += `</div></div>`;
            main.innerHTML = html;
        })
        .catch(() => { main.innerHTML = '<p>No se pudo cargar el config.json</p>'; });
}

function mostrarTema(main, areaId, cursoId, semestreId, asignaturaId, temaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    let asignatura = asignaturasCache[areaId]?.find(a => a.id === asignaturaId);
    if (!asignatura) return;
    fetch(area.path + asignatura.path + 'temas/' + temaId + '/tema.html')
        .then(r => r.text())
        .then(html => {
            main.innerHTML = html;
            main.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
            });
        })
        .catch(() => { main.innerHTML = '<p>No se encontró el tema</p>'; });
}

async function mostrarConfiguracion(main) {
    main.style.padding = '24px';
    main.style.maxWidth = '1400px';
    main.style.margin = '0 auto';
    main.style.height = 'auto';
    main.style.overflow = 'auto';
    
    let total = 0, ap = 0, mat = 0;
    for (let area of areas) {
        const asig = await getAsignaturas(area.id);
        total += asig.length;
        ap += asig.filter(a => estaAprobada(area.id, a.id)).length;
        mat += asig.filter(a => esMatriculada(a)).length;
    }
    main.innerHTML = `
        <h1 class="page-title">⚙️ Configuración</h1>
        <div class="card"><h2>📋 Datos del Sistema</h2><p><strong>Áreas:</strong> ${areas.length}</p><p><strong>Asignaturas:</strong> ${total}</p><p><strong>Aprobadas:</strong> ${ap}</p><p><strong>Matriculadas:</strong> ${mat}</p></div>
        <div class="card"><h2>🧹 Limpieza</h2><button class="btn btn-danger" onclick="if(confirm('¿Borrar todo el progreso?')){localStorage.clear();alert('Reiniciado');cargarVista('configuracion');}"><i class="fas fa-trash"></i> Reiniciar Progreso</button></div>
    `;
}

// ============================================================
// TEMA OSCURO / CLARO
// ============================================================

document.getElementById('themeToggle').addEventListener('click', function() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    this.querySelector('i').className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', newTheme);
});

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (savedTheme === 'dark') document.querySelector('#themeToggle i').className = 'fas fa-sun';

document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
});

// Exponer funciones
window.cargarVista = cargarVista;
window.navegar = navegar;
window.toggleAprobada = toggleAprobada;
window.cambiarVista = cambiarVista;
window.abrirDia = abrirDia;
window.abrirModalEvento = abrirModalEvento;
window.cerrarModalEvento = cerrarModalEvento;
window.guardarEvento = guardarEvento;
window.añadirNota = añadirNota;
window.eliminarNota = eliminarNota;
window.guardarTextoNota = guardarTextoNota;
window.añadirCalendario = añadirCalendario;
window.resetEscritorio = resetEscritorio;
