# Profile Service

Microsserviço TypeScript responsável por gerenciar perfis de usuários e entidades de catálogo da plataforma **FindMyParty** — uma plataforma de matchmaking para grupos de RPG.

O serviço cobre:
- **Perfis**: dados do jogador (experiência, preferências de jogo DM/Player, localização, disponibilidade remota)
- **Personagens**: fichas de personagens vinculadas a um perfil, com classes e sistema de RPG
- **Catálogo**: Temas, Classes RPG e Sistemas — entidades de referência usadas por perfis e personagens

Autenticação é responsabilidade do API Gateway, que injeta o `X-User-Id` em cada requisição.

---

## Pré-requisitos

- Node.js 22+
- PostgreSQL 15+
- RabbitMQ 3.12+
- Coletor OpenTelemetry (OTLP) para traces/métricas

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com as suas configurações

# 3. Subir dependências com Docker
docker compose up -d

# 4. Iniciar em modo de desenvolvimento
npm run dev
```

O serviço sobe na porta configurada em `PORT` (padrão: `3001`). As migrations são executadas automaticamente na inicialização.

```bash
# Compilar para produção
npm run build
npm start
```

---

## Variáveis de ambiente

| Variável | Obrigatório | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `PORT` | não | `3001` | Porta HTTP do serviço |
| `DATABASE_URL` | sim | — | Connection string PostgreSQL (`postgresql://user:pass@host:5432/db`) |
| `RABBITMQ_URL` | sim | — | URL do broker RabbitMQ (`amqp://user:pass@host:5672`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | sim | — | Endpoint do coletor OTLP (ex: `http://localhost:4318`) |
| `NODE_ENV` | não | `development` | Ambiente (`development`, `production`, `test`) |
| `LOG_LEVEL` | não | `info` | Nível de log Pino (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) |
| `SENTRY_DSN` | não | — | DSN do Sentry para rastreamento de erros |
| `PROFILE_EVENT_ROUTING_KEY` | não | `profile.profile.updated` | Routing key do evento publicado no RabbitMQ ao criar, atualizar ou resyncar perfis |

---

## Endpoints

### Profiles

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/profiles` | Criar perfil |
| `GET` | `/profiles/:id` | Buscar perfil por ID |
| `PUT` | `/profiles/:id` | Atualizar perfil (parcial) |
| `POST` | `/profiles/resync` | Republicar todos os perfis no RabbitMQ (somente non-prod) |

### Characters

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/characters` | Criar personagem |
| `GET` | `/characters/:id` | Buscar personagem por ID |
| `PUT` | `/characters/:id` | Atualizar personagem (parcial) |
| `GET` | `/profiles/:id/characters` | Listar personagens de um perfil |

### Themes

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/themes` | Criar tema |
| `GET` | `/themes` | Listar todos os temas |
| `GET` | `/themes/:id` | Buscar tema por ID |

### Classes RPG

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/classes` | Criar classe |
| `GET` | `/classes` | Listar todas as classes |
| `GET` | `/classes/:id` | Buscar classe por ID |

### Sistemas RPG

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/systems` | Criar sistema |
| `GET` | `/systems` | Listar todos os sistemas |
| `GET` | `/systems/:id` | Buscar sistema por ID |

### Utilitários

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check com status do PostgreSQL e RabbitMQ |
| `GET` | `/docs` | Documentação OpenAPI (Swagger UI) |

---

## Exemplos de uso

### POST /profiles

O `id` do perfil vem do header `X-User-Id`, injetado pelo API Gateway após validar o JWT.

```http
POST /profiles
X-User-Id: 550e8400-e29b-41d4-a716-446655440000

{
  "name": "Gandalf",
  "experience": "veteran",
  "isDM": true,
  "isPlayer": false,
  "isRemote": true,
  "classIds": ["uuid-da-classe"],
  "systemIds": ["uuid-do-sistema"],
  "themeIds": ["uuid-do-tema"]
}
```

Retorna `201 Created` com `{ data: Profile }` ou `409 Conflict` se já existir.

### PUT /profiles/:id

Todos os campos são opcionais. Para remover associações, envie o array vazio.

```http
PUT /profiles/550e8400-e29b-41d4-a716-446655440000

{
  "name": "Gandalf o Branco",
  "experience": "veteran",
  "classIds": ["uuid-nova-classe"]
}
```

Retorna `200 OK` com `{ data: Profile }` ou `404 Not Found`.

### POST /characters

Requer pelo menos uma classe (`classIds` com mínimo 1 item) e um sistema (`idSystem`).

```http
POST /characters

{
  "idProfile": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Legolas",
  "level": 5,
  "classIds": ["uuid-arqueiro"],
  "idSystem": "uuid-dnd5e"
}
```

Retorna `201 Created` com `{ data: Character }`.

---

## Eventos RabbitMQ

O serviço publica no exchange `profile.events` (tipo `topic`, durable) usando confirm channel.

Criação, atualização e resync de perfil publicam o **mesmo evento** com routing key definida pela env var `PROFILE_EVENT_ROUTING_KEY` (padrão: `profile.profile.updated`). O payload é o estado completo do perfil (`profile.toJSON()`), incluindo as associações resolvidas.

O endpoint `POST /profiles/resync` republica todos os perfis — disponível apenas em `NODE_ENV !== production`, útil para recovery e re-sincronização de consumidores.

---

## Estrutura do projeto

```
src/
  main.ts                              ← Ponto de entrada; wiring manual de dependências
  config/
    env.ts                             ← Validação de env vars com Zod
    observability/                     ← OpenTelemetry (OTLP) + Sentry
  shared/
    errors.ts                          ← AppError, NotFoundError, ValidationError, ConflictError
    logger.ts                          ← Logger Pino
  domain/
    entities/
      profile.ts                       ← Profile + Experience enum + AssociationItem
      character.ts                     ← Character
      theme.ts                         ← Theme
      rpg-class.ts                     ← RpgClass
      system.ts                        ← System
    ports/
      inbound/                         ← IProfileUseCase, ICharacterUseCase, IThemeUseCase, ...
      outbound/                        ← IProfileRepository, ICharacterRepository, IEventPublisher, ...
    use-cases/                         ← ProfileUseCase, CharacterUseCase, ThemeUseCase, ...
  application/
    services/                          ← ProfileService, CharacterService, ThemeService, ...
  adapters/
    inbound/http/
      server.ts                        ← buildServer() — Fastify + plugins + error handler
      routes/                          ← profile, character, theme, rpg-class, system, health
      middleware/auth.ts
    outbound/db/
      client.ts                        ← Kysely client + checkPostgres()
      migrator.ts                      ← runMigrations()
      migrations/                      ← 001_create_profiles_table.ts, 002_extend_profile_tables.ts
      types.ts                         ← interface Database (todas as tabelas)
      postgres-profile.repository.ts
      postgres-character.repository.ts
      postgres-theme.repository.ts
      postgres-rpg-class.repository.ts
      postgres-system.repository.ts
    outbound/messaging/
      publisher.ts                     ← createAmqpPublisher() — confirm channel
      subscriber.ts                    ← registerSubscribers() (placeholder)
```

---

## Arquitetura

O serviço segue **arquitetura hexagonal (ports & adapters)**:

- O `domain` não importa nada de fora — entidades e use cases são agnósticos de infraestrutura
- `adapters` implementam as interfaces definidas em `domain/ports`
- A camada `application/services` faz a ponte entre rotas HTTP e use cases, convertendo payloads em DTOs
- Wiring de dependências é feito manualmente em `main.ts`, sem IoC container
