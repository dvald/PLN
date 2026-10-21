"""Genera Demos/03_extraccion_informacion_datos.js con resultados reales precalculados.

Uso (desde la raíz): entorno/.venv_pln/bin/python Demos/fuentes/generar_datos_03.py

En el navegador (Demos/03_extraccion_informacion_lib.js) se calculan el chunking con reglas,
las etiquetas BIO/BIOES, las entidades clínicas con reglas, las relaciones con patrones y el
etiquetador de reglas morfológicas. Lo que exige Python (spaCy 3.8.16 con es_core_news_sm
3.8.0 y los etiquetadores de n-gramas de NLTK 3.10.3 entrenados con CESS-ESP) se guarda aquí.
También se guarda la referencia de Python con la que Demos/fuentes/probar_lib_03.js comprueba
que la librería JavaScript da los mismos resultados.
"""
import json
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CLASE = RAIZ / "Clases" / "Clase04_Tema3_Stemming_Extraccion"
sys.path.insert(0, str(CLASE))
import analisis_t3 as A  # noqa: E402

FRASES = [
    ("Ejemplo de extracción", "Frodo es miembro de la Comunidad del Anillo."),
    ("Noticia ficticia", A.leer("noticia").splitlines()[0]),
    ("Biografías", A.leer("biografias").strip()),
    ("Grupos nominales", "El viajero intrépido francés comió un postre delicioso."),
    ("«He» no es un pronombre", "He comido un postre delicioso."),
    ("Ambigüedad de «planta»", "Juan planta una planta tropical."),
    ("Ambigüedad de «fui»", "Fui al médico y fui feliz."),
    ("Notas clínicas", A.leer("notas_clinicas").strip()),
]

AMBIGUAS = [  # (frase, palabra, opciones, categoría correcta según la gramática, explicación)
    ("Juan planta una planta tropical.", 1, ["VERB", "NOUN"], "VERB", "Primera «planta»: verbo (Juan planta…)."),
    ("Juan planta una planta tropical.", 3, ["VERB", "NOUN"], "NOUN", "Segunda «planta»: sustantivo (una planta)."),
    ("Bajo la mesa hay un gato bajo y gordo.", 0, ["ADP", "ADJ", "VERB"], "ADP", "«Bajo la mesa»: preposición."),
    ("Bajo la mesa hay un gato bajo y gordo.", 6, ["ADP", "ADJ", "VERB"], "ADJ", "«un gato bajo»: adjetivo."),
    ("El vino llegó tarde y vino con su hermana.", 1, ["NOUN", "VERB"], "NOUN", "«El vino»: sustantivo."),
    ("El vino llegó tarde y vino con su hermana.", 5, ["NOUN", "VERB"], "VERB", "«y vino con…»: verbo venir."),
    ("Como pan cuando tengo hambre.", 0, ["VERB", "SCONJ", "ADV"], "VERB", "«Como pan»: verbo comer."),
    ("Lo hice como me dijiste.", 2, ["VERB", "SCONJ", "ADV"], "SCONJ", "«como me dijiste»: subordinante de modo (UD lo trata como SCONJ)."),
]


PARES_EJEMPLO = [  # (forma, frase en la que se lematiza, lema de referencia)
    ("casa", "La casa es grande.", "casa"), ("casas", "Hay casas nuevas.", "casa"),
    ("casar", "Se van a casar.", "casar"), ("casado", "Se ha casado.", "casar"),
    ("casaron", "Se casaron ayer.", "casar"), ("juego", "Yo juego al tenis.", "jugar"),
    ("jugaron", "Ellos jugaron bien.", "jugar"), ("juegos", "Los juegos de mesa.", "juego"),
    ("dijo", "Ella lo dijo.", "decir"), ("decir", "No hay nada que decir.", "decir"),
    ("dice", "Él dice la verdad.", "decir"),
]


def analizar(texto, modelo, tagger):
    doc = modelo(texto)
    toks = [{"t": t.text, "ws": t.whitespace_, "pos": t.pos_, "lem": t.lemma_, "dep": t.dep_,
             "h": t.head.i, "sent": 1 if t.is_sent_start else 0} for t in doc]
    palabras = [t.text for t in doc if not t.is_space]
    eagles = tagger.tag(palabras)
    return {
        "texto": texto, "tokens": toks,
        "ents": [[e.start, e.end, e.label_] for e in doc.ents],
        "noun_chunks": [[c.start, c.end] for c in doc.noun_chunks],
        "eagles": [tag for _, tag in eagles],
        "py_chunks": {"ingles": A.chunks_regla(doc, A.REGLA_INGLES)[0],
                      "espanol": A.chunks_regla(doc, A.REGLA_ESPANOL)[0],
                      "iob_espanol": [x[2] for x in A.chunks_regla(doc, A.REGLA_ESPANOL)[1]]},
        "py_relaciones": [list(r) for s in doc.sents for r in A.relaciones(s.as_doc())],
        "py_clinicas": [[e["texto"], e["tipo"], e["negado"]]
                        for e in A.entidades_clinicas(texto)],
    }


def main():
    modelo = A.nlp()
    et, taggers = A.etiquetadores_cess()
    tagger = taggers["bigramas_unigramas_reglas"]
    res = json.loads((CLASE / "revision" / "resultados_t3.json").read_text(encoding="utf-8"))
    ejemplos = [{"id": f"e{i}", "titulo": tit, **analizar(tx, modelo, tagger)}
                for i, (tit, tx) in enumerate(FRASES)]
    ambiguas = []
    for frase, idx, opciones, correcta, expl in AMBIGUAS:
        doc = modelo(frase)
        ambiguas.append({"frase": frase, "i": idx, "palabra": doc[idx].text, "opciones": opciones,
                         "correcta": correcta, "spacy": doc[idx].pos_, "lema": doc[idx].lemma_,
                         "tokens": [t.text for t in doc], "explicacion": expl})
    pares = []
    for forma, frase, gold in PARES_EJEMPLO:
        tok = next(t for t in modelo(frase) if t.text == forma)
        pares.append({"forma": forma, "frase": frase, "gold": gold, "spacy": tok.lemma_.lower(),
                      "raiz_nltk": A.stemmer().stem(forma)})
    # referencia del etiquetador de reglas para la prueba en Node (vocabulario de CESS-ESP)
    from nltk import RegexpTagger
    rx = RegexpTagger(A.REGLAS_ES)
    vocab = sorted({w for f in A.cess_con_lemas() for w, _, _ in f})[:6000]
    datos = {
        "generado": time.strftime("%Y-%m-%d"),
        "versiones": {"nltk": __import__("nltk").__version__,
                      "spacy": __import__("spacy").__version__,
                      "modelo": "es_core_news_sm " + modelo.meta["version"]},
        "ejemplos": ejemplos, "ambiguas": ambiguas, "pares_ejemplo": pares,
        "reglas_es": A.REGLAS_ES, "regla_ingles": A.REGLA_INGLES, "regla_espanol": A.REGLA_ESPANOL,
        "glosario": {k: list(v) for k, v in A.GLOSARIO_CLINICO.items()},
        "negadores": A.NEGADORES,
        "patrones": [list(p) for p in A.PATRONES_RELACION],
        "etiquetadores": et["exactitud"] | {"tokens_prueba": et["tokens_prueba"]},
        "ner_conll": res["ner_conll"], "ner_declarado": res["modelo_declarado"]["ents_f"],
        "cess": {k: res["cess"]["comparacion"][k] for k in
                 ("exactitud_lema_spacy", "pares_snowball", "pares_spacy", "tokens_evaluados")}
                | {"busqueda": res["cess"]["busqueda_macro"]},
        "fuera_de_dominio": res["fuera_de_dominio"]["por_documento"],
    }
    salida = RAIZ / "Demos" / "03_extraccion_informacion_datos.js"
    salida.write_text("// Generado por Demos/fuentes/generar_datos_03.py; no editar a mano.\n"
                      "window.DATOS03 = " + json.dumps(datos, ensure_ascii=False) + ";\n",
                      encoding="utf-8")
    ref = {"regexp_tagger": {w: rx.tag([w])[0][1] for w in vocab}}
    (RAIZ / "Demos" / "fuentes" / "referencia_python_03.json").write_text(
        json.dumps(ref, ensure_ascii=False), encoding="utf-8")
    print(salida, salida.stat().st_size, "bytes;", len(ejemplos), "ejemplos")


if __name__ == "__main__":
    main()
