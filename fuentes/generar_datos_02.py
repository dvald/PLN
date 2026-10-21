"""Genera Demos/02_texto_como_dato_datos.js con resultados reales precalculados.

Uso (desde la raíz): entorno/.venv_pln/bin/python Demos/fuentes/generar_datos_02.py

Lo que la demo calcula en el navegador (tokenizadores propios y raíz Snowball) está en
Demos/02_texto_como_dato_lib.js. Lo que exige Python (word_tokenize y sent_tokenize de
NLTK 3.10.3, y tokens, lemas, categorías y oraciones de spaCy 3.8.16 con
es_core_news_sm 3.8.0) se calcula aquí y se guarda como datos: la demo lo muestra
para los ejemplos predefinidos y lo indica como «precalculado».
"""
import json
import sys
import time
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Clases" / "Clase03_Tema2_Tokenizacion"))
import analisis_corpus as A  # noqa: E402

FRASES = [
    ("Tokenizar en español", "El Dr. Pérez llegó a las 08:30; no quiero acordarme del 3,5 % de EE. UU. ¿Me lo dices?"),
    ("Pregunta de la Clase 2", "¿Me lo dices?"),
    ("Clíticos pegados", "Dímelo."),
    ("Orden de las palabras (1)", "Quiero información de hipotecas, pero no seguros."),
    ("Orden de las palabras (2)", "Quiero información de seguros, pero no hipotecas."),
    ("Mayúsculas con sentido", "Su amiga Estrella estaba de vacaciones y vio una estrella en el cielo."),
    ("Mayúscula a principio de frase", "Días y días pasaron sin noticias nuevas."),
    ("Expresiones de varias palabras", "Vivo en el Principado de Asturias y viajé a Nueva York."),
    ("Lemas con contexto", "Fui al médico y fui feliz."),
    ("Lemas de un verbo", "Ayer jugaron al mismo deporte que han jugado hoy y yo juego mañana."),
    ("Género y lematización", "El número de ingenieras egresadas ha aumentado en los últimos años."),
    ("Negación y palabras vacías", "No me gustó nada el final, aunque la película no está mal."),
]


def unidades_texto(texto):
    """Párrafos si hay líneas en blanco; si no, cada línea (igual que la demo)."""
    if "\n\n" in texto:
        return [" ".join(p.split()) for p in texto.split("\n\n") if p.strip()]
    return [ln.strip() for ln in texto.splitlines() if ln.strip()]


def analizar(texto):
    doc = A.nlp()(texto)
    und = unidades_texto(texto)
    pasos = A.flujo_normalizacion(doc)
    return {
        "nltk": A.tok_nltk(texto),
        "spacy": [[t.text, t.lemma_, t.pos_, bool(t.is_punct)] for t in doc if not t.is_space],
        "ents": [[e.text, e.label_] for e in doc.ents],
        "oraciones": {"nltk": [o for u in und for o in A.seg_nltk(u)],
                      "spacy": [o for u in und for o in A.seg_spacy(u)],
                      "reglas_py": [o for u in und for o in A.seg_reglas(u)]},
        "python_pasos": {k: pasos[k] for k in ("3 sin palabras vacías",
                                                "3b vacías sin quitar negación",
                                                "4a raíz (Snowball)", "4b lema (spaCy)")},
    }


def main():
    ejemplos = []
    for titulo, texto in FRASES:
        ejemplos.append({"id": f"f{len(ejemplos)}", "titulo": titulo, "texto": texto,
                         **analizar(texto)})
    for nombre, desc in A.DOCUMENTOS.items():
        tx = A.leer(nombre)
        if nombre == "quijote_cap01":
            tx = "\n\n".join(A.unidades(nombre, tx)[:3]) + "\n"
            desc += ", tres primeros párrafos"
        else:
            tx = "\n".join(A.unidades(nombre, tx)) + "\n"
        ejemplos.append({"id": nombre, "titulo": "Corpus · " + desc, "texto": tx,
                         **analizar(tx)})

    res = json.loads((RAIZ / "Clases/Clase03_Tema2_Tokenizacion/revision/resultados_corpus.json")
                     .read_text(encoding="utf-8"))
    q = res["quijote"]
    tx = A.leer("quijote_completo")
    c = Counter(t.lower() for t in A.tok_reglas(tx) if A.es_palabra(t))
    frec = sorted(c.values(), reverse=True)
    rangos = sorted({int(round(10 ** (k / 20))) for k in range(0, 88)} | {len(frec)})
    curva = [[r, frec[r - 1]] for r in rangos if r <= len(frec)]

    # Familias para «raíz o lema»: la raíz la calcula la demo en el navegador (Snowball,
    # verificado contra NLTK); el lema es la forma de diccionario.
    familias = {
        "sobrerradicacion": [
            {"raiz": "cas", "formas": ["casa", "casas", "casar", "casado", "casaron"]},
            {"raiz": "sol", "formas": ["sol", "solo", "sola", "solía", "soler"]},
            {"raiz": "part", "formas": ["parte", "partes", "partido", "partir", "partió"]},
            {"raiz": "gener", "formas": ["generoso", "generación", "generosa"]},
            {"raiz": "univers", "formas": ["universidad", "universo"]},
        ],
        "infrarradicacion": [
            {"lema": "ser", "formas": ["ser", "es", "era", "fue", "sea", "soy"]},
            {"lema": "ir", "formas": ["ir", "voy", "va", "iba", "fui", "vaya"]},
            {"lema": "decir", "formas": ["decir", "digo", "dice", "dijo", "dirá"]},
            {"lema": "jugar", "formas": ["jugar", "jugaron", "jugado", "juego", "juegan"]},
            {"lema": "mujer", "formas": ["mujer", "mujeres"]},
        ],
    }
    datos = {
        "generado": time.strftime("%Y-%m-%d"),
        "versiones": {"nltk": __import__("nltk").__version__,
                      "spacy": __import__("spacy").__version__,
                      "modelo": "es_core_news_sm " + A.nlp().meta["version"]},
        "ejemplos": ejemplos,
        "stopwords_es": sorted(A.vacias()),
        "quijote": {"palabras": q["palabras"], "tipos": q["tipos"], "hapax": q["hapax"],
                    "top30": q["top30"], "porcentaje_vacias": q["porcentaje_ocurrencias_vacias"],
                    "curva": curva, "normalizacion": q["normalizacion"]},
        "familias": familias,
    }
    salida = RAIZ / "Demos" / "02_texto_como_dato_datos.js"
    salida.write_text("// Generado por Demos/fuentes/generar_datos_02.py; no editar a mano.\n"
                      "window.DATOS02 = " + json.dumps(datos, ensure_ascii=False) + ";\n",
                      encoding="utf-8")
    print(salida, salida.stat().st_size, "bytes;", len(ejemplos), "ejemplos")


if __name__ == "__main__":
    main()
