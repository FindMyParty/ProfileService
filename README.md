# Profile Service

Microsserviço TypeScript responsável por armazenar e gerenciar os perfis de usuários da plataforma **FindMyParty**.

O perfil representa o usuário autenticado (mesmo ID) e contém informações relevantes para partidas de RPG: experiência, preferências de jogo (DM/Player), disponibilidade remota e localização geográfica.

---

## Pré-requisitos

- Node.js 22+
- PostgreSQL 15+
- RabbitMQ 3.12+
- (Opcional) Coletor OpenTelemetry para traces/métricas

---

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com as suas configurações
```

### 3. Subir dependências com Docker (opcional)

```bash
docker compose up -d
```

### 4. Iniciar em modo de desenvolvimento

```bash
npm run dev
```

O serviço sobe na porta configurada em `PORT` (padrão: 3001). As migrations são executadas automaticamente na inicialização.

### 5. Compilar para produção

```bash
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
| `NODE_ENV` | não | `development` | Ambiente (`development`, `production`, `test`) |
| `LOG_LEVEL` | não | `info` | Nível de log Pino (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | sim | — | Endpoint do coletor OTLP (ex: `http://localhost:4318`) |
| `SENTRY_DSN` | não | — | DSN do Sentry para rastreamento de erros |

---

## Endpoints principais

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/profiles` | Criar perfil |
| `PUT` | `/profiles/:id` | Atualizar perfil |
| `GET` | `/profiles/:id` | Buscar perfil por ID |
| `GET` | `/health` | Health check com status das dependências |
| `GET` | `/docs` | Documentação OpenAPI (Swagger UI) |

### POST /profiles

Cria um novo perfil. O `id` deve ser o UUID do usuário autenticado (fornecido pelo caller, não gerado pelo serviço).

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Gandalf",
  "experience": "veteran",
  "isDM": true,
  "isPlayer": false,
  "isRemote": true
}
```

Retorna `201 Created` com `{ data: Profile }` ou `409 Conflict` se já existir.

### PUT /profiles/:id

Atualização parcial — todos os campos são opcionais.

```json
{
  "name": "Gandalf o Branco",
  "experience": "veteran"
}
```

Retorna `200 OK` com `{ data: Profile }` ou `404 Not Found`.

### GET /profiles/:id

Retorna `200 OK` com `{ data: Profile }` ou `404 Not Found`.

---

## Eventos RabbitMQ

O serviço publica no exchange `profile.events` (tipo `topic`):

| Routing Key | Quando |
|-------------|--------|
| `profile.profile.created` | Após criação de perfil |
| `profile.profile.updated` | Após atualização de perfil |

Payload: estado completo do perfil (`profile.toJSON()`).

---

## Estrutura do projeto

```
src/
  main.ts                        ← Ponto de entrada
  config/
    env.ts                       ← Validação de env vars com Zod
    observability/               ← OpenTelemetry + Sentry
  shared/
    errors.ts                    ← AppError, NotFoundError, ConflictError, etc.
    logger.ts                    ← Logger Pino
  domain/
    entities/profile.ts          ← Entidade de domínio
    ports/                       ← Interfaces (inbound/outbound)
    use-cases/profile.use-case.ts
  application/
    services/profile.service.ts  ← Camada de aplicação (DTO conversion)
  adapters/
    inbound/http/                ← Fastify server + rotas
    outbound/db/                 ← Kysely client + migrations + repository
    outbound/messaging/          ← RabbitMQ publisher + subscriber
```
