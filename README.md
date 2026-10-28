# Pousada Vento Leste

Projeto da disciplina **N695 - Desenvolvimento de Plataformas Web** da Universidade de Fortaleza. O sistema apoiará o cadastro dos oito quartos da pousada e o controle das reservas, evitando conflitos de datas e reservas acima da capacidade de cada quarto.

> **Estado atual:** base do projeto. A navegação, a conexão entre interface e API, o banco e as tabelas estão preparados. As operações de cadastro, edição, listagem e exclusão serão desenvolvidas pela equipe conforme [DIVISAO_DA_EQUIPE.md](DIVISAO_DA_EQUIPE.md). As telas marcadas como “Em construção” ainda não representam funcionalidades prontas.

## O que é um monorepo?

É um único repositório com mais de uma aplicação. A pasta `apps/api` contém o servidor e o acesso ao PostgreSQL. A pasta `apps/web` contém a interface React. O `package.json` da raiz usa **npm workspaces** para instalar dependências e executar comandos das duas aplicações em conjunto. Assim, todos trabalham no mesmo GitHub, mas cada módulo tem uma responsabilidade clara.

```text
.
├── apps/
│   ├── api/
│   │   ├── src/app.ts          # Rotas HTTP e respostas JSON
│   │   ├── src/database.ts     # Estrutura das tabelas no PostgreSQL
│   │   └── src/server.ts       # Inicialização do servidor
│   └── web/
│       ├── src/App.tsx         # Navegação e áreas da interface
│       ├── src/styles.css      # Estilos visuais
│       └── vite.config.ts      # Servidor de desenvolvimento e proxy da API
├── docker-compose.yml         # API, interface, PostgreSQL e volume do banco
├── DIVISAO_DA_EQUIPE.md       # Responsabilidades e evidências
└── package.json               # Scripts compartilhados
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
| `docker compose exec api npm test` | Executa os testes da API com o PostgreSQL do Compose |
| `npm run dev --workspace @pousada/api` | Inicia somente a API |
| `npm run dev --workspace @pousada/web` | Inicia somente a interface |

## Como a aplicação conversa

O navegador acessa o React na porta 5173. A interface faz requisições a URLs iniciadas por `/api`. Durante o desenvolvimento, o Vite encaminha essas requisições ao servidor Node na porta 3000. O servidor valida a entrada, executa as regras de negócio e consulta o PostgreSQL pela variável `DATABASE_URL`. As respostas são JSON; os erros devem ter status HTTP apropriado e uma mensagem compreensível para o usuário.

O endpoint `/api/health` já funciona. As futuras rotas de quartos e reservas devem seguir este contrato:

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

No banco, `rooms.id` identifica um quarto. `reservations.room_id` aponta para ele. A chave estrangeira impede reservas para quartos inexistentes e impede excluir um quarto com reservas. O PostgreSQL também exige capacidade, diária e número de hóspedes positivos e saída posterior à entrada. As regras de **hóspedes dentro da capacidade** e **datas sem sobreposição** devem ser validadas no serviço antes de gravar. Para datas, use o formato ISO `AAAA-MM-DD`; intervalos podem encostar (`check_out` de uma reserva igual ao `check_in` de outra).

## Como contribuir

1. Leia sua tarefa em [DIVISAO_DA_EQUIPE.md](DIVISAO_DA_EQUIPE.md) e confira o contrato acima.
2. Crie uma branch a partir da branch principal: `git switch -c feat/nome-da-tarefa`.
3. Faça alterações pequenas, execute `npm run typecheck`, `npm run build` e `docker compose exec api npm test` com os contêineres ligados.
4. Abra um pull request com resumo, como testar e capturas das telas ou requisições relevantes.
5. Combine mudanças nas rotas e no esquema do banco com quem trabalha no módulo dependente.

Não inclua `node_modules`, senhas de produção nem dados reais de hóspedes nos commits. Para a entrega, todos devem conseguir explicar o próprio código e apresentar as evidências descritas na divisão de tarefas.

## Entrega da disciplina

Além do código, a equipe deve publicar a aplicação e elaborar **um PDF de 8 a 20 páginas** na ordem do modelo do enunciado. O PDF terá capturas, exemplos de requisição e resposta e links para trechos do repositório, sem colar código. Cada integrante precisa constar na capa com nome completo e matrícula, estar alocado na equipe no AVA e enviar o PDF. O prazo é **27/11/2026**; apenas commits até essa data serão considerados. Repositório e aplicação devem ficar acessíveis até **10/12/2026**.
