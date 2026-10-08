# SOA-Cantina

Sistema de pedidos da cantina do câmpus: o aluno pede pelo celular e é avisado quando o pedido é confirmado. São três serviços pequenos, ligados por contrato.

- **Cardápio**: informa o que há para vender.
- **Pedidos**: registra a compra consultando o Cardápio.
- **Avisos**: reage quando um pedido é confirmado.

## Grupo

| Integrante | RM |
|---|---|
| Arnaldo | 555780 |
| Carlos Eduardo | 99849 |
| Fabricio Carlos | 555017 |
| Leonardo Correia | 550413 |
| Vinicius Gardim | 556013 |

## Linguagens escolhidas

Cada serviço usa uma linguagem diferente. Quem garante que eles se entendam é o contrato em `contratos/`.

| Serviço | Linguagem | Framework |
|---|---|---|
| Cardápio | Python | FastAPI |
| Pedidos | JavaScript (Node.js) | Express |
| Avisos | Go | biblioteca padrão (`net/http`) |

## Ambiente

- GitHub Codespaces (recomendado) ou máquina local com a linguagem de cada serviço, Git e curl.
- Chamadas HTTP com `curl` (no PowerShell, use `curl.exe`).
- Desenho da arquitetura: _a definir_ (fonte e imagem em `arquitetura/`).

## Estrutura do repositório

```
├── contratos/       os contratos, antes do código
├── servicos/
│   ├── cardapio/
│   ├── pedidos/
│   └── avisos/
├── arquitetura/     fonte e imagem do desenho
├── evidencias/      saídas dos testes de cada missão
└── README.md        como rodar + matriz de princípios
```

## Contratos

| Arquivo | Serviço | Formato |
|---|---|---|
| [`contratos/cardapio.yaml`](contratos/cardapio.yaml) | Cardápio (portas 8081 e 8091) | OpenAPI 3.0 |
| [`contratos/pedidos.yaml`](contratos/pedidos.yaml) | Pedidos (porta 8082) | OpenAPI 3.0 |
| [`contratos/pedido-confirmado.json`](contratos/pedido-confirmado.json) | Evento `cantina.pedido.confirmado` | JSON Schema do envelope CloudEvents 1.0 |

Preços sempre em centavos (inteiros). Se o código e o contrato discordarem, o código está errado.

## Entregas

| Tag | Prazo | Entrega |
|---|---|---|
| `entrega-1` | seg 12/10 | O contrato primeiro: os três contratos, antes de qualquer código |
| `entrega-2` | seg 19/10 | Serviço autônomo: o Cardápio, com duas instâncias |
| `entrega-3` | seg 26/10 | Composição: o Pedidos, compondo o Cardápio |
| `entrega-4` | seg 2/11 | Evento: o Avisos e o canal de eventos |
| `entrega-5` | sex 6/11 | Entrega final: desenho final, README e matriz de princípios |

## Como rodar

### Cardápio (Python 3.10+)

```bash
cd servicos/cardapio
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
PORTA=8081 python app.py &         # instância 1
PORTA=8091 python app.py &         # instância 2
curl localhost:8081/itens
```

No PowerShell, a variável vai antes: `$env:PORTA=8081; python app.py`.

### Pedidos (Node.js 18+)

```bash
cd servicos/pedidos
npm install
PORTA=8082 CARDAPIO_URL=http://localhost:8081 node server.js &
curl -X POST localhost:8082/pedidos -H "Content-Type: application/json" \
  -d '{"alunoId":"RM550413","itens":[{"itemId":1,"quantidade":2},{"itemId":2,"quantidade":1}]}'
```

Os pedidos ficam em `servicos/pedidos/dados/pedidos.json`, que pertence só ao Pedidos e não vai para o Git.

Para publicar o evento de pedido confirmado, acrescente `ASSINANTES` com os endereços separados por vírgula:

```bash
PORTA=8082 CARDAPIO_URL=http://localhost:8081 \
ASSINANTES=http://localhost:8083/eventos node server.js &
```

### Avisos (Go 1.22+)

```bash
cd servicos/avisos
PORTA=8083 NOME=avisos-1 go run . &
curl localhost:8083/avisos          # avisos já enviados
```

Um segundo consumidor é só mais uma instância (`PORTA=8093 NOME=avisos-2 go run .`) e mais um endereço em `ASSINANTES`.

## Canal de eventos: Trilha A

O grupo escolheu a **Trilha A**: o Pedidos faz `POST` do evento, no envelope CloudEvents, em cada endereço de `ASSINANTES`.

**Por quê:** não pede nenhum servidor a mais, roda igual no Codespaces e no Windows, e o contrato do evento é o mesmo que seria publicado num broker. Passar para a Trilha B muda só o canal, não a mensagem.

**Como o pedido sobrevive à queda do Avisos:** o Pedidos responde `201` sem esperar o consumidor. Se a entrega falha, o evento fica em `dados/eventos-pendentes.json` e é reenviado a cada 5 segundos até chegar. O Avisos ignora eventos repetidos pelo `id`.

**O que a Trilha A não resolve:** o Pedidos ainda guarda a lista de assinantes (na configuração, não no código). Num broker, o consumidor assina sozinho e o Pedidos nem fica sabendo.

## Prova de fogo (Missão 3)

| Grupo | Linguagem do Cardápio deles | `CARDAPIO_URL` | Resultado |
|---|---|---|---|
| _a fazer na aula de 19/10_ | | | |

Antes da aula, o grupo trocou o `CARDAPIO_URL` para a segunda instância (8091), sem alterar o código, e o pedido saiu igual (teste 8 de `evidencias/missao3.txt`).

## Matriz de princípios

_A preencher na Entrega 5._
