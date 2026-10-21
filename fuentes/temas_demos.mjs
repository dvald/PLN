// Datos comunes de la navegación de las demos: bloques de color, temas y sus iconos.
// Los usa fuentes/generar_navegacion.mjs para escribir el índice, las cabeceras y los menús de cada página.
// Títulos de los temas: guía docente 2026/27 (curso_actual/guia_docente_texto.txt); el del Tema 1 va abreviado.
// Semanas y clases: programación 2026/27 (tabla del CLAUDE.md del proyecto).

export const BLOQUES = {
  texto: { nombre: "Texto como dato y extracción", color: "#1E88E5", fuerte: "#1E88E5", claro: "#E3F2FD", tab: "#64B5F6" },
  estad: { nombre: "Modelado estadístico y tópicos", color: "#00897B", fuerte: "#00897B", claro: "#E0F2F1", tab: "#4DB6AC" },
  neuronal: { nombre: "Modelos neuronales: embeddings, Transformers y LLM", color: "#8E24AA", fuerte: "#8E24AA", claro: "#F3E5F5", tab: "#CE93D8" },
  aplic: { nombre: "Aplicaciones, sentimientos y visualización", color: "#F57C00", fuerte: "#E65100", claro: "#FFF3E0", tab: "#FFB74D" },
  repaso: { nombre: "Fuera de las clases", color: "#9AA5B1", fuerte: "#52606D", claro: "#F5F7FA", tab: "#B0BEC5" },
};

// Orden de los bloques en el índice
export const ORDEN_BLOQUES = ["texto", "estad", "neuronal", "aplic"];

export const TEMAS = [
  { n: 1, f: "01_introduccion.html", bloque: "texto", titulo: "Introducción al PLN y la minería de textos", corto: "Introducción",
    desc: "Qué es el PLN y en qué se diferencia de la minería de textos, su historia, sus aplicaciones y por qué el lenguaje es difícil para una máquina.",
    clases: "Clases 1 y 2", semanas: [1] },
  { n: 2, f: "02_texto_como_dato.html", bloque: "texto", titulo: "El texto como dato", corto: "El texto como dato",
    desc: "Cómo se convierte un texto en datos: frecuencias, morfología, tokenización, normalización, raíces y lemas, y los recursos en español.",
    clases: "Clases 3 y 4", semanas: [2], extra: "semanas 2 y 3" },
  { n: 3, f: "03_extraccion_informacion.html", bloque: "texto", titulo: "Extracción de información de textos", corto: "Extracción de información",
    desc: "De la frase a la tabla: categorías gramaticales, grupos nominales, entidades y relaciones, y la comparación entre raíz y lema.",
    clases: "Clase 4", semanas: [3] },
  { n: 4, f: "04_modelado_lenguaje.html", bloque: "estad", titulo: "Modelado del lenguaje", corto: "Modelado del lenguaje",
    desc: "Contar para representar y para predecir: bolsa de palabras, TF-IDF, n-gramas, suavizado, perplejidad y generación con el Quijote.",
    clases: "Clases 5 y 6", semanas: [4] },
  { n: 5, f: "05_modelado_neuronal.html", bloque: "neuronal", titulo: "Modelado de lenguaje neuronal (I)", corto: "Modelado neuronal (I)",
    desc: "De contar a aprender vectores: skip-gram y CBOW, FastText, redes recurrentes, atención, el bloque Transformer y BERT.",
    clases: "Clases 7 y 8", semanas: [5, 6] },
  { n: 6, f: "06_topicos.html", bloque: "estad", titulo: "Análisis y modelado de tópicos", corto: "Tópicos",
    desc: "Clasificar, agrupar y descubrir temas: n-gramas, Naive Bayes, LSA, NMF y LDA con noticias y el Quijote, y entidades con spaCy.",
    clases: "Clases 9, 10 y 11 y laboratorio", semanas: [7, 8] },
  { n: 7, f: "07_sentimientos.html", bloque: "aplic", titulo: "Análisis de sentimientos y minería de opiniones", corto: "Sentimientos",
    desc: "Qué opina un texto y sobre qué: niveles, léxico con negación, Naive Bayes frente a BETO, aspectos, PMI, spam y emociones.",
    clases: "Clases 12 y 13", semanas: [9] },
  { n: 8, f: "08_modelado_neuronal_ii.html", bloque: "neuronal", titulo: "Modelado de lenguaje neuronal (II)", corto: "Modelado neuronal (II)",
    desc: "Los Transformers por dentro y en uso: máscaras, generación, huecos, subpalabras, ajuste fino frente a prompts, destilación y alineación.",
    clases: "Clases 14 y 15", semanas: [10, 11] },
  { n: 9, f: "09_aplicaciones.html", bloque: "aplic", titulo: "Aplicaciones de procesamiento de lenguaje natural", corto: "Aplicaciones",
    desc: "Traducción, resumen, agentes, búsqueda, preguntas y respuestas y voz, con salidas reales de modelos y sus métricas.",
    clases: "Clase 16", semanas: [12] },
  { n: 10, f: "10_visualizacion.html", bloque: "aplic", titulo: "Visualización de textos", corto: "Visualización",
    desc: "Ver los textos: mapas de documentos, tópicos, nubes de palabras, coocurrencias, árboles de palabras, gramática y huellas de estilo.",
    clases: "Clases 17, 19 y 20", semanas: [13, 14, 15] },
];

export const REPASO = {
  f: "repaso.html", bloque: "repaso", etiqueta: "REPASO", titulo: "Repaso de los tests · estudio autónomo",
  desc: "Las preguntas de repaso de los Temas 5 a 10, con su explicación al responder. No se usan en las clases en directo: son para que cada estudiante compruebe lo que ha estudiado.",
  pie: "Temas 5 a 10 · sin puntuación",
};

// Iconos de 48 × 48 dibujados con currentColor (el color lo pone quien los usa). Son símbolos, no datos.
const T = 'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
const R = 'fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2.2"';
export const GLIFOS = {
  // 1 · un bocadillo con texto: el lenguaje
  1: `<path d="M9 8h30a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H21l-9 8v-8H9a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" ${R}/><path d="M12 16h24M12 24h15" fill="none" ${T}/>`,
  // 2 · tokens y su frecuencia (Zipf)
  2: `<g ${R}><rect x="3" y="5" width="15" height="10" rx="3"/><rect x="20" y="5" width="9" height="10" rx="3"/><rect x="31" y="5" width="14" height="10" rx="3"/></g><g fill="currentColor"><rect x="5" y="20" width="6" height="23" rx="1.5"/><rect x="13" y="30" width="6" height="13" rx="1.5"/><rect x="21" y="35" width="6" height="8" rx="1.5"/><rect x="29" y="38" width="6" height="5" rx="1.5"/><rect x="37" y="39.5" width="6" height="3.5" rx="1.2"/></g>`,
  // 3 · del texto a la tabla
  3: `<path d="M4 12h13M4 19h9M4 26h13M4 33h7" fill="none" ${T}/><path d="M19 22.5h7m-3-3 3 3-3 3" fill="none" ${T}/><rect x="29" y="8" width="15" height="30" rx="2.5" ${R}/><path d="M29 18h15M29 28h15M36.5 8v30" fill="none" stroke="currentColor" stroke-width="2"/>`,
  // 4 · dos palabras y la probabilidad de la siguiente
  4: `<g ${R}><rect x="2" y="18" width="12" height="11" rx="3"/><rect x="16" y="18" width="12" height="11" rx="3"/></g><path d="M29.5 23.5h4" fill="none" ${T}/><g fill="currentColor"><rect x="36" y="11" width="10" height="5" rx="1.5"/><rect x="36" y="21" width="7" height="5" rx="1.5" fill-opacity=".7"/><rect x="36" y="31" width="4" height="5" rx="1.5" fill-opacity=".45"/></g>`,
  // 5 · vectores de palabras: dos cercanos y uno lejano
  5: `<path d="M6 42V6M6 42h36" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity=".45" stroke-linecap="round"/><path d="M6 42 35 14M6 42 40 23M6 42 15 9" fill="none" ${T}/><g fill="currentColor"><circle cx="35" cy="14" r="4"/><circle cx="40" cy="23" r="4"/><circle cx="15" cy="9" r="4" fill-opacity=".55"/></g>`,
  // 6 · documentos agrupados en tópicos
  6: `<g fill="currentColor"><circle cx="10" cy="12" r="3.6"/><circle cx="17" cy="9" r="3.6"/><circle cx="15" cy="17" r="3.6"/><circle cx="34" cy="13" r="3.6" fill-opacity=".55"/><circle cx="40" cy="18" r="3.6" fill-opacity=".55"/><circle cx="33" cy="21" r="3.6" fill-opacity=".55"/><circle cx="20" cy="35" r="3.6" fill-opacity=".3"/><circle cx="27" cy="39" r="3.6" fill-opacity=".3"/><circle cx="28" cy="31" r="3.6" fill-opacity=".3"/></g><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"><circle cx="14" cy="13" r="10"/><circle cx="36" cy="17" r="10"/><circle cx="25" cy="35" r="10"/></g>`,
  // 7 · la polaridad como un indicador de negativo a positivo
  7: `<path d="M7 34a17 17 0 0 1 34 0" fill="none" stroke="currentColor" stroke-width="6" stroke-opacity=".22" stroke-linecap="round"/><path d="M28.5 17.6A17 17 0 0 1 41 34" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M24 34 33 22" fill="none" ${T} stroke-width="3"/><circle cx="24" cy="34" r="4" fill="currentColor"/><path d="M8 42h8M32 42h8M36 38v8" fill="none" ${T}/>`,
  // 8 · bloques Transformer apilados con la atención encima
  8: `<path d="M12 14Q18 3 24 14M24 14Q30 3 36 14M12 14Q24-4 36 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><g ${R}><rect x="6" y="17" width="36" height="9" rx="2.5"/><rect x="6" y="29" width="36" height="9" rx="2.5"/></g><g fill="currentColor"><circle cx="12" cy="43" r="2.6"/><circle cx="24" cy="43" r="2.6"/><circle cx="36" cy="43" r="2.6"/></g>`,
  // 9 · traducción: de un bocadillo a otro
  9: `<path d="M6 5h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H13l-6 5v-5H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" ${R}/><path d="M24 22h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-1v5l-6-5H24a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3z" fill="currentColor" stroke="currentColor" stroke-width="2.2"/><path d="M8 11h11M8 16h7" fill="none" ${T}/><path d="M26 28h14M26 33h9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`,
  // 10 · una nube de palabras
  10: `<g fill="currentColor"><rect x="4" y="8" width="21" height="9" rx="2.5"/><rect x="28" y="10" width="15" height="6" rx="2" fill-opacity=".6"/><rect x="8" y="21" width="34" height="11" rx="2.5"/><rect x="4" y="36" width="11" height="5" rx="2" fill-opacity=".45"/><rect x="18" y="35" width="20" height="7" rx="2" fill-opacity=".75"/></g>`,
  // repaso · una lista comprobada
  repaso: `<rect x="7" y="5" width="34" height="39" rx="4" ${R}/><path d="M13 16l3 3 6-6M13 28l3 3 6-6" fill="none" ${T}/><path d="M27 17h9M27 29h9M13 38h23" fill="none" ${T}/>`,
};

export const glifo = (k, clase = "") =>
  `<svg${clase ? ` class="${clase}"` : ""} viewBox="0 0 48 48" aria-hidden="true" focusable="false">${GLIFOS[k]}</svg>`;
