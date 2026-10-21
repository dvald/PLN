import { readFileSync, writeFileSync } from "node:fs";
// Lee las demos originales (antes de la reconversión del 12/10/2026), copiadas en revision/demos_visuales_2026-10-12/originales/
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = RAIZ + "/revision/demos_visuales_2026-10-12/originales/";
const FUENTES = [
  [5, "05_modelado_neuronal.html", "QUIZ"], [6, "06_topicos.html", "QUIZ"], [7, "07_sentimientos.html", "QUIZ"],
  [8, "08_modelado_neuronal_ii.html", "PREG"], [9, "09_aplicaciones.html", "TEST"], [10, "10_visualizacion.html", "P"],
];
function literal(src, nombre) {
  const re = new RegExp(`(?:const|let) ${nombre} = \\[`, "g");
  let m, ultimo = -1;
  while ((m = re.exec(src))) ultimo = m.index + m[0].length - 1;
  if (ultimo < 0) throw new Error("no encontrado " + nombre);
  let i = ultimo, prof = 0, cad = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (cad) { if (c === "\\") { i++; continue; } if (c === cad) cad = null; continue; }
    if (c === '"' || c === "'" || c === "`") { cad = c; continue; }
    if (c === "[") prof++;
    else if (c === "]") { prof--; if (!prof) break; }
  }
  return src.slice(ultimo, i + 1);
}
const out = {};
for (const [t, f, n] of FUENTES) {
  const src = readFileSync(DIR + f, "utf8");
  const arr = Function("return " + literal(src, n))();
  const panel = src.slice(src.indexOf('id="p-rep"'), src.indexOf('id="p-rep"') + 1500);
  out[t] = { preguntas: arr.map((x) => Array.isArray(x) ? { p: x[0], o: x[1], c: x[2], e: x[3] } : { p: x.p, o: x.o, c: x.c, e: x.e }),
    etiquetas: [...panel.matchAll(/<span class="tag[^"]*">([^<]+)<\/span>/g)].map((m) => m[1]),
    intro: (panel.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || "" };
}
const META = {
  5: { titulo: "Tema 5 · Modelado del lenguaje neuronal (I)", origen: "Preguntas de comprobación preparadas con la demo del tema (no son el test oficial)." },
  6: { titulo: "Tema 6 · Análisis y modelado de tópicos", origen: "Las diez preguntas del test del tema (pp. 57-60), con la respuesta razonada. Donde el tema es ambiguo se aceptan dos respuestas." },
  7: { titulo: "Tema 7 · Análisis de sentimientos y minería de opiniones", origen: "Las diez preguntas del test del tema (pp. 67-71), con la respuesta razonada." },
  8: { titulo: "Tema 8 · Modelado del lenguaje neuronal (II)", origen: "Preguntas de comprobación preparadas con la demo del tema (no son el test oficial)." },
  9: { titulo: "Tema 9 · Aplicaciones de PLN", origen: "Las diez preguntas del test del tema (pp. 58-63, 0 puntos). La explicación cita la página del tema y, cuando hay matiz, lo medido en clase. La clave es la deducida del texto: si la del aula difiere, prevalece la del aula." },
  10: { titulo: "Tema 10 · Visualización de textos", origen: "Preguntas de práctica; el test oficial está en el aula." },
};
// En el Tema 5 la respuesta correcta era siempre la primera: se alterna como hacía su demo
out[5].preguntas.forEach((x, i) => { if (i % 2 === 1) { x.o = x.o.slice().reverse(); x.c = x.o.length - 1 - x.c; } });
const TEXTOS_PUBLICOS = {
  "Preguntas de comprobación preparadas con la demo del tema (no son el test oficial).": "Preguntas de práctica con respuesta razonada.",
  "Evita recorrer todo el vocabulario en cada par; el tema (p. 11) mezcla ambas formulaciones.": "Evita recorrer todo el vocabulario en cada par de entrenamiento.",
  "12 capas con 12 cabezas cada una. El tema (p. 50) habla de «doce capas multihead»: son 12 cabezas por capa.": "BERT-base tiene 12 capas con 12 cabezas de atención en cada una.",
  "Las diez preguntas del test del tema (pp. 57-60), con la respuesta razonada. Donde el tema es ambiguo se aceptan dos respuestas.": "Preguntas de repaso con respuesta razonada. Algunas admiten más de una opción.",
  "5. Técnicas que generan features para clasificar tópicos (según la p. 17 del tema):": "5. Técnicas que generan características para clasificar tópicos:",
  "Pregunta ambigua: el tema clasifica tokenización y palabras vacías como preprocesado, y NER y vectorización como generación de features. Respuesta más defendible: B y D.": "El reconocimiento de entidades y la vectorización generan características. La tokenización y la eliminación de palabras vacías preparan el texto.",
  "F1 combina precisión y exhaustividad (Clase 10). Con data drift hay que reentrenar.": "F1 combina precisión y exhaustividad. Los cambios en los datos pueden hacer necesario reentrenar el modelo.",
  "Ojo: los tópicos de LSA tienen signo arbitrario y están anidados (correcciones a las pp. 33 y 35).": "LSA aplica SVD a la matriz de documentos y términos para obtener componentes latentes.",
  "Las diez preguntas del test del tema (pp. 67-71), con la respuesta razonada.": "Preguntas de repaso con respuesta razonada.",
  "Definición del tema (pp. 5-6): la polaridad del sujeto de opinión hacia el objeto, a partir del texto.": "Se identifica en el texto la polaridad del sujeto de opinión hacia el objeto.",
  "Es el método no supervisado de Turney (2002; el tema lo atribuye a Turney y Littman, 2003): SO = PMI(frase, excellent) - PMI(frase, poor).": "El método no supervisado de Turney (2002) calcula SO = PMI(frase, excellent) - PMI(frase, poor).",
  "Las tres aparecen entre los rasgos de Jindal y Liu que recoge el tema (pp. 47-49): feedback, longitud y calificaciones.": "Las tres son rasgos analizados por Jindal y Liu: feedback, longitud y calificaciones.",
  "Un vector por token, que el decodificador consulta con atención cruzada (corrige la p. 8 del tema).": "Un vector por token, que el decodificador consulta mediante atención cruzada.",
  "Las diez preguntas del test del tema (pp. 58-63, 0 puntos). La explicación cita la página del tema y, cuando hay matiz, lo medido en clase. La clave es la deducida del texto: si la del aula difiere, prevalece la del aula.": "Preguntas de repaso con respuesta razonada.",
  "Atención cruzada: Q del decodificador y K, V del codificador (p. 15). En la figura 7, la causal va antes que la cruzada.": "En la atención cruzada, Q procede del decodificador y K y V proceden del codificador.",
  "Matiz: el texto (pp. 20-22) resume con un LM causal y un delimitador δ, y el esquema de la p. 3 dice lo contrario; C es falsa porque ambos se entrenan con teacher forcing.": "El resumen dispone del texto de entrada completo y puede usar un codificador bidireccional. También puede generarse con un modelo causal. Ambas tareas admiten teacher forcing durante el entrenamiento.",
  "En la Clase 17, d15 y e13 eran vecinas en el mapa con coseno 0. La distancia del mapa es una pista.": "Las noticias d15 y e13 aparecen próximas en el mapa pese a tener coseno 0. La distancia proyectada no garantiza similitud en el espacio original.",
  "¿Qué ventaja tiene una proyección lineal como PCA, según el tema?": "¿Qué ventaja tiene una proyección lineal como PCA?",
  "Preguntas de práctica; el test oficial está en el aula.": "Preguntas de práctica con respuesta razonada."
};
const textoPublico = (_, valor) => typeof valor === "string" ? (TEXTOS_PUBLICOS[valor] ?? valor).replace(/ \((?:p\.|pp\.|Figura)\s*[\d–-]+\)/g, "") : valor;
const datos = Object.fromEntries(Object.entries(out).map(([t, v]) => [t, { ...META[t], preguntas: v.preguntas }]));
writeFileSync(RAIZ + "/Demos/repaso_datos.js", "// Repaso de los tests para el estudio autónomo (no se usa en clase). Generado por Demos/fuentes/extraer_repasos.mjs\n// a partir de las pestañas de repaso de las demos de los Temas 5 a 10 (versión del 12/10/2026 anterior a la reconversión visual).\nwindow.REPASO = " + JSON.stringify(datos, textoPublico, 1) + ";\n");
console.log(Object.entries(datos).map(([t, v]) => t + ": " + v.preguntas.length).join(" · "));
