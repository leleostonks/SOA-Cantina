"""Serviço Cardápio da Cantina. Contrato: contratos/cardapio.yaml.

Não guarda nada sobre quem chamou: cada requisição traz tudo o que precisa,
e qualquer instância responde igual. Os dados pertencem só a este serviço
(dados.json, ao lado deste arquivo).
"""
import json
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

PORTA = int(os.environ.get("PORTA", "8081"))
DADOS = Path(__file__).with_name("dados.json")

app = FastAPI(title="Cardápio da Cantina", version="1.0.0")


def carregar_itens():
    return json.loads(DADOS.read_text(encoding="utf-8"))


def erro(status, codigo, mensagem):
    return JSONResponse(status_code=status, content={"codigo": codigo, "mensagem": mensagem})


@app.middleware("http")
async def identifica_instancia(request: Request, call_next):
    # Não faz parte do contrato: só mostra qual instância respondeu.
    resposta = await call_next(request)
    resposta.headers["X-Instancia"] = f"cardapio:{PORTA}"
    return resposta


@app.get("/itens")
def listar_itens():
    return carregar_itens()


@app.get("/itens/{id}")
def buscar_item(id: str):
    for item in carregar_itens():
        if str(item["id"]) == id:
            return item
    return erro(404, "ITEM_NAO_ENCONTRADO", f"Item {id} não existe no cardápio.")


@app.get("/saude")
def saude():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORTA)
