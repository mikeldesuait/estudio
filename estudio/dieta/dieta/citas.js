/* ============================================================
   CITAS MOTIVACIONALES — Para menús semanales
   Adaptadas a niños y familia
   50 citas que se muestran 1 por semana
   ============================================================ */

const CITAS = [
  { texto: 'Un plato con muchos colores es un plato que da energía para jugar, aprender y crecer.', emoji: '🌈' },
  { texto: 'Comer de todos los colores es como pintar un cuadro en tu plato.', emoji: '🎨' },
  { texto: 'La fruta y la verdura son los superpoderes de las comidas.', emoji: '🦸' },
  { texto: 'Cada color que pruebas te hace un poquito más fuerte.', emoji: '💪' },
  { texto: 'La comida no es solo para llenar la barriga: es para cuidar el cuerpo.', emoji: '❤️' },
  { texto: 'Probar un alimento nuevo es como abrir una puerta hacia un sabor desconocido.', emoji: '🚪' },
  { texto: 'A veces lo que no conoces se convierte en tu comida favorita.', emoji: '🌟' },
  { texto: 'Dar el primer bocado es el paso más valiente del día.', emoji: '🦁' },
  { texto: 'Si un alimento no te gusta hoy, puede gustarte mañana. Dale otra oportunidad.', emoji: '🔄' },
  { texto: 'Descubrir nuevos sabores es una aventura que se hace con la boca.', emoji: '🗺️' },
  { texto: 'Un buen desayuno es como ponerle gasolina al coche antes de arrancar.', emoji: '⛽' },
  { texto: 'Desayunar bien te ayuda a pensar más rápido en el colegio.', emoji: '🧠' },
  { texto: 'El desayuno es el primer abrazo del día a tu cuerpo.', emoji: '🤗' },
  { texto: 'Sin desayuno, el cerebro se queda sin música.', emoji: '🎵' },
  { texto: 'Un desayuno con fruta es un desayuno con chispa.', emoji: '⚡' },
  { texto: 'El agua es la bebida más valiente: no necesita color ni azúcar para ser la mejor.', emoji: '💧' },
  { texto: 'Beber agua es como regar una planta: te ayuda a crecer fuerte.', emoji: '🌱' },
  { texto: 'Tu cuerpo es más agua que otra cosa: ¡cuídala!', emoji: '🌊' },
  { texto: 'Un vaso de agua a tiempo alegra el cuerpo y despeja la mente.', emoji: '💙' },
  { texto: 'Cuando tienes sed, tu cuerpo te está pidiendo agua, no refrescos.', emoji: '🚰' },
  { texto: 'Comer en familia es el mejor condimento.', emoji: '👨‍👩‍👧' },
  { texto: 'La mesa compartida sabe mucho mejor.', emoji: '🍽️' },
  { texto: 'Ayudar a poner la mesa también es parte de la comida.', emoji: '🍴' },
  { texto: 'Cocinar juntos es una receta que siempre sale bien.', emoji: '👩‍🍳' },
  { texto: 'Comer despacio es saborear el doble.', emoji: '🐢' },
  { texto: 'Comer bien es quererse bien.', emoji: '💚' },
  { texto: 'Tu cuerpo es tu casa: la comida es el material con el que la cuidas.', emoji: '🏠' },
  { texto: 'Si tu plato te da energía, tu día irá mejor.', emoji: '☀️' },
  { texto: 'Los alimentos buenos son como pequeños ayudantes dentro de ti.', emoji: '🧚' },
  { texto: 'Cada comida es una oportunidad para sentirse bien.', emoji: '✨' },
  { texto: 'Las frutas y verduras de temporada saben a lo que toca.', emoji: '🍂' },
  { texto: 'Plantar algo y verlo crecer enseña a valorar la comida.', emoji: '🌻' },
  { texto: 'Cocinar tu propia comida es un superpoder que se aprende.', emoji: '🦸‍♂️' },
  { texto: 'Los alimentos que vienen de la tierra son regalos de la naturaleza.', emoji: '🎁' },
  { texto: 'Un huerto pequeño en casa puede dar grandes alegrías.', emoji: '🌿' },
  { texto: 'Tirar comida es tirar el trabajo de muchas personas.', emoji: '🙏' },
  { texto: 'Aprovechar las sobras es de sabios.', emoji: '🧠' },
  { texto: 'Comer lo que hay en casa también es una forma de cuidar el planeta.', emoji: '🌍' },
  { texto: 'Un plato limpio es un plato agradecido.', emoji: '🌞' },
  { texto: 'La comida no se tira: se comparte o se transforma.', emoji: '♻️' },
  { texto: 'Un buen hábito empieza con una buena comida.', emoji: '🌱' },
  { texto: 'Comer sano un día es fácil; comer sano cada día es un logro.', emoji: '🏆' },
  { texto: 'Los pequeños cambios en la mesa se notan mucho con el tiempo.', emoji: '⏳' },
  { texto: 'La constancia es el ingrediente secreto de una vida saludable.', emoji: '🗝️' },
  { texto: 'Cada comida cuenta, incluso las que parecen pequeñas.', emoji: '⭐' },
  { texto: 'Una familia que come junta, crece junta.', emoji: '💕' },
  { texto: 'Si hoy has comido bien, celébralo.', emoji: '🎉' },
  { texto: 'No hay comida perfecta: hay comidas que te hacen bien.', emoji: '🌼' },
  { texto: 'Compartir un plato es compartir un momento.', emoji: '🤝' },
  { texto: 'Cuidar lo que comes es cuidar a quien más quieres: tú.', emoji: '🥰' }
];

/* ═══════════════════════════════════════════════════════
   FUNCIONES
   ═══════════════════════════════════════════════════════ */

/**
 * Devuelve el número de semana ISO del año (1-53).
 * @param {Date} fecha
 * @returns {number}
 */
function numeroSemanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaSemana = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
  const añoInicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numeroSemana = Math.ceil(((d - añoInicio) / 86400000 + 1) / 7);
  return numeroSemana;
}

/**
 * Devuelve la cita correspondiente a la semana actual.
 * Usa el número de semana ISO como semilla para que sea siempre la misma
 * durante toda la semana.
 * @returns {{texto: string, emoji: string, numeroSemana: number}}
 */
function elegirCitaSemanal() {
  const numSemana = numeroSemanaISO(new Date());
  const idx = (numSemana - 1) % CITAS.length;
  return { ...CITAS[idx], numeroSemana: numSemana };
}

/**
 * Devuelve una cita aleatoria (para menús guardados que no la tengan).
 * @returns {{texto: string, emoji: string}}
 */
function citaAleatoria() {
  const idx = Math.floor(Math.random() * CITAS.length);
  return { ...CITAS[idx] };
}

/**
 * Devuelve una cita por su índice (0-49).
 * @param {number} idx
 * @returns {{texto: string, emoji: string}}
 */
function citaPorIndice(idx) {
  const i = ((idx % CITAS.length) + CITAS.length) % CITAS.length;
  return { ...CITAS[i] };
}

/**
 * Devuelve el número de la semana del año desde una fecha (por defecto hoy).
 * @param {Date} [fecha]
 * @returns {number}
 */
function semanaDelAño(fecha = new Date()) {
  return numeroSemanaISO(fecha);
}

// Exponer globalmente
window.CITAS = CITAS;
window.elegirCitaSemanal = elegirCitaSemanal;
window.citaAleatoria = citaAleatoria;
window.citaPorIndice = citaPorIndice;
window.semanaDelAño = semanaDelAño;
window.numeroSemanaISO = numeroSemanaISO;

console.log('✅ Citas cargadas: ' + CITAS.length + ' disponibles');
