"""Genera Demos/09_aplicaciones_haz.js: la búsqueda en haz (2 hipótesis) de MarianMT paso a paso, con las
candidatas que se descartan en cada paso, y el camino voraz, para dibujar el árbol en la demo (apartado 9.2).

Uso (desde la raíz): HF_HUB_OFFLINE=1 Temas/Tema09/entorno/.venv_t9/bin/python Demos/fuentes/generar_haz_09.py

Usa el mismo modelo y revisión que la Clase 16 (Helsinki-NLP/opus-mt-en-es, 5bc4493). La búsqueda se escribe a
mano para poder guardar cada paso: en cada paso se amplían las hipótesis vivas con sus 3 subpalabras más
probables, se ordenan por log-probabilidad acumulada y se conservan las 2 mejores; las que terminan en </s>
pasan a la lista de terminadas y la elegida es la de mayor log-probabilidad dividida por su longitud
(length_penalty = 1, como en transformers). Al final se compara con model.generate(num_beams = 2).
"""
import json
import math
from pathlib import Path

import torch
from transformers import MarianMTModel, MarianTokenizer

RAIZ = Path(__file__).resolve().parents[2]
MODELO, REV = "Helsinki-NLP/opus-mt-en-es", "5bc4493d463cf000c1f0b50f8d56886a392ed4ab"
FRASES = ["Don't beat around the bush.", "Inflation eased to 2.1% in September."]
B, K, MAXLEN = 2, 3, 30


def pieza(tok, i):
    return tok.convert_ids_to_tokens(int(i)).replace("▁", "␣") if int(i) != tok.eos_token_id else "</s>"


@torch.no_grad()
def siguiente(mod, enc, prefijo):
    dec = torch.tensor([prefijo])
    out = mod(**enc, decoder_input_ids=dec)
    return torch.log_softmax(out.logits[0, -1], -1)


@torch.no_grad()
def haz(mod, tok, frase):
    enc = tok(frase, return_tensors="pt")
    inicio = mod.config.decoder_start_token_id
    vivas = [([inicio], 0.0)]
    terminadas, pasos = [], []
    for t in range(MAXLEN):
        cands = []
        for k, (pref, s) in enumerate(vivas):
            lp = siguiente(mod, enc, pref)
            top = torch.topk(lp, K)
            for v, i in zip(top.values.tolist(), top.indices.tolist()):
                cands.append({"padre": k, "pieza": pieza(tok, i), "id": i, "logp": round(v, 4), "acumulada": round(s + v, 4)})
        cands.sort(key=lambda c: -c["acumulada"])
        nuevas, elegidas = [], 0
        for c in cands:
            if elegidas >= B:
                break
            c["elegida"] = True
            elegidas += 1
            pref = vivas[c["padre"]][0] + [c["id"]]
            if c["id"] == tok.eos_token_id:
                terminadas.append((pref, c["acumulada"]))
                c["termina"] = True
            else:
                nuevas.append((pref, c["acumulada"]))
        pasos.append({"vivas": [tok.decode(p[1:], skip_special_tokens=True) for p, _ in vivas], "candidatas": cands})
        vivas = nuevas
        if len(terminadas) >= B or not vivas:
            break
    final = [{"texto": tok.decode(p[1:], skip_special_tokens=True), "logp": round(s, 4), "longitud": len(p) - 1,
              "puntuacion": round(s / (len(p) - 1), 4)} for p, s in terminadas]
    final.sort(key=lambda f: -f["puntuacion"])
    g = mod.generate(**enc, num_beams=B, do_sample=False, max_new_tokens=60)
    gv = mod.generate(**enc, num_beams=1, do_sample=False, max_new_tokens=60)
    # camino voraz con probabilidades
    pref, voraz = [inicio], []
    for _ in range(MAXLEN):
        lp = siguiente(mod, enc, pref)
        i = int(lp.argmax())
        voraz.append({"pieza": pieza(tok, i), "p": round(math.exp(float(lp[i])), 4), "logp": round(float(lp[i]), 4)})
        pref.append(i)
        if i == tok.eos_token_id:
            break
    return {"en": frase, "pasos": pasos, "terminadas": final,
            "generate_haz": tok.decode(g[0], skip_special_tokens=True),
            "generate_voraz": tok.decode(gv[0], skip_special_tokens=True), "voraz": voraz,
            "logp_voraz": round(sum(v["logp"] for v in voraz), 4)}


def main():
    tok = MarianTokenizer.from_pretrained(MODELO, revision=REV)
    mod = MarianMTModel.from_pretrained(MODELO, revision=REV).eval()
    res = [haz(mod, tok, f) for f in FRASES]
    datos = {"modelo": MODELO, "revision": REV, "haz": B, "candidatas_por_hipotesis": K, "frases": res}
    salida = RAIZ / "Demos" / "09_aplicaciones_haz.js"
    salida.write_text("// Generado por Demos/fuentes/generar_haz_09.py; no editar a mano.\nwindow.HAZ09 = "
                      + json.dumps(datos, ensure_ascii=False) + ";\n", encoding="utf-8")
    for r in res:
        print(r["en"], "| haz a mano:", r["terminadas"][0]["texto"], "| generate:", r["generate_haz"],
              "| voraz:", r["generate_voraz"], "| pasos:", len(r["pasos"]))


if __name__ == "__main__":
    main()
