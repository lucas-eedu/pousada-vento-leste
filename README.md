# Pousada Vento Leste

Projeto da disciplina **N695 - Desenvolvimento de Plataformas Web** da Universidade de Fortaleza. O sistema cadastra os quartos da pousada e controla as reservas de cada um, impedindo conflitos de datas e reservas acima da capacidade do quarto.

**Funcionalidades:**

- **Quartos:** listar, cadastrar, editar e excluir. Número com 3 dígitos e sem repetição, capacidade de 1 a 4 hóspedes, diária positiva e descrição opcional. Um quarto com reservas não pode ser excluído, e a capacidade não pode ficar abaixo do número de hóspedes de uma reserva existente.
- **Reservas de um quarto:** listar, cadastrar, editar e excluir. Campos obrigatórios, saída posterior à entrada, hóspedes dentro da capacidade do quarto e nenhum período sobreposto no mesmo quarto.
- As regras são verificadas na interface, para orientar o usuário, e de forma definitiva na API, que devolve mensagens claras com o status HTTP adequado.

## O que é um monorepo?

É um único repositório com mais de uma aplicação. A pasta `apps/api` contém o servidor e o acesso ao PostgreSQL. A pasta `apps/web` contém a interface React. O `package.json` da raiz usa **npm workspaces** para instalar dependências e executar comandos das duas aplicações em conjunto. Assim, todos trabalham no mesmo GitHub, mas cada módulo tem uma responsabilidade clara.

Cada módulo da API separa as camadas: `*.routes.ts` trata HTTP, `*.validation.ts` valida a entrada, `*.service.ts` e `reservationAvailability.ts` aplicam as regras de negócio, e `*.repository.ts` acessa o banco.

```text
.
├── apps/
│   ├── api/src/
│   │   ├── app.ts                       # Servidor HTTP, CORS, healthcheck e roteamento
│   │   ├── server.ts                    # Conexão com o banco e inicialização
│   │   ├── database.ts                  # Tabelas e transações no PostgreSQL
│   │   ├── reservationAvailability.ts   # Regra de capacidade e de datas sem sobreposição
│   │   ├── rooms/                       # Rotas, validação, serviço, acesso a dados e Swagger dos quartos
│   │   ├── reservations/                # Rotas, validação e acesso a dados das reservas
│   │   └── utils/                       # Respostas JSON, leitura do corpo, IDs e erros do PostgreSQL
│   └── web/src/
│       ├── App.tsx                      # Navegação entre visão geral, quartos e reservas
│       ├── api.ts                       # Cliente HTTP da API e mensagens de erro
│       ├── rooms/                       # Lista, formulário, validação e chamadas de quartos
│       ├── reservations/                # Lista, formulário, validação e chamadas de reservas
│       └── styles.css                   # Estilos gerais
├── docker-compose.yml                   # API, interface, PostgreSQL e volume do banco
├── DIVISAO_DA_EQUIPE.md                 # Responsabilidades e evidências
└── package.json                         # Scripts compartilhados
```

## Como executar com Docker

**Pré-requisito:** Docker Engine com o plugin Compose ou Docker Desktop. Não é necessário instalar Node ou PostgreSQL na máquina.

1. Na raiz do projeto, execute `docker compose up --build`.
2. Abra **http://localhost:5173** no navegador.
3. A API responde em **http://localhost:3000/api/health**. Uma resposta `{"status":"ok"}` confirma que o servidor iniciou e conectou ao banco.
4. Para parar, pressione `Ctrl+C` e execute `docker compose down`.

O PostgreSQL usa o volume `postgres-data`, que continua disponível após `docker compose down`. **`docker compose down -v` apaga esse volume e todos os dados de teste.** O Compose também expõe o banco apenas em `127.0.0.1:5432` para ferramentas locais. A senha `pousada_dev` é apenas para desenvolvimento e não deve ser usada na publicação.

## Como executar a API e a interface fora do Docker

É necessário Node.js **24 ou superior** e npm. O PostgreSQL ainda precisa estar em execução, por exemplo com `docker compose up -d db`. Na raiz:

```bash
npm install
DATABASE_URL=postgres://pousada:pousada_dev@localhost:5432/pousada npm run dev
```

Abra http://localhost:5173. O Vite encaminha `/api` para `http://localhost:3000`. `Ctrl+C` encerra os processos Node; para parar o banco, execute `docker compose down`. Se as portas 3000, 5173 ou 5432 estiverem em uso, libere-as antes de iniciar.

## Comandos úteis

| Comando | Finalidade |
|---|---|
| `npm run dev` | Inicia API e interface em desenvolvimento |
| `npm run build` | Compila as duas aplicações |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `docker compose exec api npm test` | Executa todos os testes da API com o PostgreSQL do Compose |
| `npm run dev --workspace @pousada/api` | Inicia somente a API |
| `npm run dev --workspace @pousada/web` | Inicia somente a interface |

## Como a aplicação conversa

O navegador acessa o React na porta 5173. A interface faz requisições a URLs iniciadas por `/api`. Durante o desenvolvimento, o Vite encaminha essas requisições ao servidor Node na porta 3000. O servidor valida a entrada, executa as regras de negócio e consulta o PostgreSQL pela variável `DATABASE_URL`. As respostas são JSON; os erros têm status HTTP apropriado e uma mensagem compreensível para o usuário.

O endpoint `/api/health` confirma que a API está no ar. As rotas de quartos e reservas são:

| Método | Rota | Ação |
|---|---|---|
| `GET` | `/api/rooms` | Listar quartos |
| `POST` | `/api/rooms` | Cadastrar quarto |
| `PUT` | `/api/rooms/:id` | Atualizar quarto |
| `DELETE` | `/api/rooms/:id` | Excluir quarto |
| `GET` | `/api/rooms/:roomId/reservations` | Listar reservas de um quarto |
| `POST` | `/api/rooms/:roomId/reservations` | Criar reserva |
| `PUT` | `/api/reservations/:id` | Atualizar reserva |
| `DELETE` | `/api/reservations/:id` | Excluir reserva |

### Rotas de quartos

Implementadas em `apps/api/src/rooms/` e testadas em `rooms.test.ts`. Corpo de cadastro e edição (`description` é opcional):

```json
{ "number": "101", "capacity": 2, "daily_rate": 180.5, "description": "Quarto com varanda" }
```

| Situação | Status | Exemplo de `error` |
|---|---|---|
| Cadastro | 201 | — |
| Listagem, edição, exclusão | 200 | exclusão: `{ "message": "Quarto excluído com sucesso." }` |
| Campo ausente/inválido, ID inválido, JSON inválido | 400 | `A capacidade deve ser um número inteiro de 1 a 4 hóspedes.` |
| Quarto inexistente | 404 | `Quarto não encontrado.` |
| Número repetido | 409 | `Número de quarto já existe.` |
| Exclusão de quarto com reservas | 409 | `Não é possível excluir o quarto com reservas associadas.` |
| Capacidade menor que uma reserva existente | 409 | `Não é possível reduzir a capacidade para 1: há reserva com 2 hóspedes neste quarto.` |

### Banco de dados e regras

No banco, `rooms.id` identifica um quarto. `reservations.room_id` aponta para ele. A chave estrangeira impede reservas para quartos inexistentes e impede excluir um quarto com reservas. O PostgreSQL também exige capacidade, diária e número de hóspedes positivos e saída posterior à entrada. As regras de **hóspedes dentro da capacidade** e **datas sem sobreposição** são validadas no serviço antes de gravar. Para datas, use o formato ISO `AAAA-MM-DD`; intervalos podem encostar (`check_out` de uma reserva igual ao `check_in` de outra).

### Regra de disponibilidade para as rotas de reservas

O arquivo `apps/api/src/reservationAvailability.ts` oferece `withReservationAvailability(pool, input, save)`. Nas rotas de **criação e edição**, informe `roomId`, `guestCount`, `checkIn` e `checkOut`; na edição, informe também `excludeReservationId` com o ID da reserva editada. A função consulta a capacidade e os conflitos de datas, depois executa `save` na **mesma transação**. O callback `save` deve gravar usando o `client` recebido, nunca `pool.query`, para preservar essa garantia.

As rotas validam campos obrigatórios e a ordem das datas antes de chamar essa função. Trate `ReservationAvailabilityError` conforme o `code`: `ROOM_NOT_FOUND` → HTTP 404, `CAPACITY_EXCEEDED` → HTTP 422 e `DATE_CONFLICT` → HTTP 409. A propriedade `message` já contém uma explicação para o usuário. Os testes em `apps/api/src/reservationAvailability.test.ts` mostram chamadas de criação e edição. A edição de um quarto (`rooms.service.ts`) bloqueia o mesmo registro antes de conferir as reservas, por isso uma reserva nova e uma redução de capacidade não conseguem passar ao mesmo tempo.

### Rotas de reservas

Implementadas em `apps/api/src/reservations/` (rotas, validação e acesso ao banco) e testadas com PostgreSQL real em `reservations.test.ts`. O corpo de criação e edição é o mesmo; `notes` é opcional:

```json
{ "guest_name": "Maria Souza", "guest_count": 2, "check_in": "2026-12-10", "check_out": "2026-12-12", "notes": "Chegada após 22h" }
```

Respostas de sucesso devolvem a reserva com `id`, `room_id`, os campos acima e `created_at`. As datas sempre voltam como texto `AAAA-MM-DD`. A listagem vem ordenada pela data de entrada. Na edição, a reserva continua no mesmo quarto.

| Situação | Status | Exemplo de `error` |
|---|---|---|
| Criação | 201 | — |
| Listagem, edição, exclusão | 200 | exclusão: `{ "message": "Reserva excluída com sucesso." }` |
| Campo ausente/inválido, saída não posterior à entrada, ID inválido, JSON inválido | 400 | `A data de saída deve ser posterior à data de entrada.` |
| Quarto ou reserva inexistente | 404 | `Quarto não encontrado.` / `Reserva não encontrada.` |
| Período sobreposto no mesmo quarto | 409 | `Já existe uma reserva para esse quarto no período informado.` |
| Hóspedes acima da capacidade | 422 | `O número de hóspedes excede a capacidade do quarto.` |

```bash
curl -X POST http://localhost:3000/api/rooms/1/reservations \
  -H 'Content-Type: application/json' \
  -d '{"guest_name":"Maria Souza","guest_count":2,"check_in":"2026-12-10","check_out":"2026-12-12"}'
```

### Documentação interativa dos quartos — Swagger

As operações de gerenciamento de quartos estão documentadas no Swagger UI, permitindo visualizar os endpoints, consultar exemplos de requisições e respostas e executar testes diretamente pelo navegador.

**Swagger UI:** http://localhost:3000/api/rooms/docs

**Especificação OpenAPI:** http://localhost:3000/api/rooms/openapi.json

Para iniciar somente a API e o PostgreSQL:

```bash
docker compose up -d --build api
```

A documentação contempla as operações `GET`, `POST`, `PUT` e `DELETE` de quartos, incluindo campos de entrada, códigos HTTP e respostas esperadas.

## Publicação

Na publicação, a interface e a API ficam no **mesmo endereço**: o `Dockerfile` da raiz compila as duas aplicações e executa só a API, que também serve o build do React (`apps/web/dist`). Assim, as chamadas a `/api` funcionam sem o proxy do Vite e sem configurar CORS. Caminhos que não começam com `/api` devolvem a interface.

Na Railway:

1. Crie um serviço **PostgreSQL**.
2. Crie um serviço a partir deste repositório. O `railway.json` indica o `Dockerfile` e o healthcheck em `/api/health`.
3. No serviço da aplicação, defina `DATABASE_URL` com a referência à variável do PostgreSQL (`${{Postgres.DATABASE_URL}}`). A Railway define `PORT` sozinha.
4. Gere o domínio público em *Settings → Networking*.

As tabelas são criadas automaticamente quando a API inicia. Para testar a imagem localmente com o banco do Compose:

```bash
docker build -t pousada-prod .
docker run --rm -p 8080:8080 -e PORT=8080 \
  -e DATABASE_URL=postgres://pousada:pousada_dev@db:5432/pousada \
  --network n695-desenv-plataformas-web_default pousada-prod
```

Depois, abra http://localhost:8080.

## Como contribuir

1. Leia sua tarefa em [DIVISAO_DA_EQUIPE.md](DIVISAO_DA_EQUIPE.md) e confira o contrato acima.
2. Crie uma branch a partir da branch principal: `git switch -c feat/nome-da-tarefa`.
3. Faça alterações pequenas, execute `npm run typecheck`, `npm run build` e `docker compose exec api npm test` com os contêineres ligados.
4. Abra um pull request com resumo, como testar e capturas das telas ou requisições relevantes.
5. Combine mudanças nas rotas e no esquema do banco com quem trabalha no módulo dependente.

Não inclua `node_modules`, senhas de produção nem dados reais de hóspedes nos commits. Para a entrega, todos devem conseguir explicar o próprio código e apresentar as evidências descritas na divisão de tarefas.

## Entrega da disciplina

Além do código, a equipe deve publicar a aplicação e elaborar **um PDF de 8 a 20 páginas** na ordem do modelo do enunciado. O PDF terá capturas, exemplos de requisição e resposta e links para trechos do repositório, sem colar código. Cada integrante precisa constar na capa com nome completo e matrícula, estar alocado na equipe no AVA e enviar o PDF. O prazo é **27/11/2026**; apenas commits até essa data serão considerados. Repositório e aplicação devem ficar acessíveis até **10/12/2026**.
