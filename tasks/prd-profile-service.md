# PRD: Profile Service

## Introduction

O Profile Service é um microsserviço responsável por armazenar e gerenciar o perfil dos usuários da plataforma FindMyParty. Cada perfil representa diretamente um usuário (o ID do perfil é o mesmo ID do usuário autenticado) e contém informações relevantes para partidas de RPG, como experiência, preferências de jogo (DM/Player), disponibilidade remota e última localização geográfica.

O serviço expõe uma API HTTP REST, publica eventos no RabbitMQ a cada criação ou atualização, e mantém seu próprio banco de dados PostgreSQL — seguindo os princípios de microsserviços (database-per-service, eventual consistency via eventos).

A implementação deve usar como base o **skeleton-service** localizado em `C:\Users\gabri\Codigo\FindMyParty\skeleton-service`, que estabelece a arquitetura hexagonal padrão do ecossistema FindMyParty (Fastify, Kysely, amqplib, Zod, Pino, OpenTelemetry).

---

## Goals

- Permitir criação e atualização de perfis de usuário via API REST
- Persistir dados de perfil em banco PostgreSQL próprio, gerenciado via migrations
- Publicar eventos no RabbitMQ (`profile.created`, `profile.updated`) com o estado completo do perfil após cada mutação
- Prover um repositório com contexto documentado (CLAUDE.md, README, ADRs) para facilitar onboarding e desenvolvimento futuro

---

## User Stories

### US-001: Scaffold do serviço em TypeScript
**Description:** As a developer, I want to scaffold the Profile Service in TypeScript based on the skeleton-service structure so I have a working typed base with all infra wired up.

**Acceptance Criteria:**
- [ ] Estrutura de pastas espelha o skeleton-service com arquivos `.ts` em vez de `.js`
- [ ] `package.json` com `name: "profile-service"`, dependências do skeleton + `typescript`, `tsx`, `@types/node`, `@types/pg`, `@types/amqplib`
- [ ] `tsconfig.json` com `strict: true`, `module: NodeNext`, `moduleResolution: NodeNext`, `outDir: dist`
- [ ] Scripts: `dev` usa `tsx watch`, `build` usa `tsc`, `start` executa `dist/main.js`
- [ ] `src/main.ts` inicializa telemetria, conecta Postgres, roda migrations, conecta RabbitMQ e sobe servidor Fastify
- [ ] `npm run dev` sobe sem erros com variáveis de ambiente válidas
- [ ] `.env.example` com todas as variáveis necessárias
- [ ] `tsc --noEmit` passa sem erros

---

### US-002: Migration de criação da tabela `profiles`
**Description:** As a developer, I want a migration that creates the `profiles` table so the schema is version-controlled and reproducible.

**Acceptance Criteria:**
- [ ] Arquivo `src/adapters/outbound/db/migrations/001_create_profiles_table.js` com funções `up` e `down`
- [ ] A função `up` cria a tabela `profiles` com as colunas definidas em FR-1
- [ ] A função `down` remove a tabela `profiles`
- [ ] Migration executa sem erro em um banco PostgreSQL limpo
- [ ] Migration é idempotente (rodar duas vezes não quebra)

---

### US-003: Entidade de domínio `Profile`
**Description:** As a developer, I want a domain entity `Profile` that encapsulates all profile data and validation rules so business logic stays in the domain layer.

**Acceptance Criteria:**
- [ ] Arquivo `src/domain/entities/profile.js` com classe `Profile`
- [ ] Campos: `id`, `name`, `birthday`, `description`, `latitude`, `longitude`, `lastLogin`, `isDM`, `isPlayer`, `isActive`, `isRemote`, `experience`, `createdAt`, `updatedAt`
- [ ] `experience` aceita apenas os valores: `"beginner"`, `"intermediate"`, `"veteran"`
- [ ] Método estático `Profile.create(data)` valida com Zod e gera `id` via `crypto.randomUUID()`
- [ ] Método estático `Profile.fromPersistence(row)` reconstrói a entidade a partir de uma linha do banco
- [ ] Método `profile.update(data)` aplica atualização parcial e atualiza `updatedAt`
- [ ] Método `profile.toJSON()` retorna objeto simples serializável
- [ ] Typecheck (Zod) rejeita dados inválidos com mensagem descritiva

---

### US-004: Repositório PostgreSQL de Profile
**Description:** As a developer, I want a PostgreSQL repository implementation so profiles are persisted and retrieved correctly.

**Acceptance Criteria:**
- [ ] Arquivo `src/adapters/outbound/db/postgres-profile.repository.js`
- [ ] Método `save(profile)` insere no banco e retorna entidade reconstruída
- [ ] Método `findById(id)` retorna `Profile` ou `null`
- [ ] Método `update(profile)` atualiza linha existente e retorna entidade atualizada
- [ ] Colunas `snake_case` no banco mapeadas para `camelCase` na entidade via método `#toEntity(row)`
- [ ] Queries usam Kysely (sem SQL raw fora deste arquivo)

---

### US-005: Use Case de Profile
**Description:** As a developer, I want a use case layer that orchestrates creation and update of profiles and publishes events so business rules are enforced consistently.

**Acceptance Criteria:**
- [ ] Arquivo `src/domain/use-cases/profile.use-case.js` com classe `ProfileUseCase`
- [ ] Método `createProfile(data)`: cria entidade, persiste, publica evento `profile.profile.created` com estado completo, retorna profile
- [ ] Método `updateProfile(id, data)`: busca profile (lança `NotFoundError` se não existir), aplica update, persiste, publica evento `profile.profile.updated` com estado completo, retorna profile
- [ ] Método `getProfileById(id)`: busca e retorna profile (lança `NotFoundError` se não existir)
- [ ] Eventos seguem o padrão de routing key `[service].[entity].[action]` do skeleton

---

### US-006: Application Service de Profile
**Description:** As a developer, I want an application service that wraps the use case and converts domain entities to DTOs so routes don't depend on domain internals.

**Acceptance Criteria:**
- [ ] Arquivo `src/application/services/profile.service.js` com classe `ProfileService`
- [ ] Métodos `createProfile(data)`, `updateProfile(id, data)`, `getProfileById(id)` delegam ao use case e chamam `.toJSON()` no resultado

---

### US-007: Endpoint POST /profiles — Criar perfil
**Description:** As a client, I want to call `POST /profiles` to create a new profile so I can register user data.

**Acceptance Criteria:**
- [ ] Rota `POST /profiles` registrada em `src/adapters/inbound/http/routes/profile.routes.js`
- [ ] Body obrigatório: `id` (UUID — é o ID do usuário autenticado), `name` (string 1–255)
- [ ] Body opcional: `birthday` (ISO date), `description` (text max 1000), `latitude` (float), `longitude` (float), `isDM` (bool), `isPlayer` (bool), `isRemote` (bool), `experience` (enum: beginner/intermediate/veteran)
- [ ] Retorna `201 Created` com `{ data: Profile }`
- [ ] Retorna `400 Bad Request` com mensagem de erro se validação falhar
- [ ] Retorna `409 Conflict` se já existir um profile com o mesmo `id`
- [ ] Schema OpenAPI documentado via `@fastify/swagger`

---

### US-008: Endpoint PUT /profiles/:id — Atualizar perfil
**Description:** As a client, I want to call `PUT /profiles/:id` to update an existing profile so I can keep user data current.

**Acceptance Criteria:**
- [ ] Rota `PUT /profiles/:id` registrada em `profile.routes.js`
- [ ] Todos os campos do body são opcionais (atualização parcial)
- [ ] Campos atualizáveis: `name`, `birthday`, `description`, `latitude`, `longitude`, `isDM`, `isPlayer`, `isActive`, `isRemote`, `experience`
- [ ] Retorna `200 OK` com `{ data: Profile }`
- [ ] Retorna `404 Not Found` se o profile não existir
- [ ] Retorna `400 Bad Request` se validação falhar
- [ ] Schema OpenAPI documentado

---

### US-009: Endpoint GET /profiles/:id — Buscar perfil
**Description:** As a client, I want to call `GET /profiles/:id` to retrieve a profile so I can display user information.

**Acceptance Criteria:**
- [ ] Rota `GET /profiles/:id` registrada em `profile.routes.js`
- [ ] Retorna `200 OK` com `{ data: Profile }`
- [ ] Retorna `404 Not Found` se o profile não existir
- [ ] Schema OpenAPI documentado

---

### US-010: Publicação de eventos no RabbitMQ
**Description:** As a downstream service, I want to receive RabbitMQ events whenever a profile is created or updated so I can react to state changes.

**Acceptance Criteria:**
- [ ] Exchange `profile.events` do tipo `topic` é asserted na inicialização
- [ ] Evento `profile.profile.created` publicado após criação com payload = `profile.toJSON()`
- [ ] Evento `profile.profile.updated` publicado após atualização com payload = `profile.toJSON()`
- [ ] Mensagens persistentes (`{ persistent: true }`)
- [ ] Publisher usa confirm channel (aguarda ack do broker antes de resolver a Promise)

---

### US-011: Arquivos de contexto e documentação
**Description:** As a developer joining the project, I want context documentation files so I can understand the service's architecture, decisions, and how to run it.

**Acceptance Criteria:**
- [ ] `README.md` com: descrição do serviço, pré-requisitos, como rodar localmente, variáveis de ambiente, endpoints principais
- [ ] `CLAUDE.md` com: arquitetura hexagonal, decisões técnicas, padrões de código, como estender o serviço (ex: adicionar nova entidade)
- [ ] `docs/adr/001-hexagonal-architecture.md` explicando a escolha da arquitetura hexagonal
- [ ] `docs/adr/002-database-per-service.md` explicando o padrão database-per-service
- [ ] `docs/adr/003-event-publishing.md` explicando a decisão de publicar eventos a cada mutação

---

## Functional Requirements

- **FR-1:** A tabela `profiles` deve ter as seguintes colunas:
  - `id` UUID — chave primária (mesmo ID do usuário autenticado)
  - `name` VARCHAR(255) NOT NULL
  - `birthday` DATE (nullable)
  - `description` TEXT (nullable)
  - `latitude` DECIMAL(10,8) (nullable)
  - `longitude` DECIMAL(11,8) (nullable)
  - `last_login` TIMESTAMPTZ (nullable)
  - `is_dm` BOOLEAN NOT NULL DEFAULT false
  - `is_player` BOOLEAN NOT NULL DEFAULT true
  - `is_active` BOOLEAN NOT NULL DEFAULT true
  - `is_remote` BOOLEAN NOT NULL DEFAULT false
  - `experience` VARCHAR(20) NOT NULL DEFAULT 'beginner' — valores válidos: `beginner`, `intermediate`, `veteran`
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

- **FR-2:** `POST /profiles` aceita `id` no body (o ID é fornecido pelo caller, não gerado pelo serviço) para permitir que o ID do perfil seja o mesmo do usuário autenticado.

- **FR-3:** Toda mutação (create, update) deve publicar um evento no RabbitMQ com o estado completo do perfil após a operação.

- **FR-4:** O routing key dos eventos segue o padrão `profile.profile.[action]` (ex: `profile.profile.created`, `profile.profile.updated`).

- **FR-5:** O exchange RabbitMQ é do tipo `topic` e tem nome `profile.events`.

- **FR-6:** Migrations são executadas automaticamente na inicialização do serviço, antes de aceitar tráfego.

- **FR-7:** O serviço expõe health check em `GET /health` com verificação de conectividade com Postgres e RabbitMQ.

- **FR-8:** O serviço expõe documentação OpenAPI em `/docs` via `@fastify/swagger-ui`.

- **FR-9:** Validação de entrada usa Zod nas rotas; erros de validação resultam em `400 Bad Request` com mensagem legível.

- **FR-10:** `last_login` não é atualizado via API REST — é gerenciado por evento externo (subscriber) ou atualização direta futura. O campo existe na tabela mas não é campo de input nos endpoints.

---

## Non-Goals (Out of Scope)

- Autenticação/autorização (o serviço confia no ID fornecido pelo caller via body/JWT — enforcement é responsabilidade do API Gateway)
- Listagem/busca de profiles com filtros (fora do escopo inicial)
- Soft delete ou desativação via endpoint dedicado (is_active é atualizado via `PUT /profiles/:id`)
- Upload de foto de perfil
- Notificações push ou e-mail ao criar/atualizar perfil
- Histórico de versões do perfil
- Relacionamentos entre profiles (amizades, grupos)
- Subscriber/consumer de eventos de outros serviços (apenas publisher por ora)

---

## Technical Considerations

### Stack
- **Linguagem:** TypeScript (o skeleton-service é JS; este serviço é a primeira versão TS do ecossistema)
- **Runtime:** Node.js 22+ com `tsx` para execução direta de TS em dev e `tsc` para build de produção
- **HTTP:** Fastify 5.x com `@fastify/type-provider-zod` para integração de tipos
- **ORM:** Kysely com driver `pg` — Kysely tem suporte nativo a TypeScript (tipos inferidos da definição do schema)
- **Messaging:** amqplib + `@types/amqplib`
- **Validação:** Zod
- **Logging:** Pino + Pino-Loki
- **Observability:** OpenTelemetry + Sentry
- **Testes:** Vitest com suporte TS nativo

### Configuração TypeScript
- `tsconfig.json` com `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`
- `outDir: "dist"`, `rootDir: "src"`
- Scripts: `"dev": "tsx watch src/main.ts"`, `"build": "tsc"`, `"start": "node dist/main.js"`
- Tipos do Kysely definidos em `src/adapters/outbound/db/types.ts` (interface `Database` com todas as tabelas)
- Portas (ports) definidas como interfaces TypeScript em vez de JSDoc

### Arquitetura Hexagonal
```
src/
  domain/
    entities/profile.ts          ← Entidade de domínio (Zod + lógica de negócio)
    ports/
      inbound/profile-use-case.port.ts   ← interface IProfileUseCase
      outbound/profile-repository.port.ts ← interface IProfileRepository
      outbound/event-publisher.port.ts    ← interface IEventPublisher
    use-cases/profile.use-case.ts
  application/
    services/profile.service.ts
  adapters/
    inbound/
      http/
        routes/profile.routes.ts
        server.ts
        middleware/auth.ts
    outbound/
      db/
        client.ts
        types.ts                 ← interface Database { profiles: ProfileTable }
        migrator.ts
        migrations/001_create_profiles_table.ts
        postgres-profile.repository.ts
      messaging/
        publisher.ts
        subscriber.ts
  config/
    env.ts
    observability/
  shared/
    errors.ts
    logger.ts
  main.ts
```

### Decisão: `latitude` e `longitude` como colunas separadas
Geolocalização armazenada como `DECIMAL(10,8)` (latitude) e `DECIMAL(11,8)` (longitude) em vez do tipo `POINT` do PostgreSQL. Motivo: Kysely não tem suporte nativo a tipos geométricos, e a precisão de duas colunas numéricas é suficiente para o escopo atual.

### Decisão: ID fornecido pelo caller
`POST /profiles` aceita `id` no body em vez de gerar um UUID no serviço, porque o Profile representa o usuário autenticado e o ID deve ser idêntico ao ID do usuário no sistema de autenticação. O serviço de autenticação é quem cria o usuário e depois chama `POST /profiles` para criar o perfil correspondente.

---

## Success Metrics

- `POST /profiles` cria e persiste um profile em < 200ms (p95)
- `PUT /profiles/:id` atualiza e persiste em < 200ms (p95)
- Evento publicado no RabbitMQ < 100ms após persistência
- Zero migrations pendentes na inicialização em ambiente limpo
- Cobertura de testes nos use cases e entidade de domínio

---

## Open Questions

- `last_login` deve ser atualizado por um subscriber que escuta eventos de login de um Auth Service, ou deve haver um endpoint dedicado para isso?
- O campo `experience` precisará de migração futura se novos níveis forem adicionados — vale considerar a constraint `CHECK` no banco desde o início?
- O `PUT /profiles/:id` deve retornar `409` se tentar atualizar `id` de um profile que não existe, ou deve ser um `404`? (FR atual: `404`)
