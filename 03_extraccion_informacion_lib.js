/*
 * Tema 3 · Extracción de información — funciones de la demo (sin dependencias).
 * Equivalentes a Clases/Clase04_Tema3_Stemming_Extraccion/analisis_t3.py; la igualdad se
 * comprueba con Demos/fuentes/probar_lib_03.js (resultado en Demos/fuentes/prueba_lib_03.json).
 *  - chunkear: gramática de una regla al estilo de nltk.RegexpParser sobre etiquetas UD.
 *  - bio / bioes: codificación de entidades por token.
 *  - entidadesClinicas: glosario + negación en una ventana previa (idea de NegEx, simplificada).
 *  - relaciones: patrones entre entidades consecutivas de una misma oración.
 *  - etiquetaReglas: etiquetador de reglas morfológicas (como nltk.RegexpTagger).
 */
(function (global) {
  "use strict";

  // ---------------- Chunking ----------------
  // regla: "SN: {<DET>?<NOUN|PROPN><ADJ>*}" ; etiquetas: ["DET","NOUN",...]
  function parseRegla(regla) {
    var m = regla.match(/^\s*([^:]+):\s*\{(.*)\}\s*$/);
    if (!m) throw new Error("Regla no válida: usa el formato SN: {<DET>?<NOUN><ADJ>*}");
    var etiqueta = m[1].trim(), patron = m[2].trim();
    if (!/^(<[A-Za-z|.$]+>[?*+]?)+$/.test(patron.replace(/\s+/g, ""))) {
      throw new Error("Patrón no válido: solo etiquetas entre < > con ?, * o +");
    }
    var re = patron.replace(/\s+/g, "").replace(/<([^>]+)>/g, function (_, alt) {
      var opciones = alt.split("|").map(function (a) {
        return a === "." ? "[^<>]+" : a.replace(/[.$]/g, "\\$&");
      });
      return "(?:<(?:" + opciones.join("|") + ")>)";
    });
    return { etiqueta: etiqueta, re: re };
  }

  function chunkear(etiquetas, regla) {
    var r = parseRegla(regla);
    var cadena = "", inicios = [];
    etiquetas.forEach(function (t) { inicios.push(cadena.length); cadena += "<" + t + ">"; });
    var rx = new RegExp(r.re, "g"), m, spans = [];
    while ((m = rx.exec(cadena)) !== null) {
      if (m[0].length === 0) { rx.lastIndex++; continue; }
      var a = inicios.indexOf(m.index), b = inicios.indexOf(m.index + m[0].length);
      if (b === -1) b = etiquetas.length;
      if (a !== -1) spans.push([a, b]);
    }
    var iob = etiquetas.map(function () { return "O"; });
    spans.forEach(function (s) {
      for (var i = s[0]; i < s[1]; i++) iob[i] = (i === s[0] ? "B-" : "I-") + r.etiqueta;
    });
    return { spans: spans, iob: iob, etiqueta: r.etiqueta };
  }

  // ---------------- BIO / BIOES ----------------
  function bio(n, ents) {
    var t = new Array(n).fill("O");
    ents.forEach(function (e) { for (var i = e[0]; i < e[1]; i++) t[i] = (i === e[0] ? "B-" : "I-") + e[2]; });
    return t;
  }
  function bioes(n, ents) {
    var t = new Array(n).fill("O");
    ents.forEach(function (e) {
      if (e[1] - e[0] === 1) { t[e[0]] = "S-" + e[2]; return; }
      for (var i = e[0]; i < e[1]; i++) {
        t[i] = (i === e[0] ? "B-" : i === e[1] - 1 ? "E-" : "I-") + e[2];
      }
    });
    return t;
  }

  // ---------------- Entidades clínicas ----------------
  function escapar(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function entidadesClinicas(texto, glosario, negadores, ventana) {
    ventana = ventana || 4;
    var out = [];
    texto.trim().split(/(?<=[.;])\s+/).forEach(function (oracion) {
      Object.keys(glosario).forEach(function (termino) {
        var rx = new RegExp("(?<![\\p{L}\\p{N}_])" + escapar(termino) + "(?![\\p{L}\\p{N}_])", "gu"), m;
        while ((m = rx.exec(oracion)) !== null) {
          var previo = oracion.slice(0, m.index).toLowerCase().split(/\s+/).filter(Boolean).slice(-ventana).join(" ");
          var negado = negadores.some(function (n) {
            return new RegExp("(^|\\s)" + escapar(n) + "($|\\s)", "u").test(previo);
          });
          out.push({ texto: termino, tipo: glosario[termino][0], forma: glosario[termino][1],
            negado: negado, oracion: oracion });
        }
      });
    });
    return out;
  }

  // ---------------- Relaciones ----------------
  // tokens: [{t, ws, sent}] ; ents: [[ini, fin, etiqueta]] ; patrones: [[regex, rel, t1, t2]]
  function textoSpan(tokens, a, b) {
    var s = "";
    for (var i = a; i < b; i++) s += tokens[i].t + (i < b - 1 ? tokens[i].ws : "");
    return s;
  }
  function oracionDe(tokens, i) {
    var k = 0;
    for (var j = 0; j <= i; j++) if (tokens[j].sent) k++;
    return k;
  }
  function relaciones(tokens, ents, patrones) {
    var out = [];
    for (var k = 0; k + 1 < ents.length; k++) {
      var e1 = ents[k], e2 = ents[k + 1];
      if (oracionDe(tokens, e1[0]) !== oracionDe(tokens, e2[0])) continue;
      var medio = textoSpan(tokens, e1[1], e2[0]).trim();
      patrones.forEach(function (p) {
        if (e1[2] === p[2] && e2[2] === p[3] && new RegExp(p[0], "u").test(medio)) {
          out.push([textoSpan(tokens, e1[0], e1[1]), p[1], textoSpan(tokens, e2[0], e2[1])]);
        }
      });
    }
    return out;
  }

  // ---------------- Etiquetador de reglas ----------------
  function etiquetaReglas(palabra, reglas) {
    for (var i = 0; i < reglas.length; i++) {
      if (new RegExp("^(?:" + reglas[i][0] + ")", "u").test(palabra)) return reglas[i][1];
    }
    return null;
  }

  var api = { chunkear: chunkear, parseRegla: parseRegla, bio: bio, bioes: bioes,
    entidadesClinicas: entidadesClinicas, relaciones: relaciones, textoSpan: textoSpan,
    etiquetaReglas: etiquetaReglas };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  global.LIB03 = api;
})(typeof window !== "undefined" ? window : globalThis);
