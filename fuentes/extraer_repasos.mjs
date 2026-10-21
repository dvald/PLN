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
const datos = Object.fromEntries(Object.entries(out).map(([t, v]) => [t, { ...META[t], preguntas: v.preguntas }]));
writeFileSync(RAIZ + "/Demos/repaso_datos.js", "// Repaso de los tests para el estudio autónomo (no se usa en clase). Generado por Demos/fuentes/extraer_repasos.mjs\n// a partir de las pestañas de repaso de las demos de los Temas 5 a 10 (versión del 12/10/2026 anterior a la reconversión visual).\nwindow.REPASO = " + JSON.stringify(datos, null, 1) + ";\n");
console.log(Object.entries(datos).map(([t, v]) => t + ": " + v.preguntas.length).join(" · "));
