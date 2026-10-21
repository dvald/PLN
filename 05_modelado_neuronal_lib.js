/* Tema 5 · Modelado del lenguaje neuronal (I) — funciones de cálculo de la demo.
   Reimplementación en JavaScript de:
     Clases/Clase07_Tema5_Embeddings/analisis_embeddings.py  (tokens, n-gramas de caracteres de FastText)
     Clases/Clase08_Tema5_BERT/analisis_bert.py              (atención: softmax(QKᵀ/√dk)·V y máscara causal)
   Comprobada frente a Python (numpy y gensim.models.fasttext_inner.compute_ngrams) con
   Demos/fuentes/probar_lib_05.js (resultado en prueba_lib_05.json).
   Sin dependencias; funciona en el navegador (window.NN05) y en Node (module.exports). */
(function (root) {
  "use strict";
  const PALABRA = /[a-záéíóúüñ]+/g;

  // ---------------------------------------------------------------- texto
  function tokens(texto) {
    return (texto.toLowerCase().match(PALABRA) || []);
  }

  // Pares (palabra central, palabra de contexto) de skip-gram con una ventana de tamaño v
  function paresSkipgram(toks, v) {
    const out = [];
    toks.forEach((w, i) => {
      for (let j = Math.max(0, i - v); j < Math.min(toks.length, i + v + 1); j++) {
        if (j !== i) out.push([w, toks[j]]);
      }
    });
    return out;
  }

  // Contexto de la posición i (lo que CBOW promedia para predecir toks[i])
  function contextoCBOW(toks, i, v) {
    const out = [];
    for (let j = Math.max(0, i - v); j < Math.min(toks.length, i + v + 1); j++) if (j !== i) out.push(toks[j]);
    return out;
  }

  // n-gramas de caracteres de FastText: la palabra entre < y >, de longitud nmin a nmax.
  // Itera por puntos de código (como Python), no por unidades UTF-16.
  function ngramas(palabra, nmin = 3, nmax = 6) {
    const w = Array.from("<" + palabra + ">");
    const out = [];
    for (let n = nmin; n <= nmax; n++) {
      for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(""));
    }
    return out;
  }
  function compartidos(a, b, nmin = 3, nmax = 6) {
    const B = new Set(ngramas(b, nmin, nmax));
    return [...new Set(ngramas(a, nmin, nmax))].filter((g) => B.has(g)).sort();
  }

  // ---------------------------------------------------------------- vectores
  function coseno(a, b) {
    let ab = 0, aa = 0, bb = 0;
    for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
    return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
  }
  function matmulT(A, B) { // A · Bᵀ
    return A.map((fa) => B.map((fb) => fa.reduce((s, x, k) => s + x * fb[k], 0)));
  }
  function softmaxFila(f) {
    const m = Math.max(...f);
    if (m === -Infinity) return f.map(() => 0);
    const e = f.map((x) => (x === -Infinity ? 0 : Math.exp(x - m)));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  }
  // Atención (Vaswani et al., 2017). Devuelve todos los pasos para poder explicarlos.
  function atencion(Q, K, V, escalar = true, causal = false) {
    const dk = K[0].length;
    const brutas = matmulT(Q, K);
    const escaladas = brutas.map((f) => f.map((x) => (escalar ? x / Math.sqrt(dk) : x)));
    const puntuaciones = escaladas.map((f, i) => f.map((x, j) => (causal && j > i ? -Infinity : x)));
    const pesos = puntuaciones.map(softmaxFila);
    const salida = pesos.map((a) => V[0].map((_, c) => a.reduce((s, w, j) => s + w * V[j][c], 0)));
    return { dk, brutas, escaladas, puntuaciones, pesos, salida };
  }
  // Lee una matriz escrita como filas separadas por saltos de línea o «;» y números separados por espacios
  // o comas (admite coma decimal si los números se separan con espacios o «;»).
  function leerMatriz(texto) {
    const filas = texto.trim().split(/\n|;/).map((l) => l.trim()).filter(Boolean);
    const M = filas.map((l) => {
      const partes = /\s/.test(l) ? l.split(/\s+/) : l.split(",");
      return partes.filter(Boolean).map((x) => Number(x.replace(",", ".")));
    });
    const ok = M.length > 0 && M.every((f) => f.length === M[0].length && f.every(Number.isFinite));
    return ok ? M : null;
  }

  // ---------------------------------------------------------------- búsqueda
  function resumenPuestos(p) {
    const media = p.reduce((a, b) => a + b, 0) / p.length;
    const mrr = p.reduce((a, b) => a + 1 / b, 0) / p.length;
    return { puesto_medio: Math.round(media * 10) / 10, mrr: Math.round(mrr * 1000) / 1000,
             entre_los_3_primeros: p.filter((x) => x <= 3).length };
  }

  // ---------------------------------------------------------------- MLM (ilustración)
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Receta de BERT sobre una lista de tokens: cada token se elige con probabilidad p; de los elegidos,
  // el 80 % pasa a [MASK], el 10 % a un token al azar (uniforme en `vocab`) y el 10 % queda igual.
  function enmascarar(toks, rng, vocab, p = 0.15) {
    return toks.map((t) => {
      if (rng() >= p) return { original: t, entrada: t, tipo: null };
      const r = rng();
      if (r < 0.8) return { original: t, entrada: "[MASK]", tipo: "mask" };
      if (r < 0.9) return { original: t, entrada: vocab[Math.floor(rng() * vocab.length)], tipo: "azar" };
      return { original: t, entrada: t, tipo: "igual" };
    });
  }
  function estadisticaMLM(toks, repeticiones, seed, vocab, p = 0.15) {
    const rng = mulberry32(seed);
    const c = { elegidos: 0, mask: 0, azar: 0, igual: 0, candidatos: toks.length * repeticiones };
    for (let r = 0; r < repeticiones; r++) {
      for (const x of enmascarar(toks, rng, vocab, p)) if (x.tipo) { c.elegidos++; c[x.tipo]++; }
    }
    return c;
  }

  const API = { tokens, paresSkipgram, contextoCBOW, ngramas, compartidos, coseno, softmaxFila, atencion,
                leerMatriz, resumenPuestos, mulberry32, enmascarar, estadisticaMLM };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.NN05 = API;
})(typeof window !== "undefined" ? window : this);
