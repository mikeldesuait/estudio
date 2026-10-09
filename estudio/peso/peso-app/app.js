/* ============================================================
   REGISTRO DE PESO — App principal
   ============================================================ */

(function() {
  'use strict';

  const STORAGE_KEY = 'peso_data_v1';

  // ─── Estado global ───
  let perfil = {
    altura: null,
    sexo: '',
    fechaNacimiento: '',
    objetivo: null,
    actividad: ''
  };

  let registros = [];       // [{ fecha: 'YYYY-MM-DD', peso: 78.5, nota: '' }]
  let grafica = null;        // instancia Chart.js
  let rangoActual = 30;      // 30 | 90 | 365 | 'all'

  // ─── Utilidades ───
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function hoyISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function formatearFecha(iso) {
    const [y, m, d] = iso.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return d + ' ' + meses[parseInt(m, 10) - 1] + ' ' + y;
  }

  function formatearFechaCorta(iso) {
    const [y, m, d] = iso.split('-');
    return d + '/' + m;
  }

  function toast(msg, dur = 2000) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('visible'), dur);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s || '');
    return div.innerHTML;
  }

  /* ═══════════════════════════════════════════════════════
     PERSISTENCIA
     ═══════════════════════════════════════════════════════ */

  function guardar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ perfil, registros }));
    } catch (e) {
      console.error('Error al guardar:', e);
      toast('⚠️ No se pudo guardar');
    }
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.perfil) perfil = { ...perfil, ...data.perfil };
      if (Array.isArray(data.registros)) {
        // Ordenar por fecha ascendente
        registros = data.registros.sort((a, b) => a.fecha.localeCompare(b.fecha));
      }
    } catch (e) {
      console.error('Error al cargar:', e);
    }
  }

  /* ═══════════════════════════════════════════════════════
     CÁLCULO DE IMC Y RECOMENDACIONES
     ═══════════════════════════════════════════════════════ */

  function calcularIMC(peso, alturaCm) {
    if (!peso || !alturaCm) return null;
    const alturaM = alturaCm / 100;
    return peso / (alturaM * alturaM);
  }

  function clasificarIMC(imc) {
    if (imc === null || imc === undefined) return { nivel: 'sin-datos', texto: '—', color: 'info' };
    if (imc < 18.5)  return { nivel: 'bajo',     texto: 'Bajo peso',    color: 'warn' };
    if (imc < 25)    return { nivel: 'normal',   texto: 'Peso normal',  color: 'ok' };
    if (imc < 30)    return { nivel: 'sobrepeso', texto: 'Sobrepeso',    color: 'warn' };
    if (imc < 35)    return { nivel: 'obesidad1', texto: 'Obesidad I',   color: 'bad' };
    if (imc < 40)    return { nivel: 'obesidad2', texto: 'Obesidad II',  color: 'bad' };
    return               { nivel: 'obesidad3', texto: 'Obesidad III',  color: 'bad' };
  }

  window.PesoApp = { calcularIMC, clasificarIMC };

  /* ═══════════════════════════════════════════════════════
     RECOMENDACIONES
     ═══════════════════════════════════════════════════════ */

  function generarRecomendaciones() {
    const recs = [];

    if (!perfil.altura || registros.length === 0) {
      recs.push({
        icono: '📋',
        texto: 'Configura tu perfil y empieza a registrar tu peso para recibir recomendaciones personalizadas.',
        tipo: 'info'
      });
      return recs;
    }

    const ultimo = registros[registros.length - 1];
    const imc = calcularIMC(ultimo.peso, perfil.altura);
    const clasif = clasificarIMC(imc);

    // ─── Recomendación principal según IMC ───
    if (clasif.nivel === 'bajo') {
      recs.push({ icono: '🍽️', texto: 'Tu IMC indica bajo peso (< 18.5). Considera aumentar la ingesta calórica con alimentos nutritivos y consulta con un nutricionista.', tipo: 'warn' });
    } else if (clasif.nivel === 'normal') {
      recs.push({ icono: '✅', texto: '¡Felicidades! Tu IMC está en el rango saludable (18.5-24.9). Mantén tus hábitos actuales.', tipo: 'ok' });
    } else if (clasif.nivel === 'sobrepeso') {
      recs.push({ icono: '🏃', texto: 'Tu IMC indica sobrepeso (25-29.9). Una reducción moderada del 5-10% del peso aporta beneficios claros para la salud.', tipo: 'warn' });
    } else {
      recs.push({ icono: '🩺', texto: 'Tu IMC indica obesidad. Es recomendable consultar con un profesional sanitario para un plan personalizado.', tipo: 'bad' });
    }

    // ─── Tendencia ───
    if (registros.length >= 2) {
      const ultimos7 = registros.slice(-7);
      const primero7 = ultimos7[0];
      const ultimo7 = ultimos7[ultimos7.length - 1];
      const diff7 = ultimo7.peso - primero7.peso;
      const dias = ultimos7.length;

      if (dias >= 4) {
        if (diff7 < -1) {
          recs.push({ icono: '📉', texto: 'En los últimos ' + dias + ' días has bajado ' + Math.abs(diff7).toFixed(1) + ' kg. Si no es tu objetivo, revisa tu ingesta.', tipo: 'info' });
        } else if (diff7 > 1) {
          recs.push({ icono: '📈', texto: 'En los últimos ' + dias + ' días has subido ' + diff7.toFixed(1) + ' kg. Vigila la tendencia.', tipo: 'warn' });
        } else {
          recs.push({ icono: '⚖️', texto: 'Tu peso se mantiene estable en los últimos ' + dias + ' días. Buen control.', tipo: 'ok' });
        }
      }
    }

    // ─── Objetivo ───
    if (perfil.objetivo && ultimo) {
      const diff = ultimo.peso - perfil.objetivo;
      if (Math.abs(diff) < 0.5) {
        recs.push({ icono: '🎯', texto: '¡Has alcanzado tu objetivo de ' + perfil.objetivo + ' kg!', tipo: 'ok' });
      } else if (diff > 0) {
        recs.push({ icono: '🎯', texto: 'Te faltan ' + diff.toFixed(1) + ' kg para tu objetivo (' + perfil.objetivo + ' kg).', tipo: 'info' });
      } else {
        recs.push({ icono: '🎯', texto: 'Estás ' + Math.abs(diff).toFixed(1) + ' kg por debajo de tu objetivo (' + perfil.objetivo + ' kg).', tipo: 'info' });
      }
    }

    // ─── Consejos prácticos ───
    const consejos = [
      '💧 Bebe entre 1.5 y 2 litros de agua al día.',
      '🥗 Prioriza verduras, frutas y proteínas magras.',
      '😴 Dormir 7-8 horas ayuda a regular el apetito.',
      '🚶 Caminar 30 minutos al día mejora el metabolismo.',
      '📊 Pésate siempre a la misma hora, preferiblemente en ayunas.'
    ];
    const consejoRandom = consejos[Math.floor(Math.random() * consejos.length)];
    recs.push({ icono: '💡', texto: consejoRandom, tipo: 'info' });

    return recs;
  }

  function renderizarRecomendaciones() {
    const cont = $('#recomendacionesContent');
    const recs = generarRecomendaciones();

    cont.innerHTML = recs.map(r => {
      return '<div class="rec-item rec-' + r.tipo + '">' +
        '<span class="rec-icon">' + r.icono + '</span>' +
        '<span class="rec-text">' + escapeHtml(r.texto) + '</span>' +
      '</div>';
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════
     RACHA, ESTADÍSTICAS Y LOGROS
     ═══════════════════════════════════════════════════════ */

  function calcularRacha() {
    if (registros.length === 0) return 0;

    // Ordenar descendente
    const fechas = registros.map(r => r.fecha).sort((a, b) => b.localeCompare(a));
    const hoy = hoyISO();
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Si no ha registrado hoy ni ayer, racha = 0
    if (fechas[0] !== hoy && fechas[0] !== ayer) return 0;

    let racha = 0;
    let fechaActual = fechas[0] === hoy ? hoy : ayer;

    for (const fecha of fechas) {
      if (fecha === fechaActual) {
        racha++;
        // Calcular día anterior
        const d = new Date(fechaActual + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        fechaActual = d.toISOString().slice(0, 10);
      } else if (fecha < fechaActual) {
        break;
      }
    }
    return racha;
  }

  function calcularRachaMaxima() {
    if (registros.length === 0) return 0;
    const fechas = [...new Set(registros.map(r => r.fecha))].sort();
    let maxRacha = 1;
    let rachaActual = 1;

    for (let i = 1; i < fechas.length; i++) {
      const d1 = new Date(fechas[i - 1] + 'T12:00:00');
      const d2 = new Date(fechas[i] + 'T12:00:00');
      const diffDias = Math.round((d2 - d1) / 86400000);

      if (diffDias === 1) {
        rachaActual++;
        if (rachaActual > maxRacha) maxRacha = rachaActual;
      } else {
        rachaActual = 1;
      }
    }
    return maxRacha;
  }

  /* ─── Logros ─── */
  const LOGROS = [
    { id: 'primer-registro', icono: '🌱', nombre: 'Primer paso', desc: 'Registra tu primer peso', check: () => registros.length >= 1 },
    { id: '5-registros',     icono: '📝', nombre: '5 registros', desc: 'Registra tu peso 5 veces', check: () => registros.length >= 5 },
    { id: 'racha-3',         icono: '🔥', nombre: 'Racha 3 días', desc: '3 días seguidos', check: () => calcularRachaMaxima() >= 3 },
    { id: 'racha-7',         icono: '🔥', nombre: 'Racha 7 días', desc: 'Una semana seguida', check: () => calcularRachaMaxima() >= 7 },
    { id: 'racha-30',        icono: '🏆', nombre: 'Racha 30 días', desc: 'Un mes seguido', check: () => calcularRachaMaxima() >= 30 },
    { id: 'perdido-1kg',     icono: '📉', nombre: '-1 kg', desc: 'Pierde 1 kg desde el primer registro', check: () => {
      if (registros.length < 2) return false;
      const diff = registros[0].peso - registros[registros.length - 1].peso;
      return diff >= 1;
    }},
    { id: 'perdido-5kg',     icono: '🎉', nombre: '-5 kg', desc: 'Pierde 5 kg desde el primer registro', check: () => {
      if (registros.length < 2) return false;
      const diff = registros[0].peso - registros[registros.length - 1].peso;
      return diff >= 5;
    }},
    { id: 'objetivo',        icono: '🎯', nombre: 'Objetivo', desc: 'Alcanza tu peso objetivo', check: () => {
      if (!perfil.objetivo || registros.length === 0) return false;
      const actual = registros[registros.length - 1].peso;
      return Math.abs(actual - perfil.objetivo) < 0.5;
    }},
    { id: 'imc-normal',      icono: '💚', nombre: 'IMC saludable', desc: 'Alcanza un IMC entre 18.5 y 25', check: () => {
      if (!perfil.altura || registros.length === 0) return false;
      const imc = calcularIMC(registros[registros.length - 1].peso, perfil.altura);
      return imc >= 18.5 && imc < 25;
    }}
  ];

  function renderizarLogros() {
    const cont = $('#logrosGrid');
    cont.innerHTML = LOGROS.map(logro => {
      const desbloqueado = logro.check();
      return '<div class="logro ' + (desbloqueado ? 'unlocked' : '') + '" title="' + escapeHtml(logro.desc) + '">' +
        '<div class="logro-icon">' + logro.icono + '</div>' +
        '<div class="logro-name">' + escapeHtml(logro.nombre) + '</div>' +
      '</div>';
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════
     GRÁFICA
     ═══════════════════════════════════════════════════════ */

  function filtrarRegistrosPorRango() {
    if (rangoActual === 'all') return registros;

    const dias = parseInt(rangoActual, 10);
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    const isoLimite = fechaLimite.toISOString().slice(0, 10);

    return registros.filter(r => r.fecha >= isoLimite);
  }

  function renderizarGrafica() {
    const ctx = $('#graficaPeso').getContext('2d');
    const datos = filtrarRegistrosPorRango();

    if (grafica) grafica.destroy();

    // Colores según tema
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colorTexto = isDark ? '#94a3b8' : '#6b7280';
    const colorGrid = isDark ? '#334155' : '#e5e7eb';

    // Línea de objetivo
    const datasets = [{
      label: 'Peso (kg)',
      data: datos.map(r => r.peso),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2.5,
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }];

    if (perfil.objetivo) {
      datasets.push({
        label: 'Objetivo',
        data: datos.map(() => perfil.objetivo),
        borderColor: '#8b5cf6',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0
      });
    }

    grafica = new Chart(ctx, {
      type: 'line',
      data: {
        labels: datos.map(r => formatearFechaCorta(r.fecha)),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: colorTexto, font: { size: 12, weight: '600' } }
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#e2e8f0' : '#1f2937',
            bodyColor: isDark ? '#cbd5e1' : '#374151',
            borderColor: colorGrid,
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (ctx) => ctx.parsed.y.toFixed(1) + ' kg'
            }
          }
        },
        scales: {
          x: {
            ticks: { color: colorTexto, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            grid: { color: colorGrid }
          },
          y: {
            ticks: { color: colorTexto },
            grid: { color: colorGrid }
          }
        }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     RENDER DEL DASHBOARD
     ═══════════════════════════════════════════════════════ */

  function renderizarDashboard() {
    // Sin perfil → mostrar empty state
    if (!perfil.altura) {
      $('#emptyState').style.display = 'block';
      $('#dashboard').style.display = 'none';
      return;
    }

    $('#emptyState').style.display = 'none';
    $('#dashboard').style.display = 'flex';

    // ─── Fecha del header ───
    const fechaHoy = new Date().toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    $('#headerDate').textContent = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

    // ─── Peso actual ───
    if (registros.length === 0) {
      $('#pesoActual').textContent = '—';
      $('#pesoTrend').textContent = 'Registra tu primer peso';
      $('#pesoTrend').className = 'card-trend';
    } else {
      const ultimo = registros[registros.length - 1];
      $('#pesoActual').textContent = ultimo.peso.toFixed(1);

      if (registros.length >= 2) {
        const anterior = registros[registros.length - 2];
        const diff = ultimo.peso - anterior.peso;
        const flecha = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
        const color = diff > 0 ? 'trend-bad' : diff < 0 ? 'trend-good' : '';
        $('#pesoTrend').textContent = flecha + ' ' + (diff > 0 ? '+' : '') + diff.toFixed(1) + ' kg vs anterior';
        $('#pesoTrend').className = 'card-trend ' + color;
      } else {
        $('#pesoTrend').textContent = 'Último: ' + formatearFecha(ultimo.fecha);
        $('#pesoTrend').className = 'card-trend';
      }
    }

    // ─── IMC ───
    if (registros.length === 0) {
      $('#imcValor').textContent = '—';
      $('#imcClasif').textContent = 'Sin datos';
    } else {
      const ultimo = registros[registros.length - 1];
      const imc = calcularIMC(ultimo.peso, perfil.altura);
      const clasif = clasificarIMC(imc);
      $('#imcValor').textContent = imc.toFixed(1);
      $('#imcClasif').textContent = clasif.texto;

      const card = $('#cardImc');
      card.classList.remove('imc-alto', 'imc-obesidad');
      if (clasif.nivel === 'sobrepeso') card.classList.add('imc-alto');
      else if (clasif.nivel.startsWith('obesidad')) card.classList.add('imc-obesidad');
    }

    // ─── Racha ───
    const racha = calcularRacha();
    const rachaMax = calcularRachaMaxima();
    $('#rachaDias').textContent = racha;
    if (racha === 0) {
      $('#rachaMsg').textContent = rachaMax > 0 ? 'Mejor racha: ' + rachaMax + ' días' : 'Sin registro';
    } else if (racha === 1) {
      $('#rachaMsg').textContent = '¡Sigue así! 💪';
    } else {
      $('#rachaMsg').textContent = '🔥 ¡En racha!';
    }

    // ─── Objetivo ───
    if (!perfil.objetivo) {
      $('#objetivoValor').textContent = '—';
      $('#objetivoMsg').textContent = 'Configura un objetivo';
    } else {
      $('#objetivoValor').textContent = perfil.objetivo.toFixed(1);
      if (registros.length === 0) {
        $('#objetivoMsg').textContent = 'Sin datos aún';
      } else {
        const actual = registros[registros.length - 1].peso;
        const diff = actual - perfil.objetivo;
        if (Math.abs(diff) < 0.5) {
          $('#objetivoMsg').textContent = '🎉 ¡Objetivo alcanzado!';
        } else if (diff > 0) {
          $('#objetivoMsg').textContent = 'Faltan ' + diff.toFixed(1) + ' kg';
        } else {
          $('#objetivoMsg').textContent = 'Estás ' + Math.abs(diff).toFixed(1) + ' kg por debajo';
        }
      }
    }

    // ─── Recomendaciones, gráfica, logros, historial ───
    renderizarRecomendaciones();
    renderizarGrafica();
    renderizarLogros();
    renderizarHistorial();
  }

  /* ═══════════════════════════════════════════════════════
     HISTORIAL
     ═══════════════════════════════════════════════════════ */

  function renderizarHistorial() {
    const cont = $('#historialList');
    const count = $('#historialCount');
    count.textContent = registros.length + (registros.length === 1 ? ' registro' : ' registros');

    if (registros.length === 0) {
      cont.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Aún no hay registros. Pulsa "+ Registrar peso" para empezar.</p>';
      return;
    }

    // Mostrar los últimos 20 (más recientes primero)
    const ultimos = [...registros].reverse().slice(0, 20);

    cont.innerHTML = ultimos.map((r, i) => {
      const idxReal = registros.length - 1 - i;
      // Calcular diferencia con el anterior en el array original
      let diffHtml = '';
      if (idxReal > 0) {
        const diff = r.peso - registros[idxReal - 1].peso;
        const clase = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
        const flecha = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
        diffHtml = '<span class="historial-diff ' + clase + '">' + flecha + ' ' + Math.abs(diff).toFixed(1) + ' kg</span>';
      }

      return '<div class="historial-item">' +
        '<span class="historial-fecha">' + formatearFecha(r.fecha) + '</span>' +
        '<span class="historial-peso">' + r.peso.toFixed(1) + ' kg</span>' +
        diffHtml +
        (r.nota ? '<span class="historial-nota">' + escapeHtml(r.nota) + '</span>' : '') +
        '<div class="historial-actions">' +
          '<button class="historial-btn" data-edit="' + idxReal + '" title="Editar">✏️</button>' +
          '<button class="historial-btn" data-delete="' + idxReal + '" title="Borrar">🗑️</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Listeners
    cont.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => editarRegistro(parseInt(btn.dataset.edit, 10)));
    });
    cont.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => borrarRegistro(parseInt(btn.dataset.delete, 10)));
    });
  }

  /* ═══════════════════════════════════════════════════════
     MODALES
     ═══════════════════════════════════════════════════════ */

  function abrirModal(id) { $('#' + id).classList.add('visible'); }
  function cerrarModal(id) { $('#' + id).classList.remove('visible'); }

  let editandoIdx = null;

  function abrirModalRegistrar(idxExistente) {
    editandoIdx = idxExistente === undefined ? null : idxExistente;

    if (editandoIdx !== null) {
      const r = registros[editandoIdx];
      $('#inputPeso').value = r.peso;
      $('#inputFecha').value = r.fecha;
      $('#inputNota').value = r.nota || '';
      $('#registrarHint').textContent = 'Editando registro del ' + formatearFecha(r.fecha);
    } else {
      const hoy = hoyISO();
      $('#inputPeso').value = '';
      $('#inputFecha').value = hoy;
      $('#inputNota').value = '';
      const existente = registros.find(r => r.fecha === hoy);
      $('#registrarHint').textContent = existente
        ? '⚠️ Ya tienes un registro hoy (' + existente.peso + ' kg). Guardar lo reemplazará.'
        : '';
    }

    abrirModal('modalRegistrar');
    setTimeout(() => $('#inputPeso').focus(), 100);
  }

  function guardarRegistro() {
    const peso = parseFloat($('#inputPeso').value);
    const fecha = $('#inputFecha').value;
    const nota = $('#inputNota').value.trim();

    if (!peso || peso < 20 || peso > 300) { toast('⚠️ Peso inválido (20-300 kg)'); return; }
    if (!fecha) { toast('⚠️ Selecciona fecha'); return; }

    if (editandoIdx !== null) {
      registros[editandoIdx] = { fecha, peso, nota };
    } else {
      const idx = registros.findIndex(r => r.fecha === fecha);
      if (idx !== -1) {
        registros[idx] = { fecha, peso, nota };
      } else {
        registros.push({ fecha, peso, nota });
        registros.sort((a, b) => a.fecha.localeCompare(b.fecha));
      }
    }

    guardar();
    cerrarModal('modalRegistrar');
    renderizarDashboard();
    toast('✅ ' + peso.toFixed(1) + ' kg guardado');
  }

  function editarRegistro(idx) { abrirModalRegistrar(idx); }

  function borrarRegistro(idx) {
    if (!confirm('¿Borrar el registro del ' + formatearFecha(registros[idx].fecha) + '?')) return;
    registros.splice(idx, 1);
    guardar();
    renderizarDashboard();
    toast('🗑️ Borrado');
  }

  function abrirModalPerfil() {
    $('#inputAltura').value = perfil.altura || '';
    $('#inputSexo').value = perfil.sexo || '';
    $('#inputNacimiento').value = perfil.fechaNacimiento || '';
    $('#inputObjetivo').value = perfil.objetivo || '';
    $('#inputActividad').value = perfil.actividad || '';
    abrirModal('modalPerfil');
  }

  function guardarPerfil() {
    const altura = parseFloat($('#inputAltura').value);
    if (!altura || altura < 100 || altura > 250) { toast('⚠️ Altura inválida (100-250 cm)'); return; }

    perfil.altura = altura;
    perfil.sexo = $('#inputSexo').value;
    perfil.fechaNacimiento = $('#inputNacimiento').value;
    perfil.objetivo = parseFloat($('#inputObjetivo').value) || null;
    perfil.actividad = $('#inputActividad').value;

    guardar();
    cerrarModal('modalPerfil');
    renderizarDashboard();
    toast('✅ Perfil guardado');
  }

  function exportar() {
    const data = {
      fecha: new Date().toISOString(),
      perfil, registros,
      estadisticas: { total: registros.length, rachaActual: calcularRacha(), rachaMaxima: calcularRachaMaxima() }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'peso-backup-' + hoyISO() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('📤 Exportado');
  }

  /* ═══════════════════════════════════════════════════════
     EVENTOS
     ═══════════════════════════════════════════════════════ */

  function bindEventos() {
    $('#btnRegistrar').addEventListener('click', () => abrirModalRegistrar());
    $('#btnConfigurar').addEventListener('click', abrirModalPerfil);
    $('#btnPerfil').addEventListener('click', abrirModalPerfil);
    $('#btnExport').addEventListener('click', exportar);

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => cerrarModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal(modal.id);
      });
    });

    $('#btnGuardarRegistro').addEventListener('click', guardarRegistro);
    $('#btnGuardarPerfil').addEventListener('click', guardarPerfil);

    document.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const r = btn.dataset.range;
        rangoActual = r === 'all' ? 'all' : parseInt(r, 10);
        renderizarGrafica();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.visible').forEach(m => m.classList.remove('visible'));
      }
      if (e.key === 'Enter' && $('#modalRegistrar').classList.contains('visible')) {
        guardarRegistro();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     INICIALIZACIÓN
     ═══════════════════════════════════════════════════════ */

  function init() {
    cargar();
    bindEventos();
    renderizarDashboard();
    console.log('✅ Registro de Peso cargado | ' + registros.length + ' registros');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
