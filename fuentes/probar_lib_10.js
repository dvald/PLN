// Comprueba que Demos/10_visualizacion_lib.js reproduce a Python (análisis de las Clases 17, 19 y 20 y
// Demos/fuentes/generar_datos_10.py). Uso (desde la raíz): node Demos/fuentes/probar_lib_10.js
const fs = require("fs");
const path = require("path");
const L = require("../10_visualizacion_lib.js");
globalThis.window = globalThis.window || {};
require("../10_visualizacion_datos.js");
const D = globalThis.window.DATOS10;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_10.json"), "utf8"));
const res = { fecha: new Date().toISOString(), node: process.version };
let ok = true;
const cerca = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
function anota(nombre, cond, detalle) { res[nombre] = Object.assign({ ok: !!cond }, detalle || {}); ok = ok && !!cond; }
const VAC = new Set(D.vacias);

// PRNG y tokenización
const r = L.mulberry32(42);
anota("mulberry32", Array.from({ length: 6 }, () => r()).every((x, i) => x === ref.mulberry32_42[i]));
const fTok = Object.entries(ref.tokens_prueba).filter(([t, tk]) => JSON.stringify(L.tokens(t)) !== JSON.stringify(tk)).map(([t]) => t);
anota("tokens", fTok.length === 0, { casos: Object.keys(ref.tokens_prueba).length, fallos: fTok });

// Clase 17: vecinos por coseno, peor par, RadViz y PCA a mano
const N = D.noticias, vec = N.tfidf;
const fVec = Object.entries(ref.vecinos5).filter(([id, esp]) => {
  const i = N.ids.indexOf(id);
  return JSON.stringify(L.vecinosOriginales(vec, i, 5).map(([j]) => N.ids[j])) !== JSON.stringify(esp);
}).map(([id]) => id);
const pp = ref.peor_par, ia = N.ids.indexOf(pp.a), ib = N.ids.indexOf(pp.b);
const cosPar = L.cosenoDisperso(vec[ia], vec[ib]);
const orden = L.vecinosOriginales(vec, ia, 91).map(([j]) => j);
const vm = L.vecinosMapa(D.mapas.tsne_p15_s0, ia, 1)[0][0];
anota("coseno_y_vecinos", fVec.length === 0 && cerca(cosPar, pp.coseno, 1e-4) && orden.indexOf(ib) + 1 === pp.puesto_de_b_entre_los_vecinos_de_a && vm === ib,
  { fallos: fVec, peor_par: [pp.a, pp.b, cosPar, orden.indexOf(ib) + 1] });
const rv = L.radviz(D.theta, [90, 0, -90, 180]);
anota("radviz", ref.radviz_primeros.every((p, i) => cerca(p[0], rv[i][0], 2e-4) && cerca(p[1], rv[i][1], 2e-4)));
const pc = L.pca(D.pca_mano.matriz, 2);
const pcOk = pc.varianza.every((v, i) => cerca(v, ref.pca_mano.varianza[i], 1e-9)) &&
  pc.Y.every((f, i) => f.every((x, j) => cerca(x, ref.pca_mano.Y[i][j], 1e-7))) &&
  pc.componentes.every((f, i) => f.every((x, j) => cerca(x, ref.pca_mano.componentes[i][j], 1e-7)));
anota("pca_mano", pcOk, { varianza_js: pc.varianza, varianza_py: ref.pca_mano.varianza });

// Clase 19: frecuencias, tamaños de WordCloud, partes, tendencias, opiniones
const Q = D.quijote;
const pos = L.contar([].concat(...D.resenas.filter((x) => x.polaridad === "positiva").map((x) => L.tokens(x.texto))));
const vacOp = new Set(D.vacias.filter((w) => !D.polares.includes(w)));
const topPos = L.masComunes(new Map(Array.from(pos).filter(([w]) => !vacOp.has(w))), 12);
anota("opiniones_top_positivas", JSON.stringify(topPos.map(([w, c]) => w + c).sort()) === JSON.stringify(ref.top_positivas.map(([w, c]) => w + c).sort()),
  { js: topPos.slice(0, 4) });
const cont = L.filtrarVacias(Q.frecuencias.todo, VAC).slice(0, 12);
const norm = L.normalizar(cont);
const tamOk = [[0.5, "tamanos_rs05"], [1, "tamanos_rs1"], [0, "tamanos_rs0"]].every(([rs, k]) =>
  JSON.stringify(L.tamanosWordCloud(norm, rs, 200)) === JSON.stringify(ref[k]));
anota("tamanos_wordcloud", tamOk, { rs05: L.tamanosWordCloud(norm, 0.5, 200).slice(0, 4) });
const CMP = Q.comparacion, cI = new Map(CMP.palabras.map((w, i) => [w, CMP.I[i]])), cII = new Map(CMP.palabras.map((w, i) => [w, CMP.II[i]]));
const t1 = CMP.top_I.slice(0, 100), t2 = CMP.top_II.slice(0, 100);
const comunes = t1.filter((w) => new Set(t2).has(w)).length;
const union = Array.from(new Set([...t1, ...t2]));
const comp = L.comparar(union.map((w) => [w, cI.get(w)]), union.map((w) => [w, cII.get(w)]),
  Q.contenido_n[0], Q.contenido_n[1], Q.contenido_V[0], Q.contenido_V[1]);
const setI = (l) => l.map((x) => x[0] + ":" + x[3].toFixed(3)).sort();
const igualL = (js, py) => js.length === py.length && js.every((x, i) => x[0] === py[i][0] && x[1] === py[i][1] && x[2] === py[i][2] && cerca(x[3], py[i][3], 1e-3));
const compOk = comunes === ref.partes.comunes_en_las_100 && igualL(comp.slice(0, 10), ref.partes.mas_de_la_parte_I) &&
  igualL(comp.slice(-10).reverse(), ref.partes.mas_de_la_parte_II);
anota("dos_partes", compOk, { comunes, primeras_I: comp.slice(0, 3).map((x) => x[0]), primeras_II: comp.slice(-3).reverse().map((x) => x[0]) });
const s = L.serie(Q.por_capitulo.duquesa, Q.longitudes);
const sv = L.suavizar(s, 5);
anota("tendencias", s.every((x, i) => cerca(x, ref.serie_duquesa[i], 1e-4)) && sv.every((x, i) => cerca(x, ref.serie_duquesa_suave5[i], 1e-4)));

// Clase 19: coocurrencias del ejercicio 8, PMI y árboles
const E8 = ref.ej8, cielo = D.cielo;
const tema = L.coocurrencias(cielo, "cielo", "tema", VAC).map((x) => x[0]);
const ady = L.coocurrencias(cielo, "cielo", "adyacentes", VAC);
const fra = L.coocurrencias(cielo, "cielo", "frase", VAC);
const ven = L.coocurrencias(cielo, "cielo", "ventana", VAC, 2);
const comoDic = (l) => JSON.stringify(Object.fromEntries(l.map(([w, c]) => [w, c]).sort()));
const fraTop = new Map(fra), fraOk = E8.misma_frase.every(([w, c]) => fraTop.get(w) === c);
anota("coocurrencias_ej8", JSON.stringify(tema) === JSON.stringify(E8.vecinos_procedimiento_del_tema) &&
  comoDic(ady) === comoDic(E8.adyacentes_con_recuento) && fraOk && JSON.stringify(ven.slice(0, 12)) === JSON.stringify(E8.ventana_2_sin_vacias),
  { tema, ventana: ven.slice(0, 3) });
const CQ = D.cooc_quijote, du = CQ.objetivos.dulcinea;
const pm = L.pmi(du.co, du.df, CQ.N, du.n_objetivo, 5).slice(0, 10);
const pmD = new Map(pm.map(([w, c, v]) => [w, [c, v]]));
anota("pmi_dulcinea", ref.dulcinea_pmi.every(([w, c, v]) => pmD.has(w) && pmD.get(w)[0] === c && cerca(pmD.get(w)[1], v, 1e-3)),
  { js: pm.slice(0, 4).map((x) => x[0]) });
const simple = (nodos) => nodos.map((x) => ({ palabra: x.palabra, n: x.n, hijos: simple(x.hijos) }));
const avm = L.arbol(D.arboles_quijote["vuestra merced"].continuaciones, 3, 4, 8);
const asp = L.arbol(D.arboles_quijote["la sin par"].continuaciones, 3, 3, 1);
const cal = L.arbol(L.continuaciones(D.resenas.map((x) => L.tokens(x.texto)), "calidad", 2), 2, 8, 1);
anota("arboles", JSON.stringify(simple(avm)) === JSON.stringify(ref.arbol_vuestra_merced.hijos) &&
  JSON.stringify(simple(asp)) === JSON.stringify(ref.arbol_sin_par.hijos) && JSON.stringify(simple(cal)) === JSON.stringify(ref.arbol_calidad.hijos),
  { vuestra_merced: avm.map((x) => x.palabra + " " + x.n) });

// Clase 20: TTR y MATTR, firmas CNG y relevancia
const M = D.firmas_muestras, base = M["Parte I (cap. 1-8)"];
const tb = L.tokens(base);
anota("ttr_mattr", cerca(L.ttr(tb), ref.muestra_base_ttr_mattr[0], 1e-12) && cerca(L.mattr(tb, 500), ref.muestra_base_ttr_mattr[1], 1e-12),
  { js: [L.ttr(tb), L.mattr(tb, 500)] });
const fCng = [];
for (const nn of [2, 3, 4, 5]) {
  const pb = L.perfil(base, nn);
  for (const LL of [100, 300, 500]) {
    for (const [k, v] of Object.entries(ref.cng_sensibilidad[`n${nn}_L${LL}`])) {
      const d = L.cng(pb, L.perfil(M[k], nn), LL).total;
      if (!cerca(d, v, 1e-4)) fCng.push(`n${nn}_L${LL}/${k}: ${d} ≠ ${v}`);
    }
  }
}
anota("firmas_cng", fCng.length === 0, { combinaciones: 12, fallos: fCng.slice(0, 5) });
const voc = D.noticias.vocab, T = D.termite;
const fRel = [], empates = [];
for (const lam of ["1.0", "0.6", "0.0"]) {
  for (let k = 0; k < 4; k++) {
    const rel = L.relevancia(T.phi[k], T.pw, parseFloat(lam));
    const top = L.ordenDesc(rel).slice(0, 8).map((i) => voc[i]), py = ref.relevancia[lam][k];
    const valor = (w) => rel[voc.indexOf(w)];
    // mismo conjunto y, donde cambia el orden, empate numérico (|Δ| < 1e-9: «artificial» e «inteligencia» van siempre juntas)
    const igual = JSON.stringify([...top].sort()) === JSON.stringify([...py].sort()) &&
      top.every((w, i) => w === py[i] || Math.abs(valor(w) - valor(py[i])) < 1e-9);
    if (!igual) fRel.push(`${lam}/${k}: ${top.join(",")}`);
    if (igual && JSON.stringify(top) !== JSON.stringify(py)) empates.push(`${lam}/${k}: ${top.slice(0, 2).join(" = ")}`);
  }
}
anota("relevancia", fRel.length === 0, { fallos: fRel, empates_numericos: empates });

res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_10.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
