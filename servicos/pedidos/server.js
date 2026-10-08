// Serviço Pedidos da Cantina. Contrato: contratos/pedidos.yaml.
//
// Não sabe o preço de nada: para cada item, pergunta ao Cardápio pelo contrato
// (contratos/cardapio.yaml), no endereço de CARDAPIO_URL. Os pedidos ficam num
// arquivo que pertence só a este serviço.
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const PORTA = Number(process.env.PORTA || 8082);
const CARDAPIO_URL = (process.env.CARDAPIO_URL || "http://localhost:8081").replace(/\/+$/, "");
const TEMPO_LIMITE_MS = 1500; // o contrato promete 503 em no máximo 2 segundos
const ARQUIVO = path.join(__dirname, "dados", "pedidos.json");

// ---------- armazenamento próprio ----------
function lerPedidos() {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));
  } catch {
    return [];
  }
}

function salvarPedidos(pedidos) {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(pedidos, null, 2));
}

// ---------- erros do contrato ----------
class ErroContrato extends Error {
  constructor(status, codigo, mensagem, extra = {}) {
    super(mensagem);
    Object.assign(this, { status, codigo, extra });
  }
}

const enviarErro = (res, e) => {
  if (e.status === 503) res.set("Retry-After", "5");
  res.status(e.status).json({ codigo: e.codigo, mensagem: e.message, ...e.extra });
};

// ---------- consumo do Cardápio ----------
async function consultarItem(itemId) {
  let resposta;
  try {
    resposta = await fetch(`${CARDAPIO_URL}/itens/${itemId}`, {
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    throw new ErroContrato(503, "CARDAPIO_INDISPONIVEL", "O Cardápio não respondeu. Tente de novo em instantes.");
  }
  if (resposta.status === 404) {
    throw new ErroContrato(422, "ITEM_NAO_ENCONTRADO", `O item ${itemId} não existe no cardápio.`, { itemId });
  }
  if (!resposta.ok) {
    throw new ErroContrato(503, "CARDAPIO_INDISPONIVEL", "O Cardápio respondeu com erro. Tente de novo em instantes.");
  }
  const item = await resposta.json();
  if (!item.disponivel) {
    throw new ErroContrato(422, "ITEM_INDISPONIVEL", `O item ${itemId} (${item.nome}) está indisponível.`, { itemId });
  }
  return item;
}

function validarCorpo(corpo) {
  const invalido = (msg) => new ErroContrato(400, "REQUISICAO_INVALIDA", msg);
  if (!corpo || typeof corpo !== "object") throw invalido("O corpo precisa ser um objeto JSON.");
  if (typeof corpo.alunoId !== "string" || corpo.alunoId.trim() === "") {
    throw invalido("O campo alunoId é obrigatório.");
  }
  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    throw invalido("O campo itens é obrigatório e não pode ser vazio.");
  }
  for (const i of corpo.itens) {
    if (!Number.isInteger(i?.itemId) || i.itemId < 1) throw invalido("Cada item precisa de um itemId inteiro maior que zero.");
    if (!Number.isInteger(i?.quantidade) || i.quantidade < 1) throw invalido("Cada item precisa de uma quantidade inteira maior que zero.");
  }
}

// ---------- rotas ----------
const app = express();
app.use(express.json());

app.post("/pedidos", async (req, res) => {
  try {
    validarCorpo(req.body);
    const ids = [...new Set(req.body.itens.map((i) => i.itemId))];
    const doCardapio = new Map((await Promise.all(ids.map(consultarItem))).map((item) => [item.id, item]));

    const itens = req.body.itens.map(({ itemId, quantidade }) => {
      const { nome, precoCentavos } = doCardapio.get(itemId);
      return { itemId, nome, quantidade, precoUnitarioCentavos: precoCentavos, subtotalCentavos: precoCentavos * quantidade };
    });
    const pedidos = lerPedidos();
    const pedido = {
      id: pedidos.reduce((maior, p) => Math.max(maior, p.id), 0) + 1,
      alunoId: req.body.alunoId,
      status: "confirmado",
      itens,
      totalCentavos: itens.reduce((soma, i) => soma + i.subtotalCentavos, 0),
      criadoEm: new Date().toISOString(),
    };
    salvarPedidos([...pedidos, pedido]);

    res.status(201).location(`/pedidos/${pedido.id}`).json(pedido);
  } catch (e) {
    if (e instanceof ErroContrato) return enviarErro(res, e);
    throw e;
  }
});

app.get("/pedidos/:id", (req, res) => {
  const pedido = lerPedidos().find((p) => String(p.id) === req.params.id);
  if (!pedido) return enviarErro(res, new ErroContrato(404, "PEDIDO_NAO_ENCONTRADO", `Pedido ${req.params.id} não existe.`));
  res.json(pedido);
});

app.get("/saude", (req, res) => res.json({ status: "ok" }));

// JSON mal formado vira 400, como manda o contrato.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return enviarErro(res, new ErroContrato(400, "REQUISICAO_INVALIDA", "O corpo não é um JSON válido."));
  }
  next(err);
});

app.listen(PORTA, () => console.log(`Pedidos na porta ${PORTA}, Cardápio em ${CARDAPIO_URL}`));
