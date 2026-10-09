/* ============================================================
   TEST ROUTER — Motor del exam trainer
   Rediseño completo 2026.
   - 3 tipos: MCQ, MSQ, MATCH
   - 2 modos: Estudio, Examen
   - Persistencia en localStorage
   ============================================================ */

(function() {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     CONFIGURACIÓN
     ═══════════════════════════════════════════════════════ */

  const LS_KEY = 'testrouter_v1';
  const AUTO_NEXT_EXAM = true;   // Pasar automáticamente en modo examen

  const TYPE_LABEL = {
    mcq: 'MCQ',
    msq: 'MSQ',
    dragMatch: 'MATCH',
    dropOrder: 'ORDER'
  };

  /* ═══════════════════════════════════════════════════════
     UTILIDADES
     ═══════════════════════════════════════════════════════ */

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setEquals(a, b) {
    const A = new Set(a);
    const B = new Set(b);
    if (A.size !== B.size) return false;
    for (const v of A) if (!B.has(v)) return false;
    return true;
  }

  function toast(msg, duration = 1800) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('visible'), duration);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

  /* ═══════════════════════════════════════════════════════
     ESTADO
     ═══════════════════════════════════════════════════════ */

  const state = {
    mode: 'study',          // 'study' | 'exam'
    theme: 'light',         // 'light' | 'dark'
    lang: 'en',             // 'en' | 'es' — idioma del enunciado y opciones
    idx: 0,                 // índice de la pregunta actual
    order: [],              // orden de los índices de QUESTIONS
    answers: {},            // { [qId]: { type, value, isCorrect, answered } }
    optOrder: {},           // { [qId]: ['B','D','A','C'] } orden de opciones
    finished: false,        // true cuando se ha pulsado "Corregir todo"
    reviewed: false         // true cuando se está revisando el resultado
  };

  /* ═══════════════════════════════════════════════════════
     PERSISTENCIA
     ═══════════════════════════════════════════════════════ */

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('No se pudo guardar el estado:', e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return false;

      // Merge defensivo
      if (s.mode === 'study' || s.mode === 'exam') state.mode = s.mode;
      if (s.theme === 'light' || s.theme === 'dark') state.theme = s.theme;
      if (s.lang === 'en' || s.lang === 'es') state.lang = s.lang;
      if (typeof s.idx === 'number') state.idx = s.idx;
      if (Array.isArray(s.order)) state.order = s.order;
      if (s.answers && typeof s.answers === 'object') state.answers = s.answers;
      if (s.optOrder && typeof s.optOrder === 'object') state.optOrder = s.optOrder;
      if (typeof s.finished === 'boolean') state.finished = s.finished;

      return true;
    } catch (e) {
      console.warn('Error al cargar estado:', e);
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════════
     MODO Y TEMA
     ═══════════════════════════════════════════════════════ */

  function toggleMode() {
    state.mode = state.mode === 'study' ? 'exam' : 'study';
    state.finished = false;    // al cambiar de modo, se resetea el "corregir todo"
    updateModeButton();
    saveState();
    render();
    toast(state.mode === 'study' ? '📖 Modo Estudio' : '📝 Modo Examen');
  }

  function updateModeButton() {
    const btn = $('#btnMode');
    if (!btn) return;
    const icon = btn.querySelector('.mode-icon');
    const label = btn.querySelector('.mode-label');
    if (state.mode === 'study') {
      icon.textContent = '📖';
      label.textContent = 'Estudio';
    } else {
      icon.textContent = '📝';
      label.textContent = 'Examen';
    }
    // Actualizar visibilidad del botón de idioma
    updateLangButton();
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
    updateThemeButton();
  }

  /* ─── Idioma del enunciado (solo modo estudio) ─── */
  function toggleLang() {
    state.lang = state.lang === 'en' ? 'es' : 'en';
    saveState();
    updateLangButton();
    render();
    toast(state.lang === 'es' ? '🇪🇸 Preguntas en español' : '🇬🇧 Questions in English');
  }

  function updateLangButton() {
    const btn = $('#btnLang');
    if (!btn) return;

    // Solo visible en modo estudio
    const esEstudio = state.mode === 'study';
    btn.style.display = esEstudio ? 'flex' : 'none';

    // Icono: la bandera del idioma AL QUE PUEDES CAMBIAR
    // (si estás en inglés, muestra 🇪🇸 → pulsar cambia a español)
    // (si estás en español, muestra 🇬🇧 → pulsar cambia a inglés)
    btn.textContent = state.lang === 'es' ? '🇬🇧' : '🇪🇸';
    btn.title = state.lang === 'es' ? 'Ver en inglés' : 'Ver en español';
  }

  /**
   * Devuelve el texto de la pregunta según el idioma actual.
   * Si lang === 'es' y no hay traducción, cae al original.
   */
  function getQText(q) {
    if (state.lang === 'es' && typeof TRADUCCIONES !== 'undefined') {
      const t = TRADUCCIONES[q.id];
      if (t && t.q_es) return t.q_es;
    }
    return q.q;
  }

  /**
   * Devuelve el texto de una opción según el idioma actual.
   */
  function getOptText(q, key) {
    if (state.lang === 'es' && typeof TRADUCCIONES !== 'undefined') {
      const t = TRADUCCIONES[q.id];
      if (t && t.options_es && t.options_es[key]) return t.options_es[key];
    }
    return q.options[key];
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
  }

  function updateThemeButton() {
    const btn = $('#btnTheme');
    if (!btn) return;
    btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  /* ═══════════════════════════════════════════════════════
     PREGUNTAS — Helpers
     ═══════════════════════════════════════════════════════ */

  function currentQ() {
    return QUESTIONS[state.order[state.idx]];
  }

  function getOptKeys(q) {
    if (!q.options) return [];
    if (!state.optOrder[q.id]) {
      state.optOrder[q.id] = shuffle(Object.keys(q.options));
      saveState();
    }
    return state.optOrder[q.id];
  }

  /**
   * ¿Está la pregunta "cerrada" (contesta y bloqueada)?
   * - MCQ: siempre que haya value
   * - MSQ: cuando la longitud del value === pick
   * - MATCH: cuando todos los lefts están emparejados
   * - ORDER: cuando todos los ítems tienen número
   */
  function isAnswered(q, a) {
    if (!a) return false;
    if (q.type === 'mcq') return !!a.value;
    if (q.type === 'msq') return Array.isArray(a.value) && a.value.length === (q.pick || 2);
    if (q.type === 'dragMatch') return a.value && Object.keys(a.value).length === q.leftItems.length;
    if (q.type === 'dropOrder') return Array.isArray(a.value) && a.value.every(v => v !== null && v !== undefined && v !== '');
    return false;
  }

  /**
   * ¿Debemos mostrar correcciones (correcto/incorrecto) AHORA?
   * - Modo examen: solo si state.finished (o reviewed)
   * - Modo estudio: siempre que la pregunta esté respondida
   */
  function showCorrections(q) {
    if (state.mode === 'exam') return state.finished || state.reviewed;
    const a = state.answers[q.id];
    return !!(a && a.answered);
  }

  /**
   * ¿Debemos mostrar la explicación EN/ES AHORA?
   * - Modo examen: no (nunca durante el examen, solo al revisar)
   * - Modo estudio: sí, cuando la pregunta está respondida
   */
  function showExplanation(q) {
    if (state.mode === 'exam') return false;
    const a = state.answers[q.id];
    return !!(a && a.answered);
  }

  /* ═══════════════════════════════════════════════════════
     INICIALIZACIÓN
     ═══════════════════════════════════════════════════════ */

  function initOrder() {
    state.order = shuffle(QUESTIONS.map((_, i) => i));
  }

  function init() {
    const cargado = loadState();

    // Validar el orden
    if (!Array.isArray(state.order) || state.order.length !== QUESTIONS.length) {
      initOrder();
      state.answers = {};
      state.finished = false;
    }

    // Si no hay orden, generarlo
    if (state.order.length === 0) initOrder();

    // Aplicar tema visual
    applyTheme();
    updateThemeButton();
    updateModeButton();
    updateLangButton();

    // Listeners
    bindEvents();

    // Render
    render();
    updateProgress();

    console.log('✅ Test Router cargado | ' + QUESTIONS.length + ' preguntas');
  }

  /* ═══════════════════════════════════════════════════════
     EVENTOS
     ═══════════════════════════════════════════════════════ */

  function bindEvents() {
    $('#btnMode')?.addEventListener('click', toggleMode);
    $('#btnTheme')?.addEventListener('click', toggleTheme);
    $('#btnLang')?.addEventListener('click', toggleLang);
    $('#btnReset')?.addEventListener('click', resetAll);
    $('#btnInfo')?.addEventListener('click', () => openModal('modalInfo'));

    $('#btnPrev')?.addEventListener('click', () => go(-1));
    $('#btnNext')?.addEventListener('click', () => go(1));

    $('#btnFinish')?.addEventListener('click', finishAll);
    $('#btnStudyOnly')?.addEventListener('click', () => filterPending());
    $('#btnWrongOnly')?.addEventListener('click', () => filterWrong());

    $('#btnExport')?.addEventListener('click', exportAnswers);
    $('#btnImport')?.addEventListener('click', importAnswers);

    // Panel colapsable (móvil/tablet vertical)
    $('#btnPanel')?.addEventListener('click', abrirPanel);
    $('#btnPanelClose')?.addEventListener('click', cerrarPanel);
    $('#panelOverlay')?.addEventListener('click', cerrarPanel);

    // Cerrar panel con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarPanel();
    });

    // Modales
    $('#modalInfoClose')?.addEventListener('click', () => closeModal('modalInfo'));
    $('#modalResultClose')?.addEventListener('click', () => closeModal('modalResult'));
    $('#btnCloseResult')?.addEventListener('click', () => closeModal('modalResult'));
    $('#btnReviewResult')?.addEventListener('click', () => {
      state.reviewed = true;
      state.finished = true;
      state.idx = 0;
      closeModal('modalResult');
      saveState();
      render();
    });

    // Cerrar modal al hacer clic fuera
    $$('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('visible');
      });
    });

    // Atajos de teclado
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    // Ignorar si hay un input enfocado
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.target.isContentEditable) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(1);
    } else if (/^[1-9]$/.test(e.key)) {
      // Seleccionar opción N en MCQ/MSQ
      const q = currentQ();
      if (q.type === 'mcq' || q.type === 'msq') {
        const keys = getOptKeys(q);
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < keys.length) {
          e.preventDefault();
          const optEl = $(`.q-option[data-key="${keys[idx]}"]`);
          if (optEl) optEl.click();
        }
      }
    }
  }

  function openModal(id) {
    const m = $('#' + id);
    if (m) m.classList.add('visible');
  }

  function closeModal(id) {
    const m = $('#' + id);
    if (m) m.classList.remove('visible');
  }

  /* ═══════════════════════════════════════════════════════
     NAVEGACIÓN
     ═══════════════════════════════════════════════════════ */

  function go(delta) {
    const total = state.order.length;
    const nuevo = clamp(state.idx + delta, 0, total - 1);
    if (nuevo === state.idx) return;
    state.idx = nuevo;
    saveState();
    render();
    updateProgress();
    cerrarPanel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ═══════════════════════════════════════════════════════
     RENDER PRINCIPAL
     ═══════════════════════════════════════════════════════ */

  function render() {
    const host = $('#questionHost');
    if (!host) return;
    host.innerHTML = '';

    const q = currentQ();
    if (!q) {
      host.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted);">No hay preguntas.</p>';
      return;
    }

    // Número y tipo
    const metaRow = document.createElement('div');
    metaRow.style.display = 'flex';
    metaRow.style.gap = '6px';
    metaRow.style.marginBottom = '12px';
    metaRow.style.flexWrap = 'wrap';
    metaRow.innerHTML =
      '<span class="q-number">Pregunta ' + (state.idx + 1) + ' / ' + state.order.length + '</span>' +
      '<span class="q-type-tag ' + q.type.replace('dragMatch', 'match').replace('dropOrder', 'order') + '">' +
        (TYPE_LABEL[q.type] || q.type) + '</span>';
    host.appendChild(metaRow);

    // Botón de traducir (solo modo estudio, antes de responder)
    if (state.mode === 'study' && !isAnswered(q, state.answers[q.id])) {
      const btnT = document.createElement('button');
      btnT.className = 'btn-translate';
      btnT.innerHTML = '🌐 Traducir al español';
      btnT.addEventListener('click', () => toggleTranslation(q, btnT, host));
      host.appendChild(btnT);
    }

    // Contenedor de traducción (vacío)
    const transDiv = document.createElement('div');
    transDiv.id = 'translation_' + q.id;
    transDiv.style.display = 'none';
    host.appendChild(transDiv);

    // Texto de la pregunta (según idioma)
    const txt = document.createElement('div');
    txt.className = 'q-text';
    txt.innerHTML = escapeHtml(getQText(q));
    host.appendChild(txt);

    // Imagen si la hay
    if (q.img) {
      const box = document.createElement('div');
      box.className = 'q-image';
      const img = document.createElement('img');
      img.alt = 'Imagen de la pregunta';
      img.loading = 'lazy';
      // Buscar primero en img/
      img.src = 'img/' + q.img;
      img.onerror = () => {
        // Fallback: intentar sin la carpeta img/
        img.src = q.img;
      };
      box.appendChild(img);
      host.appendChild(box);
    }

    // Render según tipo
    if (q.type === 'mcq') renderMCQ(host, q);
    else if (q.type === 'msq') renderMSQ(host, q);
    else if (q.type === 'dragMatch') renderMATCH(host, q);
    else if (q.type === 'dropOrder') renderORDER(host, q);

    // Feedback y explicación (si procede)
    if (showCorrections(q)) {
      renderFeedback(host, q);
    }
    if (showExplanation(q)) {
      renderExplanation(host, q);
    }
  }

  /* ═══════════════════════════════════════════════════════
     TRADUCCIÓN (solo modo estudio)
     ═══════════════════════════════════════════════════════ */

  function toggleTranslation(q, btn, host) {
    const div = document.getElementById('translation_' + q.id);
    if (!div) return;

    if (div.style.display === 'none') {
      // Mostrar traducción
      const html = `
        <div class="q-translation">
          <div class="q-translation-title">🌐 Traducción (aproximada)</div>
          <p>${escapeHtml(q.q_es || q.q)}</p>
          ${q.options && q.options_es ? Object.keys(q.options).map(k =>
            `<p><strong>${k}.</strong> ${escapeHtml(q.options_es[k] || q.options[k])}</p>`
          ).join('') : ''}
        </div>
      `;
      div.innerHTML = html;
      div.style.display = 'block';
      btn.classList.add('active');
      btn.innerHTML = '🌐 Ocultar traducción';

      // Si no hay traducción específica, avisamos
      if (!q.q_es && !q.options_es) {
        toast('ℹ️ Traducción automática no disponible. Usa el traductor del navegador.');
      }
    } else {
      // Ocultar
      div.style.display = 'none';
      btn.classList.remove('active');
      btn.innerHTML = '🌐 Traducir al español';
    }
  }

  /* ═══════════════════════════════════════════════════════
     MCQ — Multiple Choice
     ═══════════════════════════════════════════════════════ */

  function renderMCQ(host, q) {
    const opts = document.createElement('div');
    opts.className = 'q-options';

    const saved = state.answers[q.id]?.value || null;
    const locked = isAnswered(q, state.answers[q.id]) || showCorrections(q);

    getOptKeys(q).forEach((key, i) => {
      const val = getOptText(q, key);
      const opt = document.createElement('label');
      opt.className = 'q-option';
      opt.dataset.key = key;

      if (saved === key) opt.classList.add('selected');

      const marker = document.createElement('span');
      marker.className = 'q-option-marker';

      const letter = document.createElement('span');
      letter.className = 'q-option-letter';
      letter.textContent = key;

      const text = document.createElement('span');
      text.className = 'q-option-text';
      text.textContent = val;

      opt.append(marker, letter, text);

      opt.addEventListener('click', () => {
        if (showCorrections(q)) return;    // bloqueado si ya se corrigió
        state.answers[q.id] = {
          type: 'mcq',
          value: key,
          isCorrect: key === q.ok,
          answered: true
        };
        saveState();
        updateProgress();

        // En modo examen con autonext
        if (state.mode === 'exam' && AUTO_NEXT_EXAM && state.idx < state.order.length - 1) {
          render();  // repinta con la opción seleccionada
          setTimeout(() => go(1), 200);
        } else {
          render();  // repinta con corrección + explicación en estudio
        }
      });

      opts.appendChild(opt);
    });

    host.appendChild(opts);
  }

  /* ═══════════════════════════════════════════════════════
     FEEDBACK y EXPLICACIÓN
     ═══════════════════════════════════════════════════════ */

  function renderFeedback(host, q) {
    const a = state.answers[q.id];
    if (!a) return;

    const div = document.createElement('div');
    div.className = 'q-feedback ' + (a.isCorrect ? 'ok' : 'bad');

    // Aplicar estilos de corrección a las opciones
    $$('.q-option', host).forEach(el => {
      const key = el.dataset.key;
      el.classList.remove('correct', 'wrong');
      if (q.type === 'mcq') {
        if (key === q.ok) el.classList.add('correct');
        if (key === a.value && a.value !== q.ok) el.classList.add('wrong');
      } else if (q.type === 'msq') {
        const okSet = new Set(q.ok);
        const chosenSet = new Set(a.value || []);
        if (okSet.has(key)) el.classList.add('correct');
        if (chosenSet.has(key) && !okSet.has(key)) el.classList.add('wrong');
      }
    });

    // Aplicar estilos a MATCH
    $$('.match-item', host).forEach(el => {
      // Cada item ya se habrá pintado desde renderMATCH si está cerrado
    });

    // Aplicar estilos a ORDER
    $$('.order-item', host).forEach(el => {
      // Igual: se habrá pintado desde renderORDER
    });

    if (q.type === 'mcq' || q.type === 'msq') {
      div.innerHTML = a.isCorrect
        ? '✅ ¡Correcto!'
        : '❌ Incorrecto. La respuesta correcta era: <strong>' +
          (q.type === 'mcq' ? q.ok : q.ok.join(', ')) + '</strong>';
      host.appendChild(div);
    }
  }

  function renderExplanation(host, q) {
    const en = q.exp_en || q.exp;
    const es = q.exp_es;

    if (!en && !es) return;

    const div = document.createElement('div');
    div.className = 'q-explanation';

    let html = '<div class="q-explanation-title">📖 Explicación</div>';

    if (en) {
      html += '<div class="q-explanation-block"><strong>English</strong>' +
        escapeHtml(en).replace(/\n/g, '<br>') + '</div>';
    }
    if (es) {
      html += '<div class="q-explanation-block"><strong>Español</strong>' +
        escapeHtml(es).replace(/\n/g, '<br>') + '</div>';
    }

    div.innerHTML = html;
    host.appendChild(div);
  }

  /* ═══════════════════════════════════════════════════════
     MSQ — Multiple Select
     ═══════════════════════════════════════════════════════ */

  function renderMSQ(host, q) {
    const pick = q.pick || 2;

    // Aviso de cuántas hay que elegir
    const hint = document.createElement('div');
    hint.className = 'q-hint';
    hint.innerHTML = '📌 Selecciona <strong>' + pick + '</strong> opción' + (pick > 1 ? 'es' : '') + ' correcta' + (pick > 1 ? 's' : '');
    host.appendChild(hint);

    const opts = document.createElement('div');
    opts.className = 'q-options msq';

    const saved = state.answers[q.id]?.value || [];
    const locked = showCorrections(q);

    function updateAnswer() {
      const chosen = $$('.q-option.selected', opts).map(o => o.dataset.key);
      const complete = chosen.length === pick;
      state.answers[q.id] = {
        type: 'msq',
        value: chosen,
        isCorrect: complete && setEquals(chosen, q.ok),
        answered: complete
      };
      saveState();
      updateProgress();

      if (complete && state.mode === 'exam' && AUTO_NEXT_EXAM && state.idx < state.order.length - 1) {
        setTimeout(() => go(1), 200);
      } else if (complete) {
        render();
      }
    }

    getOptKeys(q).forEach((key, i) => {
      const val = getOptText(q, key);
      const opt = document.createElement('label');
      opt.className = 'q-option msq';
      opt.dataset.key = key;

      if (saved.includes(key)) opt.classList.add('selected');

      const marker = document.createElement('span');
      marker.className = 'q-option-marker';

      const letter = document.createElement('span');
      letter.className = 'q-option-letter';
      letter.textContent = key;

      const text = document.createElement('span');
      text.className = 'q-option-text';
      text.textContent = val;

      opt.append(marker, letter, text);

      opt.addEventListener('click', () => {
        if (showCorrections(q)) return;
        if (opt.classList.contains('selected')) {
          opt.classList.remove('selected');
        } else {
          const currentSelected = $$('.q-option.selected', opts);
          if (currentSelected.length >= pick) {
            toast('Máximo ' + pick + ' opciones');
            return;
          }
          opt.classList.add('selected');
        }
        updateAnswer();
      });

      opts.appendChild(opt);
    });

    host.appendChild(opts);
  }

  /* ═══════════════════════════════════════════════════════
     MATCH — Emparejar con líneas SVG (nuevo diseño)
     ═══════════════════════════════════════════════════════ */

  const MATCH_COLORS = [
    '#3b82f6', // azul
    '#10b981', // verde
    '#f59e0b', // naranja
    '#ef4444', // rojo
    '#8b5cf6', // violeta
    '#ec4899', // rosa
    '#06b6d4', // cian
    '#eab308', // amarillo
    '#6b7280', // gris
    '#92400e', // marrón
    '#14b8a6', // teal
    '#f97316'  // naranja claro
  ];

  function renderMATCH(host, q) {
    // Aviso
    const hint = document.createElement('div');
    hint.className = 'q-hint';
    hint.innerHTML = '🔗 Toca una opción de la izquierda y luego una de la derecha para unirlas';
    host.appendChild(hint);

    // Contenedor principal
    const container = document.createElement('div');
    container.className = 'match-container';
    container.id = 'match_' + q.id;

    // Columna izquierda
    const leftCol = document.createElement('div');
    leftCol.className = 'match-col match-left';
    leftCol.innerHTML = '<div class="match-col-title">Izquierda</div>';

    // Columna derecha
    const rightCol = document.createElement('div');
    rightCol.className = 'match-col match-right';
    rightCol.innerHTML = '<div class="match-col-title">Derecha</div>';

    container.append(leftCol, rightCol);

    // SVG superpuesto (se añadirá al container, position absolute)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'match-svg');
    svg.id = 'svg_' + q.id;
    container.appendChild(svg);

    // Estado interno de este match
    const assignments = state.answers[q.id]?.value ? { ...state.answers[q.id].value } : {};
    const locked = showCorrections(q);
    let selectedLeftIdx = null;

    // Guardar
    function persist() {
      const complete = Object.keys(assignments).length === q.leftItems.length;
      const isCorrect = complete && Object.entries(assignments).every(([li, ri]) => {
        return String(ri) === String(q.ok[li]);
      });
      state.answers[q.id] = {
        type: 'dragMatch',
        value: { ...assignments },
        isCorrect,
        answered: complete
      };
      saveState();
      updateProgress();
    }

    // Pintar items
    function paint() {
      // Limpiar items previos (dejando los títulos)
      $$('.match-item', leftCol).forEach(e => e.remove());
      $$('.match-item', rightCol).forEach(e => e.remove());

      // Left items
      q.leftItems.forEach((text, i) => {
        const div = document.createElement('div');
        div.className = 'match-item';
        div.dataset.leftIdx = i;

        const isAssigned = assignments[i] !== undefined;
        if (isAssigned) div.classList.add('assigned');
        if (selectedLeftIdx === i) div.classList.add('selected');

        // En modo corrección mostramos si está bien
        if (locked && isAssigned) {
          const isOk = String(assignments[i]) === String(q.ok[i]);
          div.classList.add(isOk ? 'correct' : 'wrong');
        }

        const txt = document.createElement('span');
        txt.className = 'q-option-text';
        txt.textContent = text;

        const anchor = document.createElement('span');
        anchor.className = 'match-anchor';
        anchor.dataset.anchorId = 'L' + i;

        div.append(txt, anchor);

        div.addEventListener('click', () => {
          if (locked) return;

          // Si ya está asignado, lo desasignamos
          if (isAssigned) {
            delete assignments[i];
            persist();
            paint();
            drawLines();
            return;
          }

          // Si ya hay uno seleccionado y es este, deseleccionamos
          if (selectedLeftIdx === i) {
            selectedLeftIdx = null;
          } else {
            selectedLeftIdx = i;
          }

          paint();
        });

        leftCol.appendChild(div);
      });

      // Right items
      q.rightItems.forEach((text, i) => {
        const div = document.createElement('div');
        div.className = 'match-item';
        div.dataset.rightIdx = i;

        // ¿Alguien está asignado a este right?
        const assignedLefts = Object.entries(assignments)
          .filter(([li, ri]) => String(ri) === String(i))
          .map(([li]) => parseInt(li, 10));

        const anchor = document.createElement('span');
        anchor.className = 'match-anchor';
        anchor.dataset.anchorId = 'R' + i;

        const txt = document.createElement('span');
        txt.className = 'q-option-text';
        txt.textContent = text;

        div.append(anchor, txt);

        // Mostrar chips de "quién está asignado aquí"
        if (assignedLefts.length > 0) {
          const chips = document.createElement('div');
          chips.style.display = 'flex';
          chips.style.gap = '4px';
          chips.style.marginLeft = 'auto';
          chips.style.flexWrap = 'wrap';
          assignedLefts.forEach(li => {
            const chip = document.createElement('span');
            chip.textContent = String(li + 1);
            chip.style.cssText = `
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: 22px;
              height: 22px;
              padding: 0 6px;
              background: ${getMatchColor(li)};
              color: #fff;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 700;
              font-family: var(--font-mono);
            `;
            chips.appendChild(chip);
          });
          div.appendChild(chips);
        }

        div.addEventListener('click', () => {
          if (locked) return;
          if (selectedLeftIdx === null) {
            toast('👈 Toca primero una opción de la izquierda');
            return;
          }
          // Asignar
          assignments[selectedLeftIdx] = i;
          selectedLeftIdx = null;
          persist();
          paint();
          drawLines();

          // Si ya está completo, pintar corrección
          if (Object.keys(assignments).length === q.leftItems.length) {
            setTimeout(() => {
              if (state.mode === 'exam' && AUTO_NEXT_EXAM && state.idx < state.order.length - 1) {
                go(1);
              } else {
                render();
              }
            }, 400);
          }
        });

        rightCol.appendChild(div);
      });

      // Ajustar SVG para que ocupe el mismo tamaño
      const rect = container.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      svg.style.width = rect.width + 'px';
      svg.style.height = rect.height + 'px';

      // Dibujar líneas
      requestAnimationFrame(drawLines);
    }

    // Dibujar líneas SVG
    function drawLines() {
      svg.innerHTML = '';

      Object.entries(assignments).forEach(([li, ri]) => {
        const anchorL = $(`[data-anchor-id="L${li}"]`, container);
        const anchorR = $(`[data-anchor-id="R${ri}"]`, container);
        if (!anchorL || !anchorR) return;

        const cRect = container.getBoundingClientRect();
        const lRect = anchorL.getBoundingClientRect();
        const rRect = anchorR.getBoundingClientRect();

        const x1 = lRect.left + lRect.width / 2 - cRect.left;
        const y1 = lRect.top + lRect.height / 2 - cRect.top;
        const x2 = rRect.left + rRect.width / 2 - cRect.left;
        const y2 = rRect.top + rRect.height / 2 - cRect.top;

        // Curva Bézier: control point a medio camino
        const cx1 = x1 + (x2 - x1) * 0.4;
        const cy1 = y1;
        const cx2 = x1 + (x2 - x1) * 0.6;
        const cy2 = y2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`);
        path.setAttribute('stroke', getMatchColor(parseInt(li, 10)));

        // Click en la línea para borrar
        if (!locked) {
          path.classList.add('hoverable');
          path.addEventListener('click', () => {
            delete assignments[li];
            persist();
            paint();
            drawLines();
          });
        }

        svg.appendChild(path);
      });
    }

    // Color por índice izquierdo
    function getMatchColor(leftIdx) {
      return MATCH_COLORS[leftIdx % MATCH_COLORS.length];
    }

    // Escuchar cambios de tamaño para redibujar
    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      svg.style.width = rect.width + 'px';
      svg.style.height = rect.height + 'px';
      drawLines();
    });
    resizeObserver.observe(container);

    host.appendChild(container);
    paint();
  }

  /* ═══════════════════════════════════════════════════════
     ORDER — Ordenar con selects (nuevo diseño)
     ═══════════════════════════════════════════════════════ */

  function renderORDER(host, q) {
    const n = q.items.length;

    // Aviso
    const hint = document.createElement('div');
    hint.className = 'q-hint';
    hint.innerHTML = '🔢 Asigna un número del <strong>1</strong> al <strong>' + n + '</strong> a cada elemento';
    host.appendChild(hint);

    const container = document.createElement('div');
    container.className = 'order-container';

    // Guardar valores actuales
    const current = state.answers[q.id]?.value
      ? [...state.answers[q.id].value]
      : new Array(n).fill(null);

    const locked = showCorrections(q);

    function persist() {
      const complete = current.every(v => v !== null && v !== undefined && v !== '');
      const isCorrect = complete && current.every((v, i) => parseInt(v, 10) - 1 === q.okOrder[i]);
      state.answers[q.id] = {
        type: 'dropOrder',
        value: [...current],
        isCorrect,
        answered: complete
      };
      saveState();
      updateProgress();
    }

    function refreshUI() {
      const used = current.filter(v => v !== null && v !== '');
      $$('.order-select', container).forEach(sel => {
        const idx = parseInt(sel.dataset.idx, 10);
        const options = ['<option value="">—</option>'];
        for (let i = 1; i <= n; i++) {
          const usedByOther = used.includes(String(i)) && current[idx] !== String(i);
          options.push(`<option value="${i}" ${usedByOther ? 'disabled' : ''}>${i}</option>`);
        }
        sel.innerHTML = options.join('');
        sel.value = current[idx] || '';
      });
    }

    q.items.forEach((text, i) => {
      const row = document.createElement('div');
      row.className = 'order-item';
      row.dataset.idx = i;

      const sel = document.createElement('select');
      sel.className = 'order-select';
      sel.dataset.idx = i;

      const txt = document.createElement('span');
      txt.className = 'order-text';
      txt.textContent = text;

      row.append(sel, txt);

      sel.addEventListener('change', () => {
        if (locked) return;
        current[i] = sel.value || null;
        persist();
        refreshUI();
        // Si está completo, corrección
        if (current.every(v => v !== null && v !== '')) {
          if (state.mode === 'exam' && AUTO_NEXT_EXAM && state.idx < state.order.length - 1) {
            setTimeout(() => go(1), 400);
          } else {
            render();
          }
        }
      });

      // Aplicar corrección si está bloqueado
      if (locked) {
        const v = current[i];
        const isOk = v && (parseInt(v, 10) - 1) === q.okOrder[i];
        row.classList.add(isOk ? 'correct' : 'wrong');
      }

      container.appendChild(row);
    });

    host.appendChild(container);

    refreshUI();
  }

  /* ═══════════════════════════════════════════════════════
     PROGRESO Y ESTADÍSTICAS
     ═══════════════════════════════════════════════════════ */

  function computeStats() {
    const total = state.order.length;
    let answered = 0;
    let correct = 0;

    QUESTIONS.forEach(q => {
      const a = state.answers[q.id];
      if (a && a.answered) answered++;
      if (a && a.isCorrect) correct++;
    });

    const pending = total - answered;
    const wrong = answered - correct;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { total, answered, correct, wrong, pending, score };
  }

  function updateProgress() {
    const stats = computeStats();

    // Barra progreso móvil
    const pText = $('#progressText');
    const pScore = $('#progressScore');
    const pFill = $('#progressFill');

    if (pText) pText.textContent = 'Pregunta ' + (state.idx + 1) + ' / ' + stats.total;
    if (pScore) pScore.textContent = stats.score + '%';
    if (pFill) pFill.style.width = ((state.idx + 1) / stats.total * 100) + '%';

    // Panel lateral
    const panelIdx = $('#panelIdx');
    const panelTotal = $('#panelTotal');
    const panelCorrect = $('#panelCorrect');
    const panelWrong = $('#panelWrong');
    const panelPending = $('#panelPending');
    const panelScore = $('#panelScore');
    const panelFill = $('#panelProgressFill');

    if (panelIdx) panelIdx.textContent = state.idx + 1;
    if (panelTotal) panelTotal.textContent = stats.total;
    if (panelCorrect) panelCorrect.textContent = stats.correct;
    if (panelWrong) panelWrong.textContent = stats.wrong;
    if (panelPending) panelPending.textContent = stats.pending;
    if (panelScore) panelScore.textContent = stats.score + '%';
    if (panelFill) panelFill.style.width = ((state.idx + 1) / stats.total * 100) + '%';

    // Botones
    const btnPrev = $('#btnPrev');
    const btnNext = $('#btnNext');
    const btnFinish = $('#btnFinish');

    if (btnPrev) btnPrev.disabled = state.idx === 0;
    if (btnNext) btnNext.disabled = state.idx === state.order.length - 1;
    if (btnFinish) btnFinish.disabled = stats.answered < stats.total;
  }

  /* ═══════════════════════════════════════════════════════
     FILTROS
     ═══════════════════════════════════════════════════════ */

  function filterPending() {
    cerrarPanel();
    const pending = [];
    QUESTIONS.forEach((q, i) => {
      const a = state.answers[q.id];
      if (!a || !a.answered) pending.push(i);
    });
    if (pending.length === 0) {
      toast('🎉 ¡No quedan preguntas pendientes!');
      return;
    }
    state.order = shuffle(pending);
    state.idx = 0;
    saveState();
    render();
    updateProgress();
    toast('🎯 ' + pending.length + ' preguntas pendientes');
  }

  function filterWrong() {
    cerrarPanel();
    const wrong = [];
    QUESTIONS.forEach((q, i) => {
      const a = state.answers[q.id];
      if (a && a.answered && !a.isCorrect) wrong.push(i);
    });
    if (wrong.length === 0) {
      toast('✨ No tienes preguntas falladas');
      return;
    }
    state.order = shuffle(wrong);
    state.idx = 0;
    saveState();
    render();
    updateProgress();
    toast('❌ ' + wrong.length + ' preguntas falladas para repasar');
  }

  /* ═══════════════════════════════════════════════════════
     CORREGIR TODO (modo examen)
     ═══════════════════════════════════════════════════════ */

  function finishAll() {
    state.finished = true;
    saveState();
    render();
    updateProgress();
    showResultModal();
  }

  function showResultModal() {
    const stats = computeStats();
    const body = $('#modalResultBody');
    if (!body) return;

    let msg = '';
    if (stats.score >= 90) msg = '🏆 ¡Excelente! Estás preparado.';
    else if (stats.score >= 70) msg = '👍 Buen trabajo. Repasa los fallos.';
    else if (stats.score >= 50) msg = '📚 Vas por buen camino, sigue repasando.';
    else msg = '💪 Necesitas repasar más. ¡Ánimo!';

    body.innerHTML = `
      <div class="result-score-big">
        <div class="result-score-value">${stats.score}%</div>
        <div class="result-score-label">${stats.correct} de ${stats.total} correctas</div>
      </div>

      <div class="result-stats">
        <div class="result-stat ok">
          <div class="result-stat-icon">✅</div>
          <div class="result-stat-value">${stats.correct}</div>
          <div class="result-stat-label">Correctas</div>
        </div>
        <div class="result-stat bad">
          <div class="result-stat-icon">❌</div>
          <div class="result-stat-value">${stats.wrong}</div>
          <div class="result-stat-label">Falladas</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-icon">⚪</div>
          <div class="result-stat-value">${stats.pending}</div>
          <div class="result-stat-label">Sin contestar</div>
        </div>
      </div>

      <div class="result-message">${msg}</div>
    `;

    openModal('modalResult');
  }

  /* ═══════════════════════════════════════════════════════
     RESET
     ═══════════════════════════════════════════════════════ */

  /* ─── Panel colapsable (móvil) ─── */
  function abrirPanel() {
    const panel = $('#panel');
    const overlay = $('#panelOverlay');
    if (!panel) return;
    panel.classList.add('panel-abierto');
    if (overlay) overlay.classList.add('panel-abierto');
  }

  function cerrarPanel() {
    const panel = $('#panel');
    const overlay = $('#panelOverlay');
    if (!panel) return;
    panel.classList.remove('panel-abierto');
    if (overlay) overlay.classList.remove('panel-abierto');
  }

  function resetAll() {
    if (!confirm('¿Reiniciar todo? Se borrarán tus respuestas.')) return;

    state.answers = {};
    state.finished = false;
    state.reviewed = false;
    state.optOrder = {};
    state.idx = 0;
    initOrder();

    saveState();
    render();
    updateProgress();
    toast('🔄 Todo reiniciado');
  }

  /* ═══════════════════════════════════════════════════════
     EXPORTAR / IMPORTAR RESPUESTAS
     ═══════════════════════════════════════════════════════ */

  function exportAnswers() {
    const data = {
      version: 1,
      fecha: new Date().toISOString(),
      mode: state.mode,
      answers: state.answers,
      stats: computeStats()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'testrouter-respuestas-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('📤 Respuestas exportadas');
  }

  function importAnswers() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data && data.answers) {
            state.answers = data.answers;
            saveState();
            render();
            updateProgress();
            toast('📥 Respuestas importadas');
          } else {
            toast('❌ Formato incorrecto');
          }
        } catch (err) {
          toast('❌ Error al leer el archivo');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /* ═══════════════════════════════════════════════════════
     ARRANQUE
     ═══════════════════════════════════════════════════════ */

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
