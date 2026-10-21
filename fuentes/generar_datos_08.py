"""Genera Demos/08_modelado_neuronal_ii_datos.js y Demos/fuentes/referencia_python_08.json.

Uso (desde la raíz): HF_HUB_OFFLINE=1 entorno/.venv_pln/bin/python Demos/fuentes/generar_datos_08.py
Lee solo resultados ya calculados (no ejecuta modelos salvo el tokenizador de BETO, para la pestaña de
subpalabras):
  Clases/Clase14_Tema8_Transformers/revision/resultados_c14.json   (BETO, Qwen2.5-0.5B base, BARTO)
  Clases/Clase15_Tema8_AjusteFino/revision/resultados_c15.json     (ajuste fino, prompts, destilación)
  Clases/Clase10_Tema6_NaiveBayes/revision/resultados_nb.json      (Naive Bayes de la Clase 10)
  Temas/Tema06/recursos/datos/noticias_t6.tsv                      (titulares)
La referencia de Python sirve para comprobar la biblioteca JS (Demos/fuentes/probar_lib_08.js).
"""
import csv
import json
import math
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Temas" / "Tema08" / "recursos"))
import t8_comun as C  # noqa: E402
import numpy as np  # noqa: E402
from transformers import AutoTokenizer  # noqa: E402

R14 = json.loads((RAIZ / "Clases/Clase14_Tema8_Transformers/revision/resultados_c14.json").read_text(encoding="utf-8"))
R15 = json.loads((RAIZ / "Clases/Clase15_Tema8_AjusteFino/revision/resultados_c15.json").read_text(encoding="utf-8"))
RNB = json.loads((RAIZ / "Clases/Clase10_Tema6_NaiveBayes/revision/resultados_nb.json").read_text(encoding="utf-8"))
filas = C.leer_corpus()
tr, te, nu = C.particiones(filas)

# ---------------------------------------------------------------- pestaña de subpalabras: tokenización real de BETO
tok = AutoTokenizer.from_pretrained(C.BETO[0], revision=C.BETO[1])
FRASES_BIO = [
    ("La afición del Real Sporting protesta en Valdeluna .", "O O O B-ORG I-ORG O O B-LOC O"),
    ("Grupo Almenara abrirá tiendas en Portugal .", "B-ORG I-ORG O O O B-LOC O"),
    ("La Dra. Ana Martínez trabaja en el Hospital Comarcal de Valdeluna .", "O O B-PER I-PER O O O B-ORG I-ORG I-ORG I-ORG O"),
    ("El Observatorio Económico del Ebro publicó los datos .", "O B-ORG I-ORG I-ORG I-ORG O O O O"),
    ("Los aficionados del Atlético Ebro viajaron a Zaragoza .", "O O O B-ORG I-ORG O O B-LOC O"),
]
subpalabras = []
for frase, etiquetas in FRASES_BIO:
    pal, et = frase.split(), etiquetas.split()
    assert len(pal) == len(et), frase
    e = tok(pal, is_split_into_words=True)
    subpalabras.append({"palabras": pal, "etiquetas": et, "subpalabras": tok.convert_ids_to_tokens(e["input_ids"]),
                        "word_ids": e.word_ids()})

# ---------------------------------------------------------------- referencia de Python para la biblioteca JS


def softmax_T(z, T):
    z = np.asarray(z, dtype=np.float64) / T
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def entropia(p):
    p = np.asarray(p)
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [c - m, c + m]


def alinear(word_ids, etiquetas, modo):
    out, prev = [], None
    for w in word_ids:
        if w is None:
            out.append(-100)
        elif w != prev:
            out.append(etiquetas[w])
        else:
            out.append(-100 if modo == "primera" else etiquetas[w].replace("B-", "I-"))
        prev = w
    return out


ref = {"softmax": [], "wilson": [], "alineacion": [], "spans": [], "media_span": []}
for s in R14["qwen_siguiente"]:
    z = [t["logit"] for t in s["top"]]
    for T in (0.3, 0.5, 1.0, 1.5, 2.0):
        p = softmax_T(z, T)
        ref["softmax"].append({"logits": z, "T": T, "p": p.tolist(), "entropia": entropia(p)})
z = [t["logit"] for t in R15["destilacion"]["top30"]]
for T in (1.0, 2.0, 4.0):
    p = softmax_T(z, T)
    ref["softmax"].append({"logits": z, "T": T, "p": p.tolist(), "entropia": entropia(p)})
for k in range(0, 21):
    ref["wilson"].append({"k": k, "n": 20, "ic": wilson(k, 20)})
ref["wilson"].append({"k": 8702, "n": 10000, "ic": wilson(8702, 10000)})
for s in subpalabras:
    for modo in ("primera", "todas"):
        ref["alineacion"].append({"word_ids": s["word_ids"], "etiquetas": s["etiquetas"], "modo": modo,
                                  "resultado": alinear(s["word_ids"], s["etiquetas"], modo)})
for T in range(1, 31):
    for L in (1, 2, 3, 5, 10, 100):
        n = sum(1 for i in range(T) for j in range(i, T) if j - i < L)
        ref["spans"].append({"T": T, "L": L, "n": n})
for T, i, j in ((9, 1, 4), (9, 4, 4), (5, 0, 4), (12, 3, 7)):
    ok = [1 / (j - i + 1) if i <= k <= j else 0.0 for k in range(T)]
    # fórmula impresa en el tema (p. 33, índices desde 1): media de las palabras 1..j; con índices desde 0, 0..j
    tema = [1 / (j + 1) if k <= j else 0.0 for k in range(T)]
    ref["media_span"].append({"T": T, "i": i, "j": j, "pesos": ok, "pesos_tema": tema})

(RAIZ / "Demos/fuentes/referencia_python_08.json").write_text(json.dumps(ref, ensure_ascii=False), encoding="utf-8")

# ---------------------------------------------------------------- datos de la demo
nb_err = {e["id"]: e["predicha"] for e in RNB["errores_prueba"]}
p05, p15 = R15["prompts"]["qwen_0_5b"], R15["prompts"]["qwen_1_5b"]
af = R15["ajuste_fino"]["ejecuciones"]
bc = {d["id"]: d for d in R14["beto_congelado"]["por_noticia"]}
noticias = []
for k, f in enumerate(te):
    noticias.append({
        "id": f["id"], "seccion": f["seccion"], "mezcla_con": f["mezcla_con"], "titular": f["titular"],
        "pred": {
            "nb": nb_err.get(f["id"], f["seccion"]),
            "beto_congelado": bc[f["id"]]["predicha"],
            **{f"ajuste_{e['modo']}_{e['semilla']}": e["predicciones"][k] for e in af},
            "q05_cero": p05["cero_generacion"]["predicciones"][k],
            "q05_pocos": p05["pocos_generacion"]["predicciones"][k],
            "q05_puntuacion": p05["pocos_puntuacion"]["predicciones"][k],
            "q05_autoconsistencia": p05["autoconsistencia_5"]["predicciones"][k],
            "q15_cero": p15["cero_generacion"]["predicciones"][k],
            "q15_pocos": p15["pocos_generacion"]["predicciones"][k],
        },
        "respuestas": {
            "q05_cero": p05["cero_generacion"]["respuestas"][k], "q05_pocos": p05["pocos_generacion"]["respuestas"][k],
            "q15_cero": p15["cero_generacion"]["respuestas"][k], "q15_pocos": p15["pocos_generacion"]["respuestas"][k],
            "q05_votos": p05["autoconsistencia_5"]["votos"][k],
        },
        "texto": f["texto"],
    })
assert sum(n["pred"]["nb"] == n["seccion"] for n in noticias) == RNB["prueba"]["aciertos"]
cultura = [{"id": f["id"], "titular": f["titular"],
            "q05": p05["cultura_cero_generacion"]["nuevas"]["respuestas"][k],
            "q15": p15["cultura_cero_generacion"]["nuevas"]["respuestas"][k]} for k, f in enumerate(nu)]

D = {
    "generado": "Demos/fuentes/generar_datos_08.py a partir de resultados_c14.json, resultados_c15.json y resultados_nb.json",
    "modelos": {**R14["modelos"], "qwen_instr": R15["modelos"]["qwen_instr"], "qwen_instr_15b": R15["modelos"]["qwen_instr_15b"]},
    "causal": {"qwen": R14["qwen_causal"], "beto": R14["beto_bidireccional"]},
    "siguiente": R14["qwen_siguiente"],
    "continuacion_real": R14["qwen_continuacion_real"],
    "generacion": R14["qwen_generacion"],
    "beto_relleno": R14["beto_relleno"],
    "barto_relleno": R14["barto_relleno"],
    "cruzada": {k: R14["barto_atencion_cruzada"][k] for k in ("entrada", "salida_forzada", "tokens_codificador",
                                                               "tokens_decodificador_salida", "pesos_media_capas_cabezas")},
    "tokenizadores": R14["tokenizadores"],
    "congelado": {"vc": R14["beto_congelado"]["validacion_cruzada"], "prueba": R14["beto_congelado"]["prueba"],
                  "otra": R14["beto_congelado"]["prueba_otra_representacion"],
                  "pca": R14["beto_congelado"]["pca"], "nb": R14["beto_congelado"]["referencia_naive_bayes_clase10"]},
    "subpalabras": subpalabras,
    "spans": R15["spans"],
    "ajuste": {"hiperparametros": R15["ajuste_fino"]["hiperparametros"],
               "ejecuciones": [{k: e[k] for k in ("semilla", "modo", "segundos", "parametros_entrenados",
                                                   "perdida_por_epoca", "aciertos")} for e in af]},
    "noticias": noticias,
    "cultura": cultura,
    "cultura_prueba5": {"q05": p05["cultura_cero_generacion"]["prueba_con_5_etiquetas"]["aciertos"],
                        "q15": p15["cultura_cero_generacion"]["prueba_con_5_etiquetas"]["aciertos"]},
    "prompts": {"instruccion": R15["prompts"]["instruccion"], "sistema": R15["prompts"]["sistema"],
                "ejemplos": [{"id": i, "titular": next(f["titular"] for f in tr if f["id"] == i),
                              "seccion": next(f["seccion"] for f in tr if f["id"] == i)} for i in R15["prompts"]["ejemplos_pocos"]],
                "subpalabras": p05["subpalabras_prompt"],
                "segundos": {k: v["segundos"] for k, v in p05.items() if isinstance(v, dict) and "segundos" in v},
                "segundos_15b": {k: v["segundos"] for k, v in p15.items() if isinstance(v, dict) and "segundos" in v},
                "parametros": {"q05": p05["parametros"], "q15": p15["parametros"]}},
    "base_instruido": R15["base_frente_instruido"],
    "destilacion": R15["destilacion"],
}
js = "/* Datos de la demo del Tema 8, generados por Demos/fuentes/generar_datos_08.py. No editar a mano. */\n" \
     "window.DATOS08 = " + json.dumps(D, ensure_ascii=False) + ";\n"
(RAIZ / "Demos/08_modelado_neuronal_ii_datos.js").write_text(js, encoding="utf-8")
print("datos:", len(js), "bytes ·", len(noticias), "noticias ·", len(subpalabras), "frases BIO")
for s in subpalabras:
    print(" ", s["subpalabras"])
