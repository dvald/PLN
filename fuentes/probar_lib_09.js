// Comprueba que Demos/09_aplicaciones_lib.js reproduce a Python (sacrebleu 2.6.0, scikit-learn 1.9.1 y
// Temas/Tema09/recursos/t9_comun.py y agente_tutorias.py, vía Demos/fuentes/referencia_python_09.json).
// Uso (desde la raíz): node Demos/fuentes/probar_lib_09.js   → Demos/fuentes/prueba_lib_09.json
const fs = require("fs");
const path = require("path");
const L = require("../09_aplicaciones_lib.js");
globalThis.window = globalThis.window || {};
require("../09_aplicaciones_datos.js");
const D = globalThis.window.DATOS09;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_09.json"), "utf8"));
const res = { fecha: new Date().toISOString(), node: process.version };
let ok = true;
function anota(nombre, cond, detalle) { res[nombre] = Object.assign({ ok: !!cond }, detalle || {}); ok = ok && !!cond; }
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1. chrF de frase (600 casos: 4 combinaciones de orden y beta) y de corpus (3 sistemas)
const fC = ref.chrf.filter((c) => Math.abs(L.chrf(c.ref, c.hip, c.n, c.beta).puntuacion - c.score) > 1e-9).map((c) => `${c.hip} (n=${c.n}, β=${c.beta})`);
const prueba = D.traduccion.detalle.filter((d) => d.particion === "prueba");
const fCC = Object.entries(ref.chrf_corpus).filter(([k, v]) =>
  Math.abs(L.chrfCorpus(prueba.map((d) => d[k]), prueba.map((d) => d.es_referencia)) - v) > 1e-9).map(([k]) => k);
anota("chrf", fC.length === 0 && fCC.length === 0, { casos_frase: ref.chrf.length, casos_corpus: 3, fallos: fC.slice(0, 5).concat(fCC) });

// 2. TF-IDF: tokens, idf y rangos de las 22 preguntas factoides
const docs = D.noticias.map((n) => n.titular + ". " + n.texto);
const ids = D.noticias.map((n) => n.id);
const fT = [];
for (const [id, tk] of Object.entries(ref.tokens_resumen)) if (!igual(L.tokensTfidf(docs[ids.indexOf(id)], 2), tk)) fT.push("resumen " + id);
for (const [id, tk] of Object.entries(ref.tokens_busqueda)) if (!igual(L.tokensTfidf(docs[ids.indexOf(id)], 1), tk)) fT.push("búsqueda " + id);
const bus = new L.Tfidf(docs, 1);
for (const [w, v] of Object.entries(ref.idf_busqueda)) if (Math.abs(bus.idf.get(w) - v) > 1e-12) fT.push("idf " + w);
const fR = [];
for (const q of D.preguntas.filter((x) => x.tipo === "factoide")) {
  const v = bus.transformar(q.pregunta);
  const s = bus.vectores.map((d, k) => [L.producto(v, d), k]);
  s.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const orden = s.map((x) => ids[x[1]]);
  const r = ref.rangos_tfidf[q.id];
  if (orden.indexOf(q.documento) + 1 !== r.rango || !igual(orden.slice(0, 5), r.top5)) fR.push(q.id);
}
anota("tfidf", fT.length === 0 && fR.length === 0, { documentos: docs.length, terminos_idf: Object.keys(ref.idf_busqueda).length, preguntas: Object.keys(ref.rangos_tfidf).length, fallos: fT.concat(fR) });

// 3. Resumen: frases, frase central y ROUGE-1
const resu = new L.Tfidf(docs, 2);
const fS = [];
for (const r of D.resumen.detalle) {
  const n = D.noticias[ids.indexOf(r.documento)];
  const fr = L.frases(n.texto), e = ref.central[r.documento];
  const vt = resu.transformar(n.texto);
  const sims = fr.map((f) => L.producto(resu.transformar(f), vt));
  const elegida = fr[sims.indexOf(Math.max(...sims))];
  if (!igual(fr, e.frases) || sims.some((x, k) => Math.abs(x - e.similitudes[k]) > 1e-9) || elegida !== e.elegida) fS.push(r.documento + " (frases)");
  const salidas = { "titular": n.titular, "primera frase": fr[0], "frase central (TF-IDF)": elegida, "Qwen2.5-0.5B-Instruct": r.qwen };
  for (const [k, h] of Object.entries(salidas)) if (Math.abs(L.rouge1(r.referencia, h).f1 - e.rouge1[k]) > 1e-12) fS.push(r.documento + " " + k);
}
anota("resumen", fS.length === 0, { noticias: D.resumen.detalle.length, fallos: fS });

// Casos límite independientes: la coincidencia de cifras debe ser completa, no una subcadena.
anota("cifras_completas", igual(L.cifrasAjenas("1000 euros en 2026, al 2,15 %", "100 euros en 20, al 2,1 %"), ["100", "20", "2,1"])
  && igual(L.cifrasAjenas("1000 euros al 2,15 %", "1000 euros al 2,15 %"), []));

// 4. Agente: comprensión de 39 enunciados y una conversación de 10 turnos
const fA = Object.entries(ref.agente).filter(([t, r]) => {
  const j = L.comprender(t);
  return j.intencion !== r.intencion || !igual(j.huecos, r.huecos);
}).map(([t]) => t);
const ag = new L.Agente(false);
const fV = ref.conversacion.filter((c) => { const r = ag.responder(c.usuario); return r.respuesta !== c.agente || !igual(ag.marco, c.marco); }).map((c) => c.usuario);
const dial = D.dialogo;
const acierta = (extra, part) => dial.filter((u) => u.particion === part && L.comprender(u.enunciado, extra).intencion === u.intencion).length;
const ev = { sin_regla: { desarrollo: acierta(false, "desarrollo"), prueba: acierta(false, "prueba") },
  con_regla: { desarrollo: acierta(true, "desarrollo"), prueba: acierta(true, "prueba") } };
anota("agente", fA.length === 0 && fV.length === 0 && ev.sin_regla.prueba === 18 && ev.con_regla.prueba === 19 && ev.con_regla.desarrollo === 12,
  { enunciados: Object.keys(ref.agente).length, turnos: ref.conversacion.length, evaluacion: ev, fallos: fA.concat(fV) });

// 5. Normalizador de cifras
const fN = Object.entries(ref.verbalizar).filter(([t, v]) => L.verbalizar(t) !== v).map(([t, v]) => `${t} → ${L.verbalizar(t)} ≠ ${v}`);
const fCa = Object.entries(ref.cardinal).filter(([n, v]) => L.cardinal(+n) !== v).map(([n]) => n);
anota("verbalizar", fN.length === 0 && fCa.length === 0, { frases: Object.keys(ref.verbalizar).length, cardinales: Object.keys(ref.cardinal).length, fallos: fN.concat(fCa) });

// 6. WER: 96 alineamientos (transcripciones reales de Whisper tiny y base, con y sin verbalizar)
const fW = ref.wer.filter((c) => {
  const a = L.alinear(L.normalizarParaWer(c.ref), L.normalizarParaWer(c.hip, c.verbalizar));
  return a.S !== c.S || a.D !== c.D || a.I !== c.I || a.N !== c.N || !igual(a.pasos, c.pasos);
}).map((c) => c.hip);
anota("wer", fW.length === 0, { casos: ref.wer.length, fallos: fW.slice(0, 5) });

res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_09.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
