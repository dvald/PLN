"""
Genera Demos/10_visualizacion_datos.js (datos de la demo del Tema 10) y Demos/fuentes/referencia_python_10.json
(valores de referencia con los que Demos/fuentes/probar_lib_10.js comprueba la biblioteca JavaScript).

Uso: entorno/.venv_t10/bin/python Demos/fuentes/generar_datos_10.py
Parte de los resultados de las Clases 17, 19 y 20 (revision/*.json) y de los datos de Temas/Tema10/recursos/datos/.
Entorno: Python 3.12 · scikit-learn 1.9.1 · spaCy 3.8.16 (es_core_news_sm 3.8.0) · wordcloud 1.9.6 · CPU.
"""
import json
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Temas" / "Tema10" / "recursos"))
import t10_comun as C  # noqa: E402

from sklearn.decomposition import NMF, PCA  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from wordcloud import STOPWORDS  # noqa: E402

C17 = RAIZ / "Clases" / "Clase17_Tema10_Similitud" / "revision"
C19 = RAIZ / "Clases" / "Clase19_Tema10_PalabrasEstructura" / "revision"
C20 = RAIZ / "Clases" / "Clase20_Tema10_Sustancia" / "revision"
leer = lambda p: json.loads(p.read_text(encoding="utf-8"))  # noqa: E731
R17, K17 = leer(C17 / "resultados_similitud.json"), leer(C17 / "coordenadas_similitud.json")
R19, K19 = leer(C19 / "resultados_contenido.json"), leer(C19 / "datos_contenido.json")
R20, K20 = leer(C20 / "resultados_sustancia.json"), leer(C20 / "datos_sustancia.json")
nlp = C.nlp()
VACIAS = sorted(nlp.Defaults.stop_words)
POLARES = ["no", "bien", "mal", "buena", "bueno", "buen", "mala", "malo", "mejor", "peor", "nada", "nunca"]
D, REF = {"generado": "2026-10-12"}, {}
r4 = C.r4


def imul(a, b):
    return (a * b) & 0xFFFFFFFF


def mulberry32(seed):
    estado = [seed & 0xFFFFFFFF]

    def rnd():
        a = (estado[0] + 0x6D2B79F5) & 0xFFFFFFFF
        estado[0] = a
        t = imul(a ^ (a >> 15), a | 1)
        t = ((t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd


r = mulberry32(42)
REF["mulberry32_42"] = [r() for _ in range(6)]
REF["tokens_prueba"] = {t: C.tokens(t) for t in ("El cielo está despejado y el sol brilla.",
                                                  "Las redes 5G prometen un internet más rápido; año 2026.",
                                                  "—¿Quién es? —respondió Sancho—. ¡Vuestra merced!")}
D["vacias"] = VACIAS
D["polares"] = POLARES
D["stopwords_wordcloud"] = sorted(STOPWORDS)

# ------------------------------------------------------------------ Clase 17: noticias, mapas y medidas
n = len(K17["ids"])
D["noticias"] = {k: K17[k] for k in ("ids", "seccion", "conjunto", "mezcla_con", "titular")}
D["noticias"]["tfidf"] = K17["tfidf_disperso"]
D["noticias"]["lemas"] = K17["lemas"]
D["noticias"]["vocab"] = K17["vocab"]
D["mapas"] = {k: v for k, v in K17["proy"].items()}
ts = R17["tsne"]
D["medidas"] = {"pca": R17["pca"]["medidas"], "mds": R17["mds"]["medidas"],
                "radviz": R17["topicos"]["radviz"]["medidas"]}
for k, v in ts["ejecuciones"].items():
    D["medidas"]["tsne_" + k] = {x: v[x] for x in ("confianza", "solapamiento_vecinos", "pureza_seccion", "kl")}
for k, v in ts["inicio_aleatorio"].items():
    if isinstance(v, dict) and "confianza" in v:
        D["medidas"]["tsne_random_" + k] = {x: v[x] for x in ("confianza", "solapamiento_vecinos", "pureza_seccion", "kl")}
D["resumen17"] = {"pca_varianza": R17["pca"]["varianza_explicada"], "pca_pc1": R17["pca"]["pc1"], "pca_pc2": R17["pca"]["pc2"],
                  "stress": R17["mds"]["stress1_clasico"], "espacio_original_pureza": R17["espacio_original"]["pureza_seccion_5_vecinos"],
                  "coseno": {k: R17["coseno"][k] for k in ("media_intra", "media_inter", "pares_coseno_cero", "pares_total")},
                  "entre_semillas": {k: v for k, v in ts["inicio_aleatorio"].items() if k.endswith("entre_semillas")},
                  "lda": {k: R17["lda_lineal"][k] for k in ("real", "silueta_azar_media", "acierto_prueba_azar_medio")},
                  "ej5": R17["ejercicio5"]}
D["mapas_lda"] = {"real": K17["lda_real"], "azar": K17["lda_azar"]}
D["ej5"] = K17["ejercicio5"]
D["theta"] = K17["theta"]
D["topicos_palabras"] = K17["topicos_palabras"]
# referencia: vecinos y peor par (coseno en el espacio original)
S = np.zeros((n, n))
for i, a in enumerate(K17["tfidf_disperso"]):
    for j, b in enumerate(K17["tfidf_disperso"]):
        S[i, j] = sum(v * b.get(k, 0.0) for k, v in a.items())
REF["vecinos5"] = {K17["ids"][i]: [K17["ids"][j] for j in sorted((j for j in range(n) if j != i), key=lambda j: (-S[i, j], j))[:5]]
                   for i in (0, 25, 46, 81)}
REF["peor_par"] = R17["vecino_mas_cercano_en_mapa"]["peores_pares"][0]
REF["radviz_primeros"] = K17["proy"]["radviz"][:5]
# PCA a mano: matriz pequeña de ejemplo (documentos × términos, recuentos)
PCA_TERMINOS = ["gol", "partido", "precio", "euros", "médico", "paciente"]
PCA_DOCS = [["El equipo ganó el partido con un gol", 2, 2, 0, 0, 0, 0],
            ["Partido aplazado por la lluvia", 0, 2, 0, 0, 0, 0],
            ["El precio del alquiler sube 40 euros", 0, 0, 2, 1, 0, 0],
            ["Los euros del fichaje: precio récord", 1, 0, 1, 2, 0, 0],
            ["El médico atendió al paciente", 0, 0, 0, 0, 1, 2],
            ["Un paciente, dos médicos", 0, 0, 0, 0, 2, 1]]
M = np.array([d[1:] for d in PCA_DOCS], dtype=float)
p = PCA(n_components=2).fit(M)
D["pca_mano"] = {"terminos": PCA_TERMINOS, "docs": [d[0] for d in PCA_DOCS], "matriz": M.astype(int).tolist()}
REF["pca_mano"] = {"varianza": [float(x) for x in p.explained_variance_ratio_], "Y": p.transform(M).tolist(),
                   "componentes": p.components_.tolist()}

# relevancia (Clase 20): φ y p_w del NMF de las noticias con la misma TF-IDF
tfv = TfidfVectorizer(token_pattern=C.PATRON, min_df=2)
X = tfv.fit_transform(K17["lemas"])
assert list(tfv.get_feature_names_out()) == K17["vocab"]
nmf = NMF(n_components=4, random_state=0, max_iter=3000).fit(X)
Hm = nmf.components_
phi = Hm / Hm.sum(1, keepdims=True)
pw = np.asarray(X.sum(0)).ravel()
pw = pw / pw.sum()
D["termite"] = {"phi": phi.tolist(), "pw": pw.tolist()}
REF["relevancia"] = R20["topicos_noticias"]["relevancia_top8"]

# ------------------------------------------------------------------ Clase 19: Quijote, reseñas, «cielo»
caps = C.quijote()
toks = [C.tokens(c["texto"]) for c in caps]
etq = [c["etiqueta"] for c in caps]
D["quijote"] = {"etiquetas": etq, "titulos": [c["titulo"][:90] for c in caps], "longitudes": [len(t) for t in toks],
                "partes": [c["parte"] for c in caps]}
cuenta = {1: Counter(), 2: Counter()}
for c, t in zip(caps, toks):
    cuenta[c["parte"]].update(t)
total = cuenta[1] + cuenta[2]
D["quijote"]["frecuencias"] = {"I": cuenta[1].most_common(3000), "II": cuenta[2].most_common(3000),
                               "todo": total.most_common(3000)}
VS = set(VACIAS)
cont1 = Counter({w: c for w, c in cuenta[1].items() if w not in VS})
cont2 = Counter({w: c for w, c in cuenta[2].items() if w not in VS})
D["quijote"]["contenido_n"] = [sum(cont1.values()), sum(cont2.values())]
D["quijote"]["contenido_V"] = [len(cont1), len(cont2)]
# recuentos exactos de las palabras que se comparan (las 300 de contenido más frecuentes de cada parte)
top1, top2 = [w for w, _ in cont1.most_common(300)], [w for w, _ in cont2.most_common(300)]
pal_cmp = sorted(set(top1) | set(top2))
D["quijote"]["comparacion"] = {"top_I": top1, "top_II": top2, "palabras": pal_cmp,
                               "I": [cont1[w] for w in pal_cmp], "II": [cont2[w] for w in pal_cmp]}
# recuentos por capítulo (dispersos) de las palabras con 20 apariciones o más
por_cap = {}
for w, c in total.items():
    if c >= 20:
        por_cap[w] = []
for i, t in enumerate(toks):
    for w, c in Counter(t).items():
        if w in por_cap:
            por_cap[w].append([i, c])
D["quijote"]["por_capitulo"] = por_cap
REF["serie_duquesa"] = [r4(x) for x in K19["tendencias"]["duquesa"]]
s = np.array(K19["tendencias"]["duquesa"])
REF["serie_duquesa_suave5"] = [r4(x) for x in np.convolve(s, np.ones(5) / 5, mode="same")]
REF["partes"] = R19["partes"]
REF["top_positivas"] = R19["opiniones"]["top_positivas"]
REF["tamanos_rs05"] = None
# regla de tamaños de WordCloud (sin colisiones) para las 12 primeras palabras de contenido del Quijote
norm = [(w, c / R19["quijote"]["top_sin_vacias"][0][1]) for w, c in R19["quijote"]["top_sin_vacias"][:12]]
for rs, clave in ((0.5, "tamanos_rs05"), (1.0, "tamanos_rs1"), (0.0, "tamanos_rs0")):
    fs, ultima, out = 200, 1.0, []
    for w, f in norm:
        if rs != 0:
            fs = int(round((rs * (f / float(ultima)) + (1 - rs)) * fs))
        ultima = f
        out.append([w, fs])
    REF[clave] = out
res = C.leer_tsv("resenas_t7.tsv")
D["resenas"] = [{"id": x["id"], "polaridad": x["polaridad"], "dominio": x["dominio"], "texto": x["texto"]} for x in res]
D["cielo"] = [x["frase"] for x in C.leer_tsv("cielo_ejercicio8.tsv")]
REF["ej8"] = R19["ejercicio8"]
# coocurrencias por oración en el Quijote para varias palabras objetivo (para la PMI de la demo)
oraciones = [C.tokens(f) for c in caps for f in C.frases(c["texto"])]
N = len(oraciones)
dfq = Counter(w for o in oraciones for w in set(o) if w not in VS)
OBJETIVOS = ["dulcinea", "rocinante", "ínsula", "duquesa", "gigantes", "yelmo", "molinos", "venta", "armas", "barcelona",
             "encantadores", "sancho"]
cooc = {}
for obj in OBJETIVOS:
    co = Counter()
    for o in oraciones:
        so = set(o)
        if obj in so:
            co.update(w for w in so if w != obj and w not in VS)
    lista = sorted(([w, c] for w, c in co.items() if c >= 2), key=lambda x: (-x[1], x[0]))[:400]
    cooc[obj] = {"n_objetivo": dfq[obj], "co": lista, "df": {w: dfq[w] for w, _ in lista}}
D["cooc_quijote"] = {"N": N, "objetivos": cooc}
REF["dulcinea_pmi"] = R19["dulcinea"]["por_pmi_min5"]
# continuaciones y concordancias de raíces del Quijote
RAICES = ["vuestra merced", "la sin par", "respondió sancho", "dijo don quijote", "el caballero de la", "señor don",
          "dulcinea del", "por cierto", "en un lugar"]
arboles = {}
for rz in RAICES:
    p_ = rz.split()
    conts, lineas = [], []
    for o in oraciones:
        for i in range(len(o) - len(p_) + 1):
            if o[i:i + len(p_)] == p_:
                conts.append(o[i + len(p_):i + len(p_) + 3])
                if len(lineas) < 40:
                    lineas.append([" ".join(o[max(0, i - 6):i]), rz, " ".join(o[i + len(p_):i + len(p_) + 6])])
    arboles[rz] = {"continuaciones": conts, "kwic": lineas}
D["arboles_quijote"] = arboles
REF["arbol_vuestra_merced"] = R19["arbol_vuestra_merced"]
REF["arbol_sin_par"] = R19["arbol_sin_par"]
REF["arbol_calidad"] = R19["arbol_calidad"]
# análisis gramaticales precalculados con spaCy
FRASES_DEP = ["El gato se sentó en la alfombra.",
              "Sancho Panza seguía a su señor por los caminos de la Mancha.",
              "El pájaro voló alto en el cielo azul.",
              "La calidad del producto, sin embargo, es justita.",
              "No es de calidad."]
D["dependencias"] = []
for f in FRASES_DEP:
    d = nlp(f)
    D["dependencias"].append({"frase": f, "tokens": [{"i": t.i, "texto": t.text, "pos": t.pos_, "dep": t.dep_,
                                                       "cabeza": t.head.i} for t in d]})
FRASES_NER = ["Juan Pablo II visitó España el 19 de agosto de 1989.",
              "Don Quijote y Sancho Panza salieron de su aldea de la Mancha hacia Barcelona.",
              "El Hospital Clínico de Valdeluna realiza su primer trasplante doble.",
              "Grupo Almenara abrirá nuevas tiendas en Portugal."]
D["entidades"] = [{"frase": f, "ents": [[e.start_char, e.end_char, e.label_] for e in nlp(f).ents]} for f in FRASES_NER]
D["modelo_spacy"] = {"nombre": nlp.meta["name"], "version": nlp.meta["version"], "etiquetas": list(nlp.get_pipe("ner").labels)}

# ------------------------------------------------------------------ Clase 20: huella, firmas y tópicos del Quijote
D["huella"] = K20["huella"]
D["huella_resumen"] = {k: R20["huella"][k] for k in ("medias_por_parte", "correlacion_ttr_bruto_longitud",
                                                       "correlacion_mattr_longitud", "curioso_impertinente_I33_35")}
D["ttr_por_tamano"] = R20["ttr_por_tamano"]
FUENTES = {
    "Parte I (cap. 1-8)": "\n".join(c["texto"] for c in caps[:8]),
    "Parte I (cap. 15-22)": "\n".join(c["texto"] for c in caps[14:22]),
    "Curioso impertinente (I-33 a I-35)": "\n".join(caps[etq.index(e)]["texto"] for e in ("I-33", "I-34", "I-35")),
    "Parte II (cap. 1-8)": "\n".join(c["texto"] for c in caps[52:60]),
    "Parte II (cap. 60-67)": "\n".join(c["texto"] for c in caps[111:119]),
    "Noticias ficticias (Tema 6)": "\n".join(C.texto_noticia(f) for f in C.leer_noticias()),
    "Reseñas ficticias (Tema 7)": "\n".join(x["texto"] for x in res),
}


def limpio(t):
    import re
    return re.sub(r"\s+", " ", t.lower()).strip()


muestras = {k: limpio(v)[:20000] for k, v in FUENTES.items()}
D["firmas_muestras"] = muestras
D["firmas_resultado"] = {k: R20["firmas"][k] for k in ("disimilitud_total", "robustez")}
REF["cng_n4_L300"] = R20["firmas"]["disimilitud_total"]
REF["cng_sensibilidad"] = R20["firmas"]["sensibilidad"]
tk_base = C.tokens(muestras["Parte I (cap. 1-8)"])
REF["muestra_base_ttr_mattr"] = [len(set(tk_base)) / len(tk_base), None]
import ast  # noqa: E402
# mattr() copiada de analisis_sustancia.py sin ejecutar ese script
_f = (RAIZ / "Clases" / "Clase20_Tema10_Sustancia" / "analisis_sustancia.py").read_text(encoding="utf-8")
exec(compile(ast.Module([n for n in ast.parse(_f).body if isinstance(n, ast.FunctionDef) and n.name == "mattr"], []),
             "mattr", "exec"))
REF["muestra_base_ttr_mattr"][1] = mattr(tk_base)  # noqa: F821
D["tiara"] = K20["tiara"]
D["topicos_quijote"] = {k: R20["topicos_quijote"][k] for k in ("palabras", "capitulo_dominante",
                                                                 "jaccard_mejor_pareja_otra_inicializacion")}

js = "// Generado por Demos/fuentes/generar_datos_10.py: no editar a mano.\nwindow.DATOS10 = " + \
     json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
(RAIZ / "Demos" / "10_visualizacion_datos.js").write_text(js, encoding="utf-8")
(RAIZ / "Demos" / "fuentes" / "referencia_python_10.json").write_text(json.dumps(REF, ensure_ascii=False, indent=1),
                                                                      encoding="utf-8")
print("OK", round(len(js) / 1024), "KB de datos")
