/* Tema 8 · Modelado del lenguaje neuronal (II) — funciones de cálculo de la demo.
   Reimplementación en JavaScript de lo que la demo calcula en el navegador:
     máscaras de atención (esquema), softmax con temperatura y entropía (Clase 14, analisis_c14.py),
     intervalo de Wilson (analisis_c15.py), alineación de etiquetas BIO con subpalabras (analisis_c15.py),
     número de fragmentos y pesos de la media de un fragmento (tema, p. 32-33, con la corrección),
     matriz de confusión.
   Comprobada frente a Python con Demos/fuentes/probar_lib_08.js (resultado en prueba_lib_08.json).
   Sin dependencias; funciona en el navegador (window.NN08) y en Node (module.exports). */
(function (root) {
  "use strict";

  function palabras(texto) {
    return String(texto).trim().split(/\s+/).filter(Boolean);
  }

  // Máscara de atención: 1 = puede atender, 0 = peso cero (menos infinito antes de la softmax)
  function mascara(n, tipo, m) {
    if (tipo === "cruzada") {
      const filas = m === undefined ? n : m;
      return Array.from({ length: filas }, () => Array(n).fill(1));
    }
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (tipo === "causal" && j > i ? 0 : 1)));
  }
  function contarPermitidas(M) {
    return M.reduce((s, f) => s + f.reduce((a, b) => a + b, 0), 0);
  }

  // Softmax con temperatura (resta el máximo para no desbordar) y entropía en bits
  function softmaxT(z, T) {
    const t = Math.max(T, 1e-6);
    const zz = z.map((x) => x / t);
    const m = Math.max(...zz);
    const e = zz.map((x) => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  }
  function entropia(p) {
    return -p.filter((x) => x > 0).reduce((s, x) => s + x * Math.log2(x), 0);
  }
  // Índice elegido al muestrear con un número u en [0, 1)
  function muestrear(p, u) {
    let acum = 0;
    for (let i = 0; i < p.length; i++) {
      acum += p[i];
      if (u < acum) return i;
    }
    return p.length - 1;
  }
  // Generador pseudoaleatorio reproducible (mulberry32) para la demo
  function generador(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Intervalo de Wilson al 95 % para k aciertos de n
  function wilson(k, n, z = 1.96) {
    const p = k / n;
    const d = 1 + (z * z) / n;
    const c = (p + (z * z) / (2 * n)) / d;
    const m = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
    return [c - m, c + m];
  }

  // Etiquetas BIO por palabra -> por subpalabra. modo "primera": -100 en las continuaciones;
  // modo "todas": copia la etiqueta (B- pasa a I- en las continuaciones). Especiales ([CLS], [SEP]): -100.
  function alinear(wordIds, etiquetas, modo) {
    const out = [];
    let prev = null;
    for (const w of wordIds) {
      if (w === null) out.push(-100);
      else if (w !== prev) out.push(etiquetas[w]);
      else out.push(modo === "primera" ? -100 : etiquetas[w].replace("B-", "I-"));
      prev = w;
    }
    return out;
  }
  // De etiquetas por subpalabra a etiquetas por palabra: la de la primera subpalabra (Devlin et al., 2019)
  function decodificar(wordIds, etiquetasSub) {
    const out = [];
    let prev = null;
    wordIds.forEach((w, k) => {
      if (w !== null && w !== prev) out.push(etiquetasSub[k]);
      prev = w;
    });
    return out;
  }

  // Fragmentos (spans) de una frase de T palabras con longitud máxima L (j - i < L)
  function listaSpans(T, L) {
    const out = [];
    for (let i = 0; i < T; i++) for (let j = i; j < T && j - i < L; j++) out.push([i, j]);
    return out;
  }
  function nSpans(T, L) {
    return listaSpans(T, L).length;
  }
  // Pesos de cada palabra en la media del fragmento [i, j] (índices desde 0): correcto, 1/(j-i+1) en i..j;
  // y el de la fórmula impresa en el tema (p. 33, índices desde 1: 1/((j-1)+1) sumando desde k = 1), que
  // equivale a la media de TODAS las palabras desde la primera hasta j: 1/(j+1) con índices desde 0.
  function pesosMedia(T, i, j) {
    return Array.from({ length: T }, (_, k) => (k >= i && k <= j ? 1 / (j - i + 1) : 0));
  }
  function pesosMediaTema(T, i, j) {
    return Array.from({ length: T }, (_, k) => (k <= j ? 1 / (j + 1) : 0));
  }

  function normaliza(s) {
    return String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/^[\s.:"'«»*]+|[\s.:"'«»*]+$/g, "");
  }

  function matrizConfusion(reales, pred, etiquetas) {
    const M = etiquetas.map(() => etiquetas.map(() => 0));
    reales.forEach((r, k) => {
      const i = etiquetas.indexOf(r), j = etiquetas.indexOf(pred[k]);
      if (i >= 0 && j >= 0) M[i][j] += 1;
    });
    return M;
  }

  const API = { palabras, mascara, contarPermitidas, softmaxT, entropia, muestrear, generador, wilson, alinear,
                decodificar, listaSpans, nSpans, pesosMedia, pesosMediaTema, normaliza, matrizConfusion };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.NN08 = API;
})(typeof window !== "undefined" ? window : this);
