"""
Genera Demos/05_modelado_neuronal_datos.js (datos precalculados de la demo del Tema 5) y
Demos/fuentes/referencia_python_05.json (casos con los que probar_lib_05.js comprueba la biblioteca JS).

Uso (desde la raíz): HF_HUB_OFFLINE=1 entorno/.venv_pln/bin/python Demos/fuentes/generar_datos_05.py
Fuentes: Clases/Clase07_Tema5_Embeddings/analisis_embeddings.py (mismos parámetros, un hilo, semilla 1
y hash estable: los modelos son idénticos a los de las diapositivas, lo que se comprueba aquí) y
Clases/Clase08_Tema5_BERT/analisis_bert.py y revision/resultados_bert.json (BETO, revisión c4d86612f51b).
"""
import json
import math
import random
import sys
from collections import Counter
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
C7 = RAIZ / "Clases" / "Clase07_Tema5_Embeddings"
C8 = RAIZ / "Clases" / "Clase08_Tema5_BERT"
sys.path.insert(0, str(C7))
sys.path.insert(0, str(C8))
import analisis_bert as AB  # noqa: E402
import analisis_embeddings as AE  # noqa: E402

E = json.loads((C7 / "revision" / "resultados_embeddings.json").read_text(encoding="utf-8"))
RB = json.loads((C8 / "revision" / "resultados_bert.json").read_text(encoding="utf-8"))

# Palabras con vecinos precalculados: las 8 de la clase y otras frecuentes de contenido
EXTRA = ["caballero", "escudero", "sancho", "quijote", "señor", "amo", "señora", "doncella", "princesa", "reina",
         "rey", "duque", "duquesa", "cura", "barbero", "bachiller", "caballo", "asno", "rucio", "espada", "adarga",
         "yelmo", "venta", "ventero", "aldea", "camino", "aventura", "aventuras", "batalla", "gigante", "gigantes",
         "encantador", "encantadores", "libros", "caballerías", "historia", "amor", "hermosura", "bella", "discreta",
         "loco", "locura", "gobernador", "gobierno", "dineros", "escudos", "comer", "dormir", "respondió", "preguntó",
         "lloró", "triste", "alegre", "noche", "día", "agua", "río", "cueva", "carta", "toboso"]


def capitulo_txt(caps, i):
    c = caps[i]
    t = c["titulo"]
    return f"{AE.nombre_cap(c)} · {t[:90] + ('…' if len(t) > 90 else '')}"


def main():
    import nltk
    nltk.data.path.insert(0, str(RAIZ / "entorno" / "nltk_data"))
    from nltk.corpus import stopwords
    vacias = set(stopwords.words("spanish"))
    caps = AE.capitulos((AE.DATOS / "quijote_completo.txt").read_text(encoding="utf-8"))
    nombres = [AE.nombre_cap(c) for c in caps]
    F = [f for c in caps for f in AE.frases(c["texto"])]
    modelos, _ = AE.entrenar(F)
    sg, cb, ft = modelos["skipgram"], modelos["cbow"], modelos["fasttext"]
    frec = Counter(w for f in F for w in f)

    docs = [[w for w in AE.tokens(c["texto"]) if w not in vacias] for c in caps]
    N = len(docs)
    dfc = Counter(w for d in docs for w in set(d))
    voc = sorted(dfc)
    pos = {w: i for i, w in enumerate(voc)}
    X = np.zeros((N, len(voc)))
    for i, d in enumerate(docs):
        for w, f in Counter(d).items():
            X[i, pos[w]] = f * math.log(N / dfc[w])
    W = X.T

    sondas = list(E["vecinos"])
    palabras = sondas + [w for w in EXTRA if w not in sondas and w in sg.wv and w in pos]
    vecinos = {}
    for w in palabras:
        vecinos[w] = {"frecuencia": frec[w], "capitulos": dfc[w], "tfidf": AE.vecinos_tfidf(W, voc, pos, w),
                      "skipgram": AE.vecinos_modelo(sg, w), "cbow": AE.vecinos_modelo(cb, w)}
    for w in sondas:  # mismos modelos que las diapositivas
        for m in ("tfidf", "skipgram", "cbow"):
            assert vecinos[w][m] == E["vecinos"][w][m], (w, m)

    # Búsqueda: puesto y cinco primeros capítulos por método
    consultas = [l.split("\t") for l in (AE.DATOS / "consultas_quijote.tsv").read_text(encoding="utf-8").splitlines()
                 if l.strip() and not l.startswith("#")]
    idf = {w: math.log(N / dfc[w]) for w in dfc}
    peso = lambda w: idf.get(w, math.log(N))  # noqa: E731
    D = {"w2v_media": (np.array([AE.media_ponderada(d, sg, lambda w: 1.0) for d in docs]), sg, lambda w: 1.0),
         "w2v_ponderada": (np.array([AE.media_ponderada(d, sg, peso) for d in docs]), sg, peso),
         "fasttext_ponderada": (np.array([AE.media_ponderada(d, ft, peso) for d in docs]), ft, peso)}

    def orden(M, q):
        s = M @ q / (np.linalg.norm(M, axis=1) * np.linalg.norm(q) + 1e-12)
        o = sorted(range(M.shape[0]), key=lambda i: (-s[i], i))
        return o, s

    busq = []
    for (cap, q), ref in zip(consultas, E["busqueda"]["consultas"]):
        qs = [w for w in AE.tokens(q) if w not in vacias]
        g = nombres.index(cap)
        fila = {"capitulo": cap, "titulo": capitulo_txt(caps, g), "consulta": q, "palabras": qs,
                "ausentes": [w for w in qs if w not in pos], "metodos": {}}
        qv = np.zeros(len(voc))
        for w in qs:
            if w in pos:
                qv[pos[w]] += idf[w]
        o, s = orden(X, qv)
        fila["metodos"]["tfidf"] = {"puesto": o.index(g) + 1, "top5": [[nombres[i], round(float(s[i]), 3)] for i in o[:5]]}
        for m, (M, mod, p) in D.items():
            o, s = orden(M, AE.media_ponderada(qs, mod, p))
            fila["metodos"][m] = {"puesto": o.index(g) + 1, "top5": [[nombres[i], round(float(s[i]), 3)] for i in o[:5]]}
        for m in fila["metodos"]:
            assert fila["metodos"][m]["puesto"] == ref[m], (cap, m)
        busq.append(fila)

    # BERT: separación por capas de «banco» (mismo código que el cuaderno de la Clase 8)
    import torch
    from transformers import AutoModelForMaskedLM, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(AB.MODELO, revision=AB.REVISION)
    mlm = AutoModelForMaskedLM.from_pretrained(AB.MODELO, revision=AB.REVISION, use_safetensors=False).eval()
    torch.manual_seed(0)
    banco = RB["contextuales"]["banco"]["frases"]
    sent = [e for e, _ in banco]
    capas = []
    for capa in range(13):
        v = [AB.vector_palabra(tok, mlm.bert, f, "banco", capa)[0] for _, f in banco]
        igual = [AB.coseno(v[i], v[j]) for i in range(4) for j in range(i + 1, 4) if sent[i] == sent[j]]
        dist = [AB.coseno(v[i], v[j]) for i in range(4) for j in range(i + 1, 4) if sent[i] != sent[j]]
        capas.append([capa, round(float(np.mean(igual)), 4), round(float(np.mean(dist)), 4)])
    ultima = [AB.vector_palabra(tok, mlm.bert, f, "banco")[0] for _, f in banco]
    assert np.allclose([[AB.coseno(a, b) for b in ultima] for a in ultima], RB["contextuales"]["banco"]["coseno"], atol=1e-3)

    datos = {
        "generado": "Demos/fuentes/generar_datos_05.py",
        "corpus": E["corpus"], "parametros": E["parametros"], "tiempos": E["tiempos_entrenamiento_s"],
        "vocabulario_modelos": E["vocabulario_modelos"], "dimensiones": E["dimensiones"],
        "vecinos": vecinos, "sondas": sondas, "analogias": E["analogias_skipgram"],
        "busqueda": busq, "fasttext_oov": E["fasttext_oov"], "pca": E["pca"], "spacy_md": E["spacy_md"],
        "bert": {"modelo": RB["modelo"], "versiones": RB["versiones"], "tokenizacion": RB["tokenizacion"],
                 "relleno": RB["relleno"], "contextuales": RB["contextuales"], "banco_por_capa": capas,
                 "atencion": {k: RB["atencion_beto"][k] for k in ("frase", "tokens", "pesos")},
                 "enmascarado": RB["enmascarado"], "a_mano": RB["atencion_a_mano"]},
    }
    (RAIZ / "Demos" / "05_modelado_neuronal_datos.js").write_text(
        "/* Datos precalculados de la demo del Tema 5 (Demos/fuentes/generar_datos_05.py). */\n"
        "window.DATOS05 = " + json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    # ---------------------------------------------------------------- referencia para la biblioteca JS
    from gensim.models.fasttext_inner import compute_ngrams
    rng = np.random.default_rng(5)
    palabras_ng = ["rocín", "dulsinea", "dulcinea", "a", "yo", "ínsula", "quijotesco", "pingüino", "ñandú", "caballería",
                   "inconstitucionalmente", "x"]
    ref = {"ngramas": [{"palabra": w, "min": a, "max": b, "ngramas": compute_ngrams(w, a, b)}
                       for w in palabras_ng for a, b in ((3, 6), (3, 3), (2, 4))]}

    def pares(toks, v):
        out = []
        for i, w in enumerate(toks):
            for j in range(max(0, i - v), min(len(toks), i + v + 1)):
                if j != i:
                    out.append([w, toks[j]])
        return out

    frases_p = ["El cliente ha comprado un coche rojo.", "En un lugar de la Mancha, de cuyo nombre no quiero acordarme",
                "rocín", "Dijo don Quijote a Sancho: ¡mira!"]
    ref["skipgram"] = [{"frase": f, "ventana": v, "tokens": AE.tokens(f), "pares": pares(AE.tokens(f), v)}
                       for f in frases_p for v in (1, 2, 5)]
    casos = [{"Q": RB["atencion_a_mano"]["Q"], "K": RB["atencion_a_mano"]["K"], "V": RB["atencion_a_mano"]["V"]}]
    for n, d in ((2, 2), (4, 3), (5, 4), (1, 3)):
        casos.append({"Q": rng.normal(size=(n, d)).round(3).tolist(), "K": rng.normal(size=(n, d)).round(3).tolist(),
                      "V": rng.normal(size=(n, d)).round(3).tolist()})
    ref["atencion"] = []
    for c in casos:
        Q, K, V = (np.array(c[k]) for k in "QKV")
        for esc in (False, True):
            for cau in (False, True):
                s, a, y = AB.atencion(Q, K, V, esc, cau)
                ref["atencion"].append({**c, "escalar": esc, "causal": cau,
                                        "puntuaciones": [[None if np.isinf(x) else float(x) for x in f] for f in s],
                                        "pesos": a.tolist(), "salida": y.tolist()})
    ref["resumen_busqueda"] = {m: E["busqueda"]["resumen"][m] for m in E["busqueda"]["resumen"]}
    ref["puestos"] = {m: [c[m] for c in E["busqueda"]["consultas"]] for m in E["busqueda"]["resumen"]}
    vs = rng.normal(size=(6, 5))
    ref["coseno"] = [{"a": vs[i].tolist(), "b": vs[i + 1].tolist(), "c": AB.coseno(vs[i], vs[i + 1])} for i in range(5)]
    (RAIZ / "Demos" / "fuentes" / "referencia_python_05.json").write_text(json.dumps(ref, ensure_ascii=False), encoding="utf-8")
    print(len(palabras), "palabras con vecinos ·", len(busq), "consultas ·", len(ref["atencion"]), "casos de atención ·",
          len(ref["ngramas"]), "casos de n-gramas ·", "banco por capa:", capas[4], capas[12])


if __name__ == "__main__":
    random.seed(0)
    main()
