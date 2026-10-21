"""
Genera los datos de la demo del Tema 4 y la referencia de Python para comprobar la biblioteca JS.

Uso (desde la raíz): entorno/.venv_pln/bin/python Demos/fuentes/generar_datos_04.py
Salidas:
  Demos/04_modelado_lenguaje_datos.js     window.DATOS04: reseñas, palabras vacías, Quijote por
                                          capítulos (matriz dispersa sin palabras vacías), capítulo
                                          I-I como corpus de n-gramas y resultados precalculados de
                                          la Clase 6 (perplejidades, rejillas, generación…)
  Demos/fuentes/referencia_python_04.json casos de prueba calculados con ngramas.py, analisis_bow.py
                                          y scikit-learn 1.9.1
Fuentes de los cálculos: Clases/Clase06_Tema4_Suavizado/ngramas.py y analisis_ngramas.py;
Clases/Clase05_Tema4_BolsaPalabras/analisis_bow.py.
"""
import json
import math
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
C5 = RAIZ / "Clases" / "Clase05_Tema4_BolsaPalabras"
C6 = RAIZ / "Clases" / "Clase06_Tema4_Suavizado"
sys.path.insert(0, str(C6))
sys.path.insert(0, str(C5))
import ngramas as G  # noqa: E402
import analisis_ngramas as AN  # noqa: E402
import analisis_bow as AB  # noqa: E402
import nltk  # noqa: E402

nltk.data.path.insert(0, str(RAIZ / "entorno" / "nltk_data"))
from nltk.corpus import stopwords  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402

VACIAS = sorted(set(stopwords.words("spanish")))
SALIDA_JS = RAIZ / "Demos" / "04_modelado_lenguaje_datos.js"
SALIDA_REF = RAIZ / "Demos" / "fuentes" / "referencia_python_04.json"


# ------------------------------------------------------------------ espejo de la demo
def preparar_prueba(R, texto):
    """Misma regla que prepararPrueba() en la biblioteca JS: las palabras de prueba no vistas en
    el entrenamiento pasan a <UNK> y |V| suma un tipo más."""
    conocidas = set(R.tipos)
    P = G.frases(texto)
    oov = [w for f in P for w in f if w not in conocidas]
    Pm = [[w if w in conocidas else G.DESC for w in f] for f in P]
    return Pm, len(R.tipos) + (1 if oov else 0), oov


def funcion_prob(R, metodo, par, V):
    cache = {}
    return {
        "mle": lambda w, h: G.p_mle(R, w, h),
        "laplace": lambda w, h: G.p_addk(R, w, h, 1, V),
        "addk": lambda w, h: G.p_addk(R, w, h, par.get("k", 0), V),
        "interp": lambda w, h: G.p_interp(R, w, h, tuple(par.get("lambdas", ()))),
        "backoff": lambda w, h: G.p_backoff(R, w, h, par.get("d", 0), None, cache),
        "kn": lambda w, h: G.p_kn(R, w, h, V, par.get("d", 0)),
        "stupid": lambda w, h: G.s_stupid(R, w, h, 0.4),
    }[metodo]


def main():
    resenas = (C6 / "ejercicios" / "datos" / "resenas_cafeteria.txt").read_text(encoding="utf-8")
    caps = AN.capitulos((C6 / "ejercicios" / "datos" / "quijote_completo.txt").read_text(encoding="utf-8"))
    nombres = [AN.nombre_cap(c) for c in caps]
    cap1 = caps[0]["texto"].strip()
    NG = json.loads((C6 / "revision" / "resultados_ngramas.json").read_text(encoding="utf-8"))
    BW = json.loads((C5 / "revision" / "resultados_bow.json").read_text(encoding="utf-8"))

    # ---------------- Quijote: matriz dispersa sin palabras vacías
    vac = set(VACIAS)
    docs = [[w for w in AB.tokens(c["texto"]) if w not in vac] for c in caps]
    vocab = sorted({w for d in docs for w in d})
    pos = {w: j for j, w in enumerate(vocab)}
    matriz = []
    for d in docs:
        c = Counter(d)
        idx = sorted(pos[w] for w in c)
        matriz.append([idx, [c[vocab[j]] for j in idx]])

    # ---------------- generación precalculada (6 semillas por orden)
    todas = G.frases("\n".join(c["texto"] for c in caps))
    texto_unido = " " + " ".join(" ".join(f) for f in todas) + " "
    R4 = G.Recuentos(todas, 4)
    generacion = {}
    for k in (1, 2, 3, 4):
        muestras, semilla = [], 0
        while len(muestras) < 6:
            frase = G.generar(R4, semilla, 25, k)
            semilla += 1
            if len(frase) < 6:
                continue
            mayor = 0
            for i in range(len(frase)):
                for j in range(len(frase), i + mayor, -1):
                    if f" {' '.join(frase[i:j])} " in texto_unido:
                        mayor = max(mayor, j - i)
                        break
            muestras.append({"semilla": semilla - 1, "frase": " ".join(frase), "palabras": len(frase),
                             "copiado": mayor})
        generacion[str(k)] = muestras

    q = NG["quijote"]
    datos = {
        "fuente": "Demos/fuentes/generar_datos_04.py",
        "resenas": resenas.strip(),
        "vacias": VACIAS,
        "capitulo_I_I": cap1,
        "quijote": {"nombres": nombres, "titulos": [c["titulo"] for c in caps], "vocab": vocab,
                    "caps": matriz},
        "lm": {k: q[k] for k in ("particion", "vocabulario", "tabla_perplejidad", "rejilla_addk",
                                  "rejilla_interpolacion", "rejilla_backoff", "rejilla_kn",
                                  "contaminacion", "kn_continuacion", "mismo_bow_distinto_orden",
                                  "prediccion_bigramas_obra_completa", "prueba_2gramas_no_vistos_pct",
                                  "prueba_3gramas_no_vistos_pct", "sumas_vocabulario")},
        "generacion": generacion,
        "bow_resumen": {k: BW["quijote"][k] for k in ("capitulos", "palabras", "palabras_sin_vacias",
                                                       "vocabulario", "celdas_cero_pct",
                                                       "en_todos_los_capitulos", "separacion")},
    }
    SALIDA_JS.write_text("/* Datos de la demo del Tema 4 (generados; no editar a mano). */\n"
                         "window.DATOS04 = " + json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
                         + ";\n", encoding="utf-8")

    # ---------------- referencia para la biblioteca JS
    ref = {"ngramas": [], "bow": {}, "quijote": {}}
    corpus = {"resenas": (resenas, ["El café es malo.", "El servicio de esta cafetería está muy bueno.",
                                    "El té es malo.", "Café malo. El servicio es lento."]),
              "capitulo_I_I": (cap1, ["En un lugar de la Mancha vivía un hidalgo.",
                                      "El hidalgo leía libros de caballerías.",
                                      "Rocinante era un rocín flaco.", "Don Quijote salió al campo."])}
    for nombre, (texto, pruebas) in corpus.items():
        F = G.frases(texto)
        for n in (2, 3):
            R = G.Recuentos(F, n)
            metodos = [("mle", {}), ("laplace", {}), ("addk", {"k": 0.1}), ("addk", {"k": 0.01}),
                       ("interp", {"lambdas": [0.3, 0.7] if n == 2 else [0.1, 0.3, 0.6]}),
                       ("backoff", {"d": 0.5}), ("backoff", {"d": 0.75}), ("kn", {"d": 0.75}),
                       ("stupid", {})]
            for prueba in pruebas:
                P, V, oov = preparar_prueba(R, prueba)
                for metodo, par in metodos:
                    f = funcion_prob(R, metodo, par, V)
                    pasos = [[list(h), w, f(w, h)] for h, w in G.eventos(P, n)]
                    pp, N, ceros = G.perplejidad(f, P, n)
                    hist = [list(h) for h, _ in list(G.eventos(P, n))[:3]]
                    sumas = [sum((f(w, tuple(h)) or 0.0) for w in R.tipos + ([G.DESC] if oov else [])) for h in hist]
                    ref["ngramas"].append({"corpus": nombre, "n": n, "prueba": prueba, "metodo": metodo,
                                           "par": par, "V": V, "oov": oov, "pasos": pasos,
                                           "PP": None if pp == math.inf else pp, "N": N, "ceros": ceros,
                                           "historias": hist, "sumas": sumas})
            ref["ngramas_tipos_" + nombre + "_" + str(n)] = R.tipos
    lineas = [l for l in resenas.splitlines() if l.strip()]
    for etiqueta, quitar in (("con_vacias", False), ("sin_vacias", True)):
        d = [[w for w in AB.tokens(l) if not (quitar and w in vac)] for l in lineas]
        voc = AB.vocabulario(d)
        idf = AB.idf_tema(d, voc)
        tv = TfidfVectorizer(token_pattern=r"(?u)\b\w+\b", vocabulary=voc)
        sk = tv.fit_transform([" ".join(x) for x in d]).toarray().tolist()
        ref["bow"][etiqueta] = {"docs": d, "voc": voc, "binaria": [AB.binaria(x, voc) for x in d],
                                "tf": [AB.tf(x, voc) for x in d], "wtf": [AB.wtf(x, voc) for x in d],
                                "df": AB.df(d, voc), "idf_tema": idf, "idf_sklearn": tv.idf_.tolist(),
                                "tfidf_tema": [AB.tfidf_tema(x, idf, voc) for x in d], "sklearn": sk,
                                "coseno_tfidf": [[AB.coseno(AB.tfidf_tema(a, idf, voc), AB.tfidf_tema(b, idf, voc))
                                                  for b in d] for a in d]}
    N = len(docs)
    dfc = Counter(w for d in docs for w in set(d))
    tops = {}
    for i, d in enumerate(docs):
        c = Counter(d)
        tops[nombres[i]] = {
            "tf": AB.ordena(c.items(), 10),
            "tfidf": AB.ordena([(w, f * math.log(N / dfc[w])) for w, f in c.items()], 10),
            "sklearn": AB.ordena([(w, f * (math.log((1 + N) / (1 + dfc[w])) + 1)) for w, f in c.items()], 10)}
    ref["quijote"]["tops"] = tops
    ref["quijote"]["busquedas"] = BW["quijote"]["busquedas"]
    SALIDA_REF.write_text(json.dumps(ref, ensure_ascii=False), encoding="utf-8")
    print(SALIDA_JS.relative_to(RAIZ), f"{SALIDA_JS.stat().st_size / 1e6:.2f} MB")
    print(SALIDA_REF.relative_to(RAIZ), f"{SALIDA_REF.stat().st_size / 1e6:.2f} MB",
          len(ref["ngramas"]), "casos de n-gramas")


if __name__ == "__main__":
    main()
