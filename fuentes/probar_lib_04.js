// Comprueba que Demos/04_modelado_lenguaje_lib.js reproduce a Python (ngramas.py, analisis_bow.py y
// scikit-learn). Uso (desde la raíz): node Demos/fuentes/probar_lib_04.js
const fs = require("fs");
const path = require("path");
const L = require("../04_modelado_lenguaje_lib.js");
globalThis.window = globalThis.window || {};
require("../04_modelado_lenguaje_datos.js");
const D = globalThis.window.DATOS04;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_04.json"), "utf8"));
const TOL = 1e-9;
const cerca = (a, b) => (a === null || b === null) ? a === b : Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b));
const res = { fecha: new Date().toISOString(), node: process.version, tolerancia_relativa: TOL };
let ok = true;

// ---- n-gramas
const textos = { resenas: D.resenas, capitulo_I_I: D.capitulo_I_I };
let comparadas = 0;
const fallosNg = [];
for (const c of ref.ngramas) {
  const { R } = L.modeloDemo(textos[c.corpus], c.n);
  const { P, V, oov } = L.prepararPrueba(R, c.prueba);
  const f = L.funcionProb(R, c.metodo, c.par, V);
  const ev = L.eventos(P, c.n);
  let bien = V === c.V && JSON.stringify(oov) === JSON.stringify(c.oov) && ev.length === c.pasos.length;
  ev.forEach(([h, w], i) => {
    const p = f(w, h);
    comparadas++;
    if (!(JSON.stringify(h) === JSON.stringify(c.pasos[i][0]) && w === c.pasos[i][1] && cerca(p, c.pasos[i][2]))) bien = false;
  });
  const pp = L.perplejidad(f, P, c.n);
  if (!(c.PP === null ? pp.PP === Infinity : cerca(pp.PP, c.PP)) || pp.N !== c.N || pp.ceros !== c.ceros) bien = false;
  c.historias.forEach((h, i) => {
    let s = 0;
    for (const w of R.tipos.concat(oov.length ? [L.DESC] : [])) s += f(w, h) || 0;
    if (!cerca(s, c.sumas[i])) bien = false;
  });
  if (!bien) fallosNg.push(`${c.corpus} n=${c.n} ${c.metodo} ${JSON.stringify(c.par)} «${c.prueba}»`);
}
for (const [k, tipos] of Object.entries(ref)) {
  if (!k.startsWith("ngramas_tipos_")) continue;
  const [, , corpus, n] = k.match(/^ngramas_tipos_(.+)_(\d)$/) ? ["", "", k.match(/^ngramas_tipos_(.+)_(\d)$/)[1], +k.match(/^ngramas_tipos_(.+)_(\d)$/)[2]] : [];
  const { R } = L.modeloDemo(textos[corpus], n);
  if (JSON.stringify(R.tipos) !== JSON.stringify(tipos)) fallosNg.push("tipos " + k);
}
res.ngramas = { casos: ref.ngramas.length, probabilidades_comparadas: comparadas, fallos: fallosNg };
ok = ok && fallosNg.length === 0;

// ---- bolsa de palabras (reseñas)
const fallosBow = [];
const lineas = D.resenas.split("\n").filter((l) => l.trim());
const vac = new Set(D.vacias);
for (const [etq, r] of Object.entries(ref.bow)) {
  const docs = lineas.map((l) => L.tokens(l).filter((w) => !(etq === "sin_vacias" && vac.has(w))));
  const voc = L.vocabulario(docs);
  const idfT = L.idfTema(docs, voc), idfS = L.idfSklearn(docs, voc);
  const igual = (a, b) => a.length === b.length && a.every((x, i) => Array.isArray(x) ? igual(x, b[i]) : (typeof x === "number" ? cerca(x, b[i]) : x === b[i]));
  const checks = {
    voc: igual(voc, r.voc), binaria: igual(docs.map((d) => L.binaria(d, voc)), r.binaria),
    tf: igual(docs.map((d) => L.tf(d, voc)), r.tf), wtf: igual(docs.map((d) => L.wtf(d, voc)), r.wtf),
    df: igual(L.df(docs, voc), r.df), idf_tema: igual(idfT, r.idf_tema), idf_sklearn: igual(idfS, r.idf_sklearn),
    tfidf_tema: igual(docs.map((d) => L.tfidf(d, idfT, voc)), r.tfidf_tema),
    sklearn: igual(docs.map((d) => L.normaL2(L.tfidf(d, idfS, voc))), r.sklearn),
    coseno: igual(docs.map((a) => docs.map((b) => L.coseno(L.tfidf(a, idfT, voc), L.tfidf(b, idfT, voc)))), r.coseno_tfidf),
  };
  for (const [k, v] of Object.entries(checks)) if (!v) fallosBow.push(`${etq}: ${k}`);
}
res.bolsa = { fallos: fallosBow };
ok = ok && fallosBow.length === 0;

// ---- Quijote: palabras características y búsquedas
const I = L.quijoteIndice(D.quijote);
const fallosQ = [];
D.quijote.nombres.forEach((nom, i) => {
  for (const modo of ["tf", "tfidf", "sklearn"]) {
    const js = L.topCapitulo(D.quijote, I, i, modo, 10);
    if (JSON.stringify(js) !== JSON.stringify(ref.quijote.tops[nom][modo])) fallosQ.push(`${nom} ${modo}`);
  }
});
let busquedas = 0;
for (const [consulta, r] of Object.entries(ref.quijote.busquedas)) {
  for (const [modo, lista] of Object.entries(r)) {
    const b = L.buscar(D.quijote, I, consulta, modo === "tfidf", 5);
    busquedas++;
    const js = b.orden.map((i) => [D.quijote.nombres[i], b.s[i]]);
    const bien = js.every(([n, s], k) => n === lista[k][0] && Math.abs(s - lista[k][1]) < 1e-6);
    if (!bien) fallosQ.push(`búsqueda «${consulta}» ${modo}`);
  }
}
res.quijote = { capitulos: D.quijote.nombres.length, listas_comparadas: D.quijote.nombres.length * 3,
  busquedas_comparadas: busquedas, fallos: fallosQ };
ok = ok && fallosQ.length === 0;
res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_04.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
