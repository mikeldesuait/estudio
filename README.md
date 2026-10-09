# 📚 Estudio Personal

> Aplicación web personal para organizar el estudio del Grado en Derecho, PNL, Networking y otras áreas de formación continua.

## 🎯 ¿Qué es?

Un sistema 100% local (sin backend) para gestionar todo el estudio desde el navegador:

- 📂 Organizar asignaturas por áreas, cursos y semestres
- 📖 Estudiar temas con subrayado y resaltado persistente
- ✍️ Tomar apuntes en un cuaderno digital con dibujo y texto
- 🏅 Practicar exámenes con exam trainers tipo test
- ⏱️ Gestionar el tiempo con Pomodoro integrado
- 📅 Planificar el día con agenda y calendario
- 💾 Backup completo con export/import de datos

Demo online: https://mikeldesuait.github.io/estudio/

## 🏗️ Arquitectura

La app sigue una arquitectura de shell + vistas inspirada en un navegador con pestañas. Cada pestaña mantiene su propio historial, scroll y estado. Las asignaturas se abren como iframes persistentes dentro de su pestaña.

Estructura del shell:

- Topbar: logo, pomodoro, racha, progreso y botones de acción
- Tabbar: pestañas fijas (Escritorio + áreas) y pestañas de asignaturas
- Contenidos: cada pestaña con su propio contenedor con scroll y estado
- Statusbar: tiempo de hoy, tareas, repasos y contexto actual

## 📁 Estructura del proyecto

- index.html — Punto de entrada
- css/ — Estilos
  - styles.css — Estilos base
  - themes.css — Temas claro / oscuro
  - shell/ — Estilos por componente
- js/ — JavaScript
  - core/ — Núcleo del shell (shell.js, router.js, navegacion.js, bookmarks.js, ajustes.js, lectura.js)
  - core/cuaderno/ — Módulo cuaderno digital (12 archivos)
  - vistas/ — Vistas principales (index.js, escritorio.js)
  - widgets/ — Widgets del escritorio (pomodoro, progreso, agenda)
  - estudio-subrayado.js — Script de subrayado
- estudio/ — Contenido
  - grado-derecho/ — 46 asignaturas con cursos y semestres
  - pnl/ — Practitioner y Hábitos Atómicos
  - networking/ — Cisco y Test Router
  - herramientas/ — Creador de prompts
  - dieta/ — Planificación alimentaria
- README.md — Este archivo

## 🚀 Cómo arrancar

En local:

    cd ~/estudio
    python3 -m http.server 8000

Y abre: http://localhost:8000/estudio/

En producción (GitHub Pages): https://mikeldesuait.github.io/estudio/

## 🧩 Módulos principales

### 🖥️ Shell

Contenedor persistente de toda la app. Gestiona pestañas fijas, historial por pestaña, caché de HTML y persistencia de marcadores abiertos.

Ficheros: js/core/shell.js, css/shell/shell.css

### 🏠 Escritorio

Dashboard tipo corcho con widgets arrastrables: botones de áreas, calendario (día/semana/mes) y post-its de notas. Modo mover ON/OFF con interact.js.

Ficheros: js/vistas/escritorio.js, css/shell/escritorio.css

### 📓 Cuaderno Digital

Editor completo con múltiples cuadernos, hojas con corte automático de texto, formato (negrita, cursiva, subrayado, colores), dibujo en canvas (lápiz, resaltador, borrador, undo/redo), plantillas (rayada, cuadriculada, lisa), export a PDF y sidebar responsive con botón ☰.

Ficheros: js/core/cuaderno/*, css/shell/cuaderno.css

### 🎨 Subrayado en temas

Script inyectado en cada tema HTML que añade una barra flotante para resaltar (3 colores), subrayar (2 colores), guardar marcas y exportar/importar en JSON.

Ficheros: js/estudio-subrayado.js

### 🏅 Test Router (Exam Trainer)

Exam trainer para el Cisco 800-150 con 100 preguntas del PDF oficial v4.1. Tres tipos: MCQ, MSQ, MATCH. Dos modos: Estudio y Examen. Traducción al español en modo estudio. Explicaciones EN + ES. MATCH con líneas SVG. Panel colapsable en iPad vertical.

Ficheros: estudio/networking/testrouter/*

### ⏱️ Pomodoro

Widget en el topbar. Ciclos de 25/5 min configurables, sesiones agrupadas y configuración persistente.

Ficheros: js/widgets/pomodoro.js

### 📅 Agenda / Calendario

Vistas de día, semana y mes. Eventos con título, hora y descripción. Modal para crear, editar y eliminar.

Ficheros: js/widgets/agenda-modal.js

## 🗂️ Contenido actual

- grado-derecho: 46 asignaturas
- pnl: 2 asignaturas
- networking: 2 asignaturas
- herramientas: 1 asignatura
- dieta: 1 asignatura

Total: 52 asignaturas

## 💾 Persistencia

Todo el estado se guarda en localStorage del navegador.

- progreso_[ASIGNATURA]_[TEMA] — Progreso por tema
- aprobada_[AREA]_[ASIGNATURA] — Estado de aprobado
- escritorio_elementos — Widgets del escritorio
- eventos_calendario — Eventos de la agenda
- estudio:cuaderno:v1 — Cuadernos digitales
- estudio-subrayado:<path> — Marcas de subrayado
- testrouter_v1 — Respuestas del exam trainer
- theme — Tema claro/oscuro

Backup: Ajustes → Exportar genera un JSON con todo. Ajustes → Importar lo restaura.

## 🔧 Cómo crear contenido nuevo

### Nueva asignatura

1. Crear carpeta estudio/<area>/<asignatura>/
2. Añadir config.json con metadatos
3. Añadir asignatura.html
4. Añadir carpeta temas/ con los temas
5. Registrar en estudio/<area>/asignaturas.json

### Nuevo tema

1. Crear carpeta temas/temaN/
2. Crear el HTML del tema
3. Añadirlo al config.json con archivo: "temaN.html"

### Nuevo exam trainer

La estructura de preguntas.js debe exportar un array QUESTIONS con esta forma:

- id: identificador único
- type: "mcq", "msq", "dragMatch" o "dropOrder"
- q: enunciado en inglés
- options: objeto con opciones A, B, C, D (para mcq/msq)
- ok: respuesta correcta
- exp_en: explicación en inglés
- exp_es: explicación en español

Registrar el trainer en asignaturas.json del área.

## 🛠️ Tecnologías

- HTML5 + CSS3 con variables para temas
- JavaScript ES6+ vanilla, sin frameworks ni bundler
- localStorage para persistencia, sin backend
- postMessage para comunicación iframe ↔ shell
- fetch() para cargar config.json
- GitHub Pages para hosting

Dependencias externas (todas vía CDN): interact.js (drag & drop), Font Awesome (iconos), Google Fonts Inter (tipografía).

## 📌 Convenciones

- Rutas absolutas desde GitHub Pages: /estudio/...
- Nombres de archivos en español: navegacion.js, ajustes.js
- Prefijos CSS por módulo: .shell-, .cd- (cuaderno), .esb- (subrayado)
- Sin frameworks: por simplicidad y para evitar dependencias

## 📜 Licencia

Uso personal / educativo.

## 🌐 English summary

Personal study app built with vanilla HTML/CSS/JS, no backend. Organizes subjects by areas, provides a digital notebook with drawing support, an exam trainer (Cisco 800-150), text highlighting, Pomodoro timer and calendar. All state persisted in localStorage. Hosted on GitHub Pages.

Live: https://mikeldesuait.github.io/estudio/# Estudio Personal
