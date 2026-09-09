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
// DASHBOARD - VERSIÓN FINAL
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
    
    // Fechas de exámenes (ejemplo - puedes añadir más)
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    
    let html = `
    <style>
        .dashboard-final {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 16px;
            height: calc(100vh - 150px);
            min-height: 400px;
            padding: 5px 0;
        }
        
        /* COLUMNA IZQUIERDA */
        .col-izquierda {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        /* ÁREAS - PESTAÑAS FIJAS */
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
        .btn-area-pestana.continuar:hover {
            opacity: 0.85;
        }
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
        
        /* COLUMNA DERECHA */
        .col-derecha {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        /* CALENDARIO SEMANAL */
        .calendario-semanal {
            background: var(--bg-card);
            border-radius: 16px;
            border: 1px solid var(--border);
            padding: 12px 14px;
            box-shadow: var(--shadow);
        }
        .calendario-semanal .cal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        .calendario-semanal .cal-header h4 {
            margin: 0;
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 600;
        }
        .calendario-semanal .cal-header .cal-semana {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .calendario-semanal .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
        }
        .calendario-semanal .cal-grid .cal-dia-semana {
            font-size: 8px;
            text-align: center;
            font-weight: 700;
            color: var(--text-secondary);
            padding: 2px 0;
            text-transform: uppercase;
        }
        .calendario-semanal .cal-grid .cal-dia {
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
            background: var(--bg-hover);
            color: var(--text-primary);
            font-weight: 500;
            position: relative;
            min-height: 32px;
        }
        .calendario-semanal .cal-grid .cal-dia:hover { background: var(--accent); color: white; }
        .calendario-semanal .cal-grid .cal-dia.hoy { background: var(--accent); color: white; font-weight: 700; }
        .calendario-semanal .cal-grid .cal-dia.estudio { background: #4ecdc4; color: white; }
        .calendario-semanal .cal-grid .cal-dia.evento { background: #ff6b6b; color: white; }
        .calendario-semanal .cal-grid .cal-dia .punto {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #ff6b6b;
            position: absolute;
            bottom: 2px;
        }
        .calendario-semanal .cal-grid .cal-dia.vacio { background: transparent; cursor: default; }
        .calendario-semanal .cal-info {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--text-secondary);
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid var(--border);
        }
        .calendario-semanal .cal-acciones {
            display: flex;
            gap: 4px;
            margin-top: 4px;
        }
        .calendario-semanal .cal-acciones button {
            padding: 2px 10px;
            border-radius: 12px;
            border: 1px solid var(--border);
            background: transparent;
            font-size: 10px;
            cursor: pointer;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        .calendario-semanal .cal-acciones button:hover {
            border-color: var(--accent);
            color: var(--accent);
        }
        
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
            min-height: 120px;
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
            gap: 8px;
            flex: 1;
            align-content: flex-start;
            padding: 4px 0;
            overflow-y: auto;
            min-height: 50px;
        }
        .corcho-final .nota-corcho {
            background: #ffd93d;
            padding: 6px 10px 4px 10px;
            border-radius: 3px 3px 6px 6px;
            font-size: 11px;
            min-width: 50px;
            max-width: 140px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            position: relative;
            transform: rotate(var(--rot, 0deg));
            transition: transform 0.2s;
            word-break: break-word;
        }
        .corcho-final .nota-corcho:hover {
            transform: scale(1.02) rotate(0deg);
            z-index: 10;
        }
        .corcho-final .nota-corcho::before {
            content: '📌';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .corcho-final .nota-corcho .nota-texto { margin-top: 2px; line-height: 1.2; }
        .corcho-final .nota-corcho .nota-del {
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
        .corcho-final .nota-corcho:hover .nota-del { opacity: 1; }
        .corcho-final .nota-corcho .nota-del:hover { background: rgba(200,0,0,0.6); }
        .corcho-final .nota-vacia {
            width: 100%;
            text-align: center;
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            padding: 10px 0;
        }
        .corcho-final .nota-input-row {
            display: flex;
            gap: 4px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 2px solid rgba(255,255,255,0.15);
        }
        .corcho-final .nota-input-row input {
            flex: 1;
            padding: 4px 10px;
            border-radius: 6px;
            border: none;
            background: rgba(255,255,255,0.9);
            color: #2d3748;
            font-size: 11px;
            min-height: 28px;
        }
        .corcho-final .nota-input-row input:focus { outline: 2px solid rgba(255,255,255,0.4); }
        .corcho-final .nota-input-row .btn-add {
            padding: 4px 12px;
            border-radius: 6px;
            border: none;
            background: rgba(255,255,255,0.9);
            color: #2d3748;
            font-weight: 600;
            font-size: 11px;
            cursor: pointer;
        }
        .corcho-final .nota-input-row .btn-add:hover { background: white; }
        .corcho-final .nota-colores {
            display: flex;
            gap: 3px;
            margin-top: 4px;
        }
        .corcho-final .nota-colores .c-btn {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.25);
            cursor: pointer;
            transition: all 0.15s;
        }
        .corcho-final .nota-colores .c-btn:hover { transform: scale(1.1); }
        .corcho-final .nota-colores .c-btn.sel { border-color: white; box-shadow: 0 0 10px rgba(255,255,255,0.4); }
        
        @media (max-width: 768px) {
            .dashboard-final {
                grid-template-columns: 1fr;
                height: auto;
                min-height: auto;
            }
            .col-derecha { order: -1; }
            .calendario-semanal { min-height: 200px; }
            .btn-area-pestana { max-width: 120px; font-size: 12px; padding: 6px 12px; }
        }
    </style>
    
    <div class="dashboard-final">
        
        <!-- COLUMNA IZQUIERDA: ÁREAS -->
        <div class="col-izquierda">
            <div class="areas-pestanas">
                ${ultimaAsignatura ? `
                    <button class="btn-area-pestana continuar" onclick="window.location.href='${ultimaAsignatura.url || '#'}'">
                        <span class="icono">▶</span>
                        <span class="nombre">Continuar</span>
                        <span class="badge">${ultimoProgreso}%</span>
                    </button>
                ` : ''}
                ${areas.map(area => `
                    <button class="btn-area-pestana" onclick="window.location.href='/estudio/?area=${area.id}'" style="border-color: ${colors[area.id] || '#6c757d'};">
                        <span class="icono">${area.icon || '📚'}</span>
                        <span class="nombre">${area.nombre}</span>
                    </button>
                `).join('')}
                <button class="btn-area-pestana" onclick="cargarVista('configuracion')" style="border-color: #ef4444;">
                    <span class="icono">⚙️</span>
                    <span class="nombre">Config</span>
                </button>
            </div>
            
            <!-- Espacio para futuros widgets -->
            <div style="flex:1; min-height:50px;"></div>
        </div>
        
        <!-- COLUMNA DERECHA: CALENDARIO + CORCHO -->
        <div class="col-derecha">
            
            <!-- CALENDARIO SEMANAL -->
            <div class="calendario-semanal">
                <div class="cal-header">
                    <h4><i class="fas fa-calendar-alt"></i> <span class="cal-semana" id="calSemanaLabel"></span></h4>
                    <span style="font-size:10px; color:var(--text-secondary);" id="calHorasLabelFinal">⏱️ 0h hoy</span>
                </div>
                <div class="cal-grid" id="calGridFinal"></div>
                <div class="cal-info">
                    <span>📅 ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                    <span id="eventosCount">📌 0 eventos</span>
                </div>
                <div class="cal-acciones">
                    <button onclick="agregarEventoCalendario()">+ Añadir evento</button>
                    <button onclick="limpiarEventosCalendario()">🗑️ Limpiar</button>
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
                    <input type="text" id="notaInputFinal" placeholder="Nota..." maxlength="50" />
                    <button class="btn-add" onclick="agregarNotaFinal()">+</button>
                </div>
                <div class="nota-colores" id="notaColoresFinal"></div>
            </div>
            
        </div>
    </div>
    `;
    
    main.innerHTML = html;
    
    inicializarCalendarioFinal();
    inicializarNotasFinal();
    actualizarEventosCount();
}

// ============================================================
// CALENDARIO SEMANAL
// ============================================================

function inicializarCalendarioFinal() {
    const grid = document.getElementById('calGridFinal');
    if (!grid) return;
    
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth();
    const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    
    // Obtener inicio de semana (lunes)
    const diaSemana = hoy.getDay();
    const diff = diaSemana === 0 ? 6 : diaSemana - 1;
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - diff);
    
    let html = diasSemana.map(d => `<div class="cal-dia-semana">${d}</div>`).join('');
    
    // Mostrar 7 días de la semana
    for (let i = 0; i < 7; i++) {
        const fecha = new Date(inicioSemana);
        fecha.setDate(inicioSemana.getDate() + i);
        const dia = fecha.getDate();
        const mesNum = fecha.getMonth() + 1;
        const añoNum = fecha.getFullYear();
        const esHoy = (dia === hoy.getDate() && mesNum === hoy.getMonth() + 1 && añoNum === hoy.getFullYear());
        const key = 'estudio_fecha_' + añoNum + '-' + String(mesNum).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
        const esEstudio = localStorage.getItem(key);
        
        // Comprobar si hay evento
        const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
        const tieneEvento = eventos.some(e => e.fecha === key);
        
        let clase = 'cal-dia';
        if (esHoy) clase += ' hoy';
        if (esEstudio) clase += ' estudio';
        if (tieneEvento) clase += ' evento';
        
        html += `<div class="${clase}" onclick="marcarDiaFinal(${dia}, ${mesNum}, ${añoNum})">
            ${dia}
            ${tieneEvento ? '<span class="punto"></span>' : ''}
        </div>`;
    }
    grid.innerHTML = html;
    
    // Actualizar etiqueta de semana
    const mesEl = document.getElementById('calSemanaLabel');
    if (mesEl) {
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        mesEl.textContent = `${meses[inicioSemana.getMonth()]} ${inicioSemana.getDate()} - ${meses[finSemana.getMonth()]} ${finSemana.getDate()}, ${año}`;
    }
    actualizarHorasFinal();
}

function marcarDiaFinal(dia, mes, año) {
    const fecha = año + '-' + String(mes).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
    const key = 'estudio_fecha_' + fecha;
    if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, 'true');
    }
    inicializarCalendarioFinal();
    actualizarHorasFinal();
}

function actualizarHorasFinal() {
    const hoy = new Date();
    const key = 'estudio_fecha_' + hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
    const horas = localStorage.getItem(key) ? 1 : 0;
    const el = document.getElementById('calHorasLabelFinal');
    if (el) el.textContent = `⏱️ ${horas}h hoy`;
}

// ============================================================
// EVENTOS DEL CALENDARIO
// ============================================================

function agregarEventoCalendario() {
    const titulo = prompt('📌 Título del evento (ej: "Examen Derecho"):');
    if (!titulo) return;
    const fecha = prompt('📅 Fecha (formato: DD/MM/YYYY):');
    if (!fecha) return;
    const partes = fecha.split('/');
    if (partes.length !== 3) { alert('Formato incorrecto. Usa DD/MM/YYYY'); return; }
    const fechaObj = new Date(partes[2], partes[1]-1, partes[0]);
    if (isNaN(fechaObj.getTime())) { alert('Fecha inválida'); return; }
    
    const key = fechaObj.getFullYear() + '-' + String(fechaObj.getMonth()+1).padStart(2,'0') + '-' + String(fechaObj.getDate()).padStart(2,'0');
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    eventos.push({ titulo, fecha: key });
    localStorage.setItem('eventos_calendario', JSON.stringify(eventos));
    inicializarCalendarioFinal();
    actualizarEventosCount();
}

function limpiarEventosCalendario() {
    if (!confirm('¿Eliminar todos los eventos del calendario?')) return;
    localStorage.removeItem('eventos_calendario');
    inicializarCalendarioFinal();
    actualizarEventosCount();
}

function actualizarEventosCount() {
    const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
    const el = document.getElementById('eventosCount');
    if (el) el.textContent = `📌 ${eventos.length} eventos`;
}

// ============================================================
// NOTAS (FINAL)
// ============================================================

let colorNotaFinal = '#ffd93d';

function inicializarNotasFinal() {
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    const container = document.getElementById('notasCorchoFinal');
    if (!container) return;
    
    const colores = ['#ffd93d', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#dda0dd', '#ff9ff3', '#feca57'];
    
    if (notas.length === 0) {
        container.innerHTML = '<div class="nota-vacia">📌 Pincha una nota</div>';
    } else {
        container.innerHTML = notas.map((n, i) => `
            <div class="nota-corcho" style="background:${n.color || '#ffd93d'}; --rot: ${(Math.random() - 0.5) * 4}deg;">
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
    inicializarNotasFinal();
}

function eliminarNotaFinal(index) {
    const notas = JSON.parse(localStorage.getItem('tablero_notas') || '[]');
    notas.splice(index, 1);
    localStorage.setItem('tablero_notas', JSON.stringify(notas));
    inicializarNotasFinal();
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
window.marcarDiaFinal = marcarDiaFinal;
window.agregarNotaFinal = agregarNotaFinal;
window.eliminarNotaFinal = eliminarNotaFinal;
window.seleccionarColorFinal = seleccionarColorFinal;
window.agregarEventoCalendario = agregarEventoCalendario;
window.limpiarEventosCalendario = limpiarEventosCalendario;
