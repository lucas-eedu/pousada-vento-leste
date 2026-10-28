# Divisão da equipe

Este arquivo organiza desenvolvimento e evidências para o trabalho da **Pousada Vento Leste**. Cada pessoa implementa sua parte, testa o fluxo completo e entrega material para o PDF. A divisão pode ser ajustada pela equipe, mas as regras obrigatórias do cenário não podem ser omitidas.

## Lucas Eduardo — base, integração e publicação

- Preparar e manter o monorepo, Docker Compose, PostgreSQL inicial, navegação e documentação de execução.
- Integrar os módulos de quartos e reservas; revisar contratos da API, estados de erro e consistência visual.
- Configurar a hospedagem da API e do React na Railway, com um serviço PostgreSQL e `DATABASE_URL`; conferir links públicos até 10/12.
- Documentar no PDF a visão geral, a arquitetura, a stack, a persistência, o fluxo de integração e a publicação. Fornecer captura da aplicação publicada e link do repositório.

## Ana Raquel — interface de quartos

- Criar listagem de quartos, formulário de cadastro e edição, confirmação de exclusão e mensagens de sucesso/erro.
- Exibir número, capacidade, valor da diária e descrição. Navegar da lista para as reservas do quarto escolhido.
- Validar campos obrigatórios e números positivos na interface, mantendo a validação definitiva na API.
- Documentar as telas e a navegação com capturas, links do código React e uma explicação breve de decisões de interface e acessibilidade.

## Oderlan — serviço de quartos

- Implementar as quatro rotas de quartos do contrato do README, com acesso ao PostgreSQL, validação de entrada e respostas HTTP claras.
- Impedir exclusão de quarto que possua reservas; tratar quarto inexistente e número de quarto repetido.
- Criar testes para cadastro, atualização, listagem, erros de validação e exclusão bloqueada.
- Documentar endpoints, exemplos de requisição/resposta, capturas de testes da API e links das rotas, validações e acesso a dados.

## João Melo — serviço de reservas

- Implementar as quatro operações de reservas e a listagem por quarto, preservando a relação com o quarto.
- Validar campos obrigatórios, saída posterior à entrada, quantidade de hóspedes até a capacidade e ausência de sobreposição de datas no mesmo quarto, inclusive na edição.
- Criar testes para casos válidos, quarto inexistente, lotação e conflitos de datas.
- Documentar as regras de negócio com exemplos de requisição/resposta, capturas dos erros e links do código e testes.

## Arrais — interface de reservas e consolidação das evidências

- Criar a lista de reservas de cada quarto, formulários de cadastro/edição, exclusão e mensagens de validação vindas da API.
- Mostrar datas, hóspede, quantidade de pessoas e quarto; permitir voltar aos quartos e identificar claramente a reserva em edição.
- Testar o fluxo no navegador, incluindo datas sobrepostas e capacidade excedida.
- Organizar as capturas e os links fornecidos por todos no PDF de entrega, respeitando os 13 tópicos do modelo; redigir com a equipe as considerações finais, dificuldades e aprendizados.

## Acordos de integração

- Ana e Oderlan combinam os campos e mensagens do módulo de quartos. Arrais e João fazem o mesmo para reservas.
- Oderlan e João alinham as rotas no mesmo servidor e a forma de acessar o banco, evitando modificar a mesma área sem combinar.
- Cada pessoa abre um pull request com descrição, comandos executados e evidências. Lucas revisa a integração; outra pessoa revisa as mudanças de Lucas.
- Todos revisam o PDF final e confirmam **nome completo e matrícula** na capa, participação no AVA e envio individual até 27/11/2026. Como só temos nomes abreviados de alguns integrantes, a equipe precisa conferir os nomes completos antes de fechar a capa.
