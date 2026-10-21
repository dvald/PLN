"""Datos y referencias de la demo del Tema 6 (Demos/06_topicos.html).

Uso (desde la raíz): entorno/.venv_pln/bin/python Demos/fuentes/generar_datos_06.py
Genera:
  - Demos/06_topicos_datos.js           (window.DATOS06: corpus, palabras vacías, matriz del tema, tópicos
                                         precalculados con scikit-learn, intruso, entidades y notas clínicas)
  - Demos/fuentes/referencia_python_06.json  (valores de Python que Demos/fuentes/probar_lib_06.js compara con la
                                         biblioteca Demos/06_topicos_lib.js)
Lee los resultados ya calculados de las Clases 9, 10, 11 y del laboratorio (revision/*.json) y recalcula con
scikit-learn y numpy lo que la biblioteca JS reproduce (n-gramas, Naive Bayes, SVD) y, con implementaciones de
referencia en Python, NMF por actualizaciones multiplicativas y LDA por muestreo de Gibbs con el mismo generador
pseudoaleatorio (mulberry32) que usa la demo.
"""
import json
import math
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Temas" / "Tema06" / "recursos"))
import t6_comun as C  # noqa: E402

import numpy as np  # noqa: E402
from sklearn.feature_extraction.text import CountVectorizer  # noqa: E402
from sklearn.naive_bayes import MultinomialNB  # noqa: E402

CL = RAIZ / "Clases"
R9 = json.loads((CL / "Clase09_Tema6_Ngramas" / "revision" / "resultados_c9.json").read_text(encoding="utf-8"))
R10 = json.loads((CL / "Clase10_Tema6_NaiveBayes" / "revision" / "resultados_nb.json").read_text(encoding="utf-8"))
R11 = json.loads((CL / "Clase11_Tema6_Topicos" / "revision" / "resultados_topicos.json").read_text(encoding="utf-8"))
RL = json.loads((CL / "Lab_S8_Tema6_Entidades" / "revision" / "resultados_lab.json").read_text(encoding="utf-8"))
filas = C.leer_corpus()
vac = C.vacias()
REF = {}


# ------------------------------------------------------------------ generador pseudoaleatorio compartido con la demo
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

# ------------------------------------------------------------------ n-gramas (Clase 9)
ent = [f for f in filas if f["conjunto"] == "entrenamiento"]
docs_ent = [C.texto(f) for f in ent]
REF["ngramas"] = {"columnas": {n: CountVectorizer(token_pattern=C.PATRON, ngram_range=(int(n), int(n))).fit(docs_ent)
                               .get_feature_names_out().shape[0] for n in ("1", "2", "3")},
                  "columnas_sin_vacias_1": CountVectorizer(token_pattern=C.PATRON, stop_words=vac).fit(docs_ent)
                  .get_feature_names_out().shape[0],
                  "bigramas_sin_vacias_titular": R9["titular_ejemplo"]["bigramas_sin_vacias"],
                  "distintivos_bigramas": R9["distintivos_bigramas"], "distintivos_unigramas": R9["distintivos_unigramas"],
                  "distintivos_bigramas_contenido": R9["distintivos_bigramas_contenido"],
                  "matriz": R9["matriz_entrenamiento"]}
REF["tokens_prueba"] = {t: C.tokens(t) for t in ("La red 5G cubre ya al 90 % de la población",
                                                  "Ñandú, pingüino y «cigüeña»: 3 aves", "co2 y a2b la_casa")}

# ------------------------------------------------------------------ Naive Bayes con palabras (la demo no lematiza)
pru = [f for f in filas if f["conjunto"] == "prueba"]
nue = [f for f in filas if f["conjunto"] == "nuevo"]
y_ent = [f["seccion"] for f in ent]
TEXTOS_LIBRES = ["El hospital reduce la lista de espera", "El equipo médico gana", "La bolsa sube tras el gol",
                 "Una aplicación detecta el cáncer con inteligencia artificial"]
REF["nb"] = {}
for nombre, sw in (("palabras", None), ("palabras_sin_vacias", vac)):
    for alfa in (1.0, 0.1):
        cv = CountVectorizer(token_pattern=C.PATRON, stop_words=sw)
        X = cv.fit_transform(docs_ent)
        nb = MultinomialNB(alpha=alfa).fit(X, y_ent)
        cls = [str(c) for c in nb.classes_]

        def puntuar(textos):
            jll = nb.predict_joint_log_proba(cv.transform(textos))
            return [{c: float(v) for c, v in zip(cls, fila)} for fila in jll]
        pred = [cls[int(i)] for i in nb.predict_joint_log_proba(cv.transform([C.texto(f) for f in pru])).argmax(1)]
        REF["nb"][f"{nombre}_{alfa}"] = {
            "vocabulario": len(cv.get_feature_names_out()), "clases": cls,
            "log_prior": [float(v) for v in nb.class_log_prior_],
            "prueba_ids": [f["id"] for f in pru], "prueba_pred": pred,
            "aciertos": sum(p == f["seccion"] for p, f in zip(pred, pru)),
            "prueba_puntuaciones": puntuar([C.texto(f) for f in pru]),
            "libres": puntuar(TEXTOS_LIBRES),
            "nuevas_pred": [cls[int(i)] for i in nb.predict_joint_log_proba(cv.transform([C.texto(f) for f in nue])).argmax(1)]}
REF["nb_textos_libres"] = TEXTOS_LIBRES
REF["nb_mano"] = {"textos": R10["ejemplo_mano"]["textos"], "frase": R10["ejemplo_mano"]["frase"],
                  "puntuaciones": {c: v["puntuacion_ln"] for c, v in R10["ejemplo_mano"]["clases"].items()}}

# ------------------------------------------------------------------ SVD de la matriz del tema
D = np.array(R11["ejemplo_tema"]["D"], dtype=float)
U, s, Vt = np.linalg.svd(D, full_matrices=False)
REF["svd"] = {"D": D.tolist(), "sigma": s.tolist(), "Vt_abs": np.abs(Vt).tolist(),
              "reconstruccion": {k: (U[:, :k] @ np.diag(s[:k]) @ Vt[:k]).tolist() for k in range(1, 6)},
              "error": {k: float(np.linalg.norm(D - U[:, :k] @ np.diag(s[:k]) @ Vt[:k])) for k in range(1, 6)}}
# Con otra matriz (para comprobar que la biblioteca no está ajustada al ejemplo)
D2 = np.array([[1, 0, 2, 0, 1], [0, 3, 0, 1, 0], [2, 1, 1, 0, 0], [0, 0, 1, 2, 3]], dtype=float)
U2, s2, Vt2 = np.linalg.svd(D2, full_matrices=False)
REF["svd_otra"] = {"D": D2.tolist(), "sigma": s2.tolist(), "Vt_abs": np.abs(Vt2).tolist(),
                   "reconstruccion_2": (U2[:, :2] @ np.diag(s2[:2]) @ Vt2[:2]).tolist()}


# ------------------------------------------------------------------ NMF por actualizaciones multiplicativas (referencia)
def nmf_mu(V, k, semilla, iteraciones=2000, eps=1e-12):
    """Lee y Seung (2001), norma de Frobenius. Bucles explícitos en el mismo orden que la biblioteca JS."""
    rnd = mulberry32(semilla)
    V = V.tolist()
    n, m = len(V), len(V[0])
    escala = math.sqrt(sum(sum(f) for f in V) / (n * m) / k)
    W = [[rnd() * escala for _ in range(k)] for _ in range(n)]
    Hh = [[rnd() * escala for _ in range(m)] for _ in range(k)]

    def mat(A, B):
        return [[sum(A[i][t] * B[t][j] for t in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]

    def tr(A):
        return [list(c) for c in zip(*A)]
    for _ in range(iteraciones):
        Wt = tr(W)
        num, den = mat(Wt, V), mat(mat(Wt, W), Hh)
        Hh = [[Hh[i][j] * num[i][j] / (den[i][j] + eps) for j in range(m)] for i in range(k)]
        Ht = tr(Hh)
        num, den = mat(V, Ht), mat(W, mat(Hh, Ht))
        W = [[W[i][j] * num[i][j] / (den[i][j] + eps) for j in range(k)] for i in range(n)]
    WH = mat(W, Hh)
    err = math.sqrt(sum((V[i][j] - WH[i][j]) ** 2 for i in range(n) for j in range(m)))
    return W, Hh, err


REF["nmf_mu"] = {}
for k, sd in ((2, 1), (2, 7), (3, 1)):
    W, Hh, e = nmf_mu(D, k, sd)
    REF["nmf_mu"][f"k{k}_s{sd}"] = {"W": W, "H": Hh, "error": e}
REF["nmf_sklearn"] = R11["ejemplo_tema"]["nmf"]

# ------------------------------------------------------------------ LDA por muestreo de Gibbs (referencia)
TERM = R11["ejemplo_tema"]["terminos"]
docs_lda = [[t for t, c in zip(range(len(TERM)), fila) for _ in range(int(c))] for fila in D]


def gibbs(docs, K, W_, alfa, beta, semilla, barridos):
    rnd = mulberry32(semilla)
    z = [[int(rnd() * K) for _ in d] for d in docs]
    nkw = [[0] * W_ for _ in range(K)]
    nk = [0] * K
    ndk = [[0] * K for _ in docs]
    for d, doc in enumerate(docs):
        for i, w in enumerate(doc):
            k = z[d][i]
            nkw[k][w] += 1
            nk[k] += 1
            ndk[d][k] += 1
    for _ in range(barridos):
        for d, doc in enumerate(docs):
            for i, w in enumerate(doc):
                k = z[d][i]
                nkw[k][w] -= 1
                nk[k] -= 1
                ndk[d][k] -= 1
                p = [(nkw[j][w] + beta) / (nk[j] + W_ * beta) * (ndk[d][j] + alfa) for j in range(K)]
                u = rnd() * sum(p)
                acum, nuevo = 0.0, K - 1
                for j in range(K):
                    acum += p[j]
                    if u < acum:
                        nuevo = j
                        break
                z[d][i] = nuevo
                nkw[nuevo][w] += 1
                nk[nuevo] += 1
                ndk[d][nuevo] += 1
    phi = [[(nkw[k][w] + beta) / (nk[k] + W_ * beta) for w in range(W_)] for k in range(K)]
    theta = [[(ndk[d][k] + alfa) / (len(doc) + K * alfa) for k in range(K)] for d, doc in enumerate(docs)]
    return {"z": z, "phi": phi, "theta": theta}


REF["gibbs"] = {}
for (K, a, b, sd, n) in ((2, 0.5, 0.1, 3, 0), (2, 0.5, 0.1, 3, 1), (2, 0.5, 0.1, 3, 50), (3, 0.1, 0.01, 11, 30)):
    REF["gibbs"][f"K{K}_a{a}_b{b}_s{sd}_n{n}"] = {"K": K, "alfa": a, "beta": b, "semilla": sd, "barridos": n,
                                                  **gibbs(docs_lda, K, len(TERM), a, b, sd, n)}

# ------------------------------------------------------------------ notas clínicas: reglas (JS debe reproducirlas)
NOTAS = RL["notas_demo"]
FARM = RL["clinico_reglas"]["diccionario_farmacos_desarrollo"]
RX_D = re.compile(RL["clinico_reglas"]["regex_dosis"])
RX_F = re.compile(RL["clinico_reglas"]["regex_frecuencia"])


def reglas_clinicas(texto, farmacos):
    out = []
    for f in farmacos:
        for m in re.finditer(r"\b" + re.escape(f) + r"\b", texto, flags=re.IGNORECASE):
            out.append([m.start(), m.end(), "FARMACO"])
    out += [[m.start(), m.end(), "DOSIS"] for m in RX_D.finditer(texto)]
    out += [[m.start(), m.end(), "FRECUENCIA"] for m in RX_F.finditer(texto)]
    return sorted(out)


EXTRA = ["Se pauta ácido acetilsalicílico 100 mg al día y metformina 850 mg cada 12 horas.",
         "Paracetamol 650 mg diario; Enalapril 5 mg por la noche; 3 inhalaciones de salbutamol.",
         "Dosis: 0,5 ml cada 8 horas; una gota cada 24 horas en ayunas."]
REF["clinico"] = {"notas": {n["id"]: reglas_clinicas(n["texto"], FARM) for n in NOTAS},
                  "extra": {t: reglas_clinicas(t, FARM) for t in EXTRA}}
for n in NOTAS:
    assert REF["clinico"]["notas"][n["id"]] == n["reglas"], n["id"]

# ------------------------------------------------------------------ entidades: medidas de referencia
REF["entidades"] = {k: RL[k]["medidas"] for k in ("modelo_desarrollo", "modelo_evaluacion", "reglas_desarrollo",
                                                  "reglas_evaluacion", "reglas_v2_desarrollo", "reglas_v2_evaluacion")}
REF["entidades_errores"] = {k: RL[k]["errores_por_clase"] for k in ("modelo_desarrollo", "modelo_evaluacion",
                                                                     "reglas_evaluacion", "reglas_v2_evaluacion")}
REF["clinico_medidas_eval"] = RL["clinico_reglas"]["evaluacion"]["por_tipo_exacta"]

# ------------------------------------------------------------------ datos de la demo
N = R11["noticias"]
DATOS = {
    "generado": __import__("time").strftime("%Y-%m-%d"),
    "procedencia": "Corpus ficticio del Tema 6 (Temas/Tema06/recursos/datos/noticias_t6.tsv); resultados precalculados con "
                   "scikit-learn 1.9.1 y spaCy 3.8.16 (es_core_news_sm 3.8.0) en las Clases 9-11 y el laboratorio.",
    "patron": C.PATRON,
    "vacias": vac,
    "corpus": [{"id": f["id"], "seccion": f["seccion"], "conjunto": f["conjunto"], "mezcla": f["mezcla_con"],
                "titular": f["titular"], "texto": f["texto"]} for f in filas],
    "nb_mano": REF["nb_mano"],
    "matriz": {"terminos": TERM, "D": R11["ejemplo_tema"]["D"], "nmf_sklearn": R11["ejemplo_tema"]["nmf"],
               "figura10_error": R11["ejemplo_tema"]["figura10_tema"]["error"]},
    "topicos": {
        "noticias": {"terminos": N["terminos"], "nmf": N["nmf"], "lsa_k4": N["lsa_k4"], "lda_k4": N["lda_k4"],
                     "estabilidad": N["estabilidad_top10_jaccard"], "kmeans": N["kmeans"]},
        "quijote": {"nmf_k8": R11["quijote"]["nmf_k8"], "lda_k8": R11["quijote"]["lda_k8"],
                    "estabilidad": R11["quijote"]["estabilidad_lda_top10_jaccard"],
                    "capitulos": R11["quijote"]["capitulos"], "palabras": R11["quijote"]["palabras"]}},
    "intruso": R11["intruso"],
    "entidades": {"tramos": RL["tramos_demo"], "medidas": REF["entidades"]},
    "clinico": {"notas": NOTAS, "farmacos": FARM, "regex_dosis": RL["clinico_reglas"]["regex_dosis"],
                "regex_frecuencia": RL["clinico_reglas"]["regex_frecuencia"],
                "no_vistos": RL["clinico_farmacos_evaluacion_no_vistos"]},
    "nb_referencia": {"palabras_1.0": {"aciertos": REF["nb"]["palabras_1.0"]["aciertos"]},
                      "lemas_clase10": {"aciertos": R10["prueba"]["aciertos"], "cv": R10["validacion_cruzada"]["tabla"]}},
}
salida = RAIZ / "Demos" / "06_topicos_datos.js"
salida.write_text("// Generado por Demos/fuentes/generar_datos_06.py: no editar a mano.\nwindow.DATOS06 = " +
                  json.dumps(DATOS, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
(RAIZ / "Demos" / "fuentes" / "referencia_python_06.json").write_text(json.dumps(REF, ensure_ascii=False, indent=1),
                                                                     encoding="utf-8")
print(salida.relative_to(RAIZ), salida.stat().st_size, "bytes ·", "referencia_python_06.json escrita")
print("NB palabras α=1:", REF["nb"]["palabras_1.0"]["aciertos"], "· sin vacías:", REF["nb"]["palabras_sin_vacias_1.0"]["aciertos"])
print("NMF MU k2 s1 error:", round(REF["nmf_mu"]["k2_s1"]["error"], 4), "· Gibbs z0:", REF["gibbs"]["K2_a0.5_b0.1_s3_n50"]["z"][0])
