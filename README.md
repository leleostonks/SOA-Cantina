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

## Entregas

| Tag | Prazo | Entrega |
|---|---|---|
| `entrega-1` | seg 12/10 | O contrato primeiro: os três contratos, antes de qualquer código |
| `entrega-2` | seg 19/10 | Serviço autônomo: o Cardápio, com duas instâncias |
| `entrega-3` | seg 26/10 | Composição: o Pedidos, compondo o Cardápio |
| `entrega-4` | seg 2/11 | Evento: o Avisos e o canal de eventos |
| `entrega-5` | sex 6/11 | Entrega final: desenho final, README e matriz de princípios |

## Como rodar

_A preencher a partir da Entrega 2._

## Matriz de princípios

_A preencher na Entrega 5._
