/*
 * Tema 2 · El texto como dato — funciones de la demo (sin dependencias).
 *
 * 1. tokReglas / tokEspacios / tokRegexSimple: los tres tokenizadores propios de la
 *    Clase 3, con el mismo patrón que Clases/Clase03_Tema2_Tokenizacion/analisis_corpus.py.
 * 2. stemEs: traslado literal a JavaScript del SpanishStemmer de NLTK 3.10.3
 *    (nltk/stem/snowball.py, licencia Apache 2.0), que implementa el algoritmo Snowball
 *    para el español (https://snowballstem.org/algorithms/spanish/stemmer.html).
 * La equivalencia con Python se comprueba con Demos/fuentes/probar_lib_02.js sobre todo
 * el vocabulario del corpus de la clase (resultado en Demos/fuentes/prueba_lib_02.json).
 */
(function (global) {
  "use strict";

  // ---------------- Tokenizadores ----------------
  var ABREVIATURAS = ["EE. UU.", "p. ej.", "Dra.", "Dr.", "Sra.", "Sr.", "Pte.", "Ant.",
    "Sat.", "sáb.", "etc."];

  function escapar(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  var abrev = ABREVIATURAS.slice().sort(function (a, b) { return b.length - a.length; })
    .map(escapar).join("|");

  var FUENTE_REGLAS =
    "https?://\\S*[^\\s.,;:!?)»\"]" +          // URL, sin la puntuación final
    "|[@#][\\p{L}\\p{N}_]+" +                   // mención o etiqueta
    "|(?:" + abrev + ")" +                      // abreviaturas conocidas
    "|[0-9]{4}-[0-9]{2}-[0-9]{2}" +             // fecha ISO
    "|[0-9]{1,2}:[0-9]{2}" +                    // hora
    "|[0-9]+(?:[.,][0-9]+)*" +                  // número
    "|[\\p{L}\\p{N}]+(?:[-'][\\p{L}\\p{N}]+)*" + // palabra
    "|\\.\\.\\." +                              // puntos suspensivos
    "|\\S";                                     // cualquier otro signo o emoji

  function tokReglas(texto) {
    return texto.normalize("NFC").match(new RegExp(FUENTE_REGLAS, "gu")) || [];
  }

  function tokEspacios(texto) {
    return texto.normalize("NFC").split(/\s+/u).filter(function (t) { return t.length; });
  }

  // Equivale a \w+|[^\w\s] de Python (allí \w es Unicode).
  function tokRegexSimple(texto) {
    return texto.normalize("NFC").match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu) || [];
  }

  // ---------------- Snowball español (NLTK) ----------------
  var VOWELS = "aeiouáéíóúü";
  var STEP0 = ["selas", "selos", "sela", "selo", "las", "les", "los", "nos", "me", "se",
    "la", "le", "lo"];
  var STEP1 = ["amientos", "imientos", "amiento", "imiento", "acion", "aciones", "uciones",
    "ucion", "adoras", "adores", "ancias", "logías", "encias", "amente", "idades", "anzas",
    "ismos", "ables", "ibles", "istas", "adora", "ación", "antes", "ancia", "logía",
    "ución", "encia", "mente", "anza", "icos", "icas", "ismo", "able", "ible", "ista",
    "osos", "osas", "ador", "ante", "idad", "ivas", "ivos", "ico", "ica", "oso", "osa",
    "iva", "ivo"];
  var STEP2A = ["yeron", "yendo", "yamos", "yais", "yan", "yen", "yas", "yes", "ya", "ye",
    "yo", "yó"];
  var STEP2B = ["aríamos", "eríamos", "iríamos", "iéramos", "iésemos", "aríais", "aremos",
    "eríais", "eremos", "iríais", "iremos", "ierais", "ieseis", "asteis", "isteis",
    "ábamos", "áramos", "ásemos", "arían", "arías", "aréis", "erían", "erías", "eréis",
    "irían", "irías", "iréis", "ieran", "iesen", "ieron", "iendo", "ieras", "ieses",
    "abais", "arais", "aseis", "éamos", "arán", "arás", "aría", "erán", "erás", "ería",
    "irán", "irás", "iría", "iera", "iese", "aste", "iste", "aban", "aran", "asen", "aron",
    "ando", "abas", "adas", "idas", "aras", "ases", "íais", "ados", "idos", "amos", "imos",
    "emos", "ará", "aré", "erá", "eré", "irá", "iré", "aba", "ada", "ida", "ara", "ase",
    "ían", "ado", "ido", "ías", "áis", "éis", "ía", "ad", "ed", "id", "an", "ió", "ar",
    "er", "ir", "as", "ís", "en", "es"];
  var STEP3 = ["os", "a", "e", "o", "á", "é", "í", "ó"];

  function ends(s, suf) { return s.length >= suf.length && s.slice(s.length - suf.length) === suf; }
  function endsAny(s, list) { for (var i = 0; i < list.length; i++) { if (ends(s, list[i])) return true; } return false; }
  function cut(s, n) { return n >= s.length ? "" : s.slice(0, s.length - n); }
  function isV(c) { return VOWELS.indexOf(c) !== -1; }
  function deaccent(w) {
    return w.replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o")
      .replace(/ú/g, "u");
  }

  function r1r2(word) {
    var r1 = "", r2 = "", i;
    for (i = 1; i < word.length; i++) {
      if (!isV(word[i]) && isV(word[i - 1])) { r1 = word.slice(i + 1); break; }
    }
    for (i = 1; i < r1.length; i++) {
      if (!isV(r1[i]) && isV(r1[i - 1])) { r2 = r1.slice(i + 1); break; }
    }
    return [r1, r2];
  }

  function rvStandard(word) {
    var rv = "", i;
    if (word.length >= 2) {
      if (!isV(word[1])) {
        for (i = 2; i < word.length; i++) { if (isV(word[i])) { rv = word.slice(i + 1); break; } }
      } else if (isV(word[0]) && isV(word[1])) {
        for (i = 2; i < word.length; i++) { if (!isV(word[i])) { rv = word.slice(i + 1); break; } }
      } else {
        rv = word.slice(3);
      }
    }
    return rv;
  }

  function stemEs(palabra) {
    var word = palabra.toLowerCase();
    var step1Success = false;
    var rr = r1r2(word), r1 = rr[0], r2 = rr[1];
    var rv = rvStandard(word);
    var i, suffix, n;

    // Paso 0: pronombre átono pospuesto
    for (i = 0; i < STEP0.length; i++) {
      suffix = STEP0[i];
      if (!(ends(word, suffix) && ends(rv, suffix))) continue;
      n = suffix.length;
      if (endsAny(cut(rv, n), ["ando", "ándo", "ar", "ár", "er", "ér", "iendo", "iéndo", "ir", "ír"]) ||
          (ends(cut(rv, n), "yendo") && ends(cut(word, n), "uyendo"))) {
        word = deaccent(cut(word, n));
        r1 = deaccent(cut(r1, n));
        r2 = deaccent(cut(r2, n));
        rv = deaccent(cut(rv, n));
      }
      break;
    }

    // Paso 1: sufijos estándar
    for (i = 0; i < STEP1.length; i++) {
      suffix = STEP1[i];
      if (!ends(word, suffix)) continue;
      n = suffix.length;
      if (suffix === "amente" && ends(r1, suffix)) {
        step1Success = true;
        word = cut(word, 6); r2 = cut(r2, 6); rv = cut(rv, 6);
        if (ends(r2, "iv")) {
          word = cut(word, 2); r2 = cut(r2, 2); rv = cut(rv, 2);
          if (ends(r2, "at")) { word = cut(word, 2); rv = cut(rv, 2); }
        } else if (endsAny(r2, ["os", "ic", "ad"])) {
          word = cut(word, 2); rv = cut(rv, 2);
        }
      } else if (ends(r2, suffix)) {
        step1Success = true;
        if (["adora", "ador", "ación", "adoras", "adores", "acion", "aciones", "ante", "antes",
             "ancia", "ancias"].indexOf(suffix) !== -1) {
          word = cut(word, n); r2 = cut(r2, n); rv = cut(rv, n);
          if (ends(r2, "ic")) { word = cut(word, 2); rv = cut(rv, 2); }
        } else if (suffix === "logía" || suffix === "logías") {
          word = cut(word, n) + "log"; rv = cut(rv, n) + "log";
        } else if (suffix === "ución" || suffix === "uciones" || suffix === "ucion") {
          word = cut(word, n) + "u"; rv = cut(rv, n) + "u";
        } else if (suffix === "encia" || suffix === "encias") {
          word = cut(word, n) + "ente"; rv = cut(rv, n) + "ente";
        } else if (suffix === "mente") {
          word = cut(word, n); r2 = cut(r2, n); rv = cut(rv, n);
          if (endsAny(r2, ["ante", "able", "ible"])) { word = cut(word, 4); rv = cut(rv, 4); }
        } else if (suffix === "idad" || suffix === "idades") {
          word = cut(word, n); r2 = cut(r2, n); rv = cut(rv, n);
          ["abil", "ic", "iv"].forEach(function (pre) {
            if (ends(r2, pre)) { word = cut(word, pre.length); rv = cut(rv, pre.length); }
          });
        } else if (["ivo", "iva", "ivos", "ivas"].indexOf(suffix) !== -1) {
          word = cut(word, n); r2 = cut(r2, n); rv = cut(rv, n);
          if (ends(r2, "at")) { word = cut(word, 2); rv = cut(rv, 2); }
        } else {
          word = cut(word, n); rv = cut(rv, n);
        }
      }
      break;
    }

    // Pasos 2a y 2b: sufijos verbales
    if (!step1Success) {
      for (i = 0; i < STEP2A.length; i++) {
        suffix = STEP2A[i]; n = suffix.length;
        if (ends(rv, suffix) && word.slice(Math.max(0, word.length - n - 1), word.length - n) === "u") {
          word = cut(word, n); rv = cut(rv, n);
          break;
        }
      }
      for (i = 0; i < STEP2B.length; i++) {
        suffix = STEP2B[i]; n = suffix.length;
        if (ends(rv, suffix)) {
          word = cut(word, n); rv = cut(rv, n);
          if (["en", "es", "éis", "emos"].indexOf(suffix) !== -1) {
            if (ends(word, "gu")) word = cut(word, 1);
            if (ends(rv, "gu")) rv = cut(rv, 1);
          }
          break;
        }
      }
    }

    // Paso 3: sufijo residual
    for (i = 0; i < STEP3.length; i++) {
      suffix = STEP3[i]; n = suffix.length;
      if (ends(rv, suffix)) {
        word = cut(word, n);
        if (suffix === "e" || suffix === "é") {
          rv = cut(rv, n);
          if (word.slice(-2) === "gu" && ends(rv, "u")) word = cut(word, 1);
        }
        break;
      }
    }
    return deaccent(word);
  }

  // ---------------- Segmentación y normalización ----------------
  var FINALES = [".", "!", "?", "...", "…"];

  function esMayuscula(c) { return c !== c.toLowerCase() && c === c.toUpperCase(); }

  // Párrafos si hay líneas en blanco; si no, cada línea es una unidad.
  function unidades(texto) {
    if (/\n\s*\n/.test(texto)) {
      return texto.split(/\n\s*\n/).map(function (p) { return p.split(/\s+/).filter(Boolean).join(" "); })
        .filter(Boolean);
    }
    return texto.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  }

  // Igual que seg_reglas de analisis_corpus.py
  function segReglas(unidad) {
    var toks = tokReglas(unidad), oraciones = [], actual = [];
    toks.forEach(function (t, i) {
      actual.push(t);
      var sig = i + 1 < toks.length ? toks[i + 1] : null;
      if (FINALES.indexOf(t) !== -1 && sig !== null && FINALES.indexOf(sig) === -1 &&
          (esMayuscula(sig[0]) || "¿¡«".indexOf(sig[0]) !== -1)) {
        oraciones.push(actual.join(" ")); actual = [];
      }
    });
    if (actual.length) oraciones.push(actual.join(" "));
    return oraciones;
  }

  var NEGACION = ["no", "ni", "sin", "nada", "nunca", "jamás", "tampoco", "nadie", "ninguno",
    "ninguna"];

  function esPalabra(t) { return /[\p{L}\p{N}]/u.test(t); }

  /* toks: [{text, lemma, pos}] (lemma y pos pueden ser null si no hay datos de spaCy).
     op: {minusculas: "no"|"todas"|"propios", signos, numeros, vacias, negacion: bool,
          reducir: "no"|"raiz"|"lema", stopwords: Set}
     Devuelve [{orig, out, quitado, motivo}] en el orden original. */
  function normalizar(toks, op) {
    return toks.map(function (tk) {
      var t = tk.text, low = t.toLowerCase(), r = { orig: t, out: t, quitado: false, motivo: "" };
      if (op.minusculas === "todas" || (op.minusculas === "propios" && tk.pos !== "PROPN")) r.out = low;
      if (op.signos && !esPalabra(t)) { r.quitado = true; r.motivo = "signo o símbolo"; return r; }
      if (op.vacias && op.stopwords.has(low) && !(op.negacion && NEGACION.indexOf(low) !== -1)) {
        r.quitado = true; r.motivo = NEGACION.indexOf(low) !== -1 ? "negación quitada" : "palabra vacía";
        return r;
      }
      if (op.numeros && /^[0-9][0-9.,:\-]*$/.test(t)) { r.out = "<NUM>"; return r; }
      if (op.reducir === "raiz") r.out = stemEs(low);
      else if (op.reducir === "lema" && tk.lemma) r.out = op.minusculas === "no" ? tk.lemma : tk.lemma.toLowerCase();
      return r;
    });
  }

  var api = { tokReglas: tokReglas, tokEspacios: tokEspacios, tokRegexSimple: tokRegexSimple,
    stemEs: stemEs, ABREVIATURAS: ABREVIATURAS, FUENTE_REGLAS: FUENTE_REGLAS,
    unidades: unidades, segReglas: segReglas, normalizar: normalizar, NEGACION: NEGACION,
    esPalabra: esPalabra };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  global.LIB02 = api;
})(typeof window !== "undefined" ? window : globalThis);
