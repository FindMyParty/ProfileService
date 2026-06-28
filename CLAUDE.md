# Profile Service — Guia para Claude

## Contexto

Microsserviço TypeScript da plataforma **FindMyParty**. Gerencia perfis de usuários de RPG e entidades de catálogo (temas, classes, sistemas) além dos personagens de cada jogador. Faz parte de um ecossistema de microsserviços; autenticação é responsabilidade do API Gateway.

---

## Arquitetura Hexagonal

```
domain/
  entities/        ← Profile, Character, Theme, RpgClass, System (Zod + lógica)
  ports/
    inbound/       ← IProfileUseCase, ICharacterUseCase, IThemeUseCase, IRpgClassUseCase, ISystemUseCase
    outbound/      ← IProfileRepository, ICharacterRepository, IThemeRepository,
                     IRpgClassRepository, ISystemRepository, IEventPublisher
  use-cases/       ← orquestração de negócio por entidade

application/
  services/        ← converte entidades em DTOs para as rotas (ProfileService, CharacterService, etc.)

adapters/
  inbound/http/    ← Fastify + routes por entidade + middleware auth
  outbound/db/     ← Kysely/PostgreSQL — repositórios e migrations
  outbound/messaging/ ← amqplib — publisher (confirm channel) + subscriber (placeholder)

config/
  env.ts           ← validação de env vars com Zod (falha na inicialização se inválido)
  observability/   ← OpenTelemetry (OTLP) + Sentry

shared/
  errors.ts        ← hierarquia de erros
  logger.ts        ← Pino
```

**Regra de dependência:** `domain` não importa nada de fora. `adapters` implementam as interfaces de `domain/ports`.

---

## Entidades e Ports

### Profile
- Campos: `id`, `name`, `birthday`, `description`, `latitude`, `longitude`, `lastLogin`, `isDM`, `isPlayer`, `isActive`, `isRemote`, `experience` (`beginner|intermediate|veteran`)
- Associações N:N: `classes` (RpgClass[]), `systems` (System[]), `themes` (Theme[])
- **ID vem do header `X-User-Id`** (injetado pelo API Gateway) — não é gerado pelo serviço

### Character
- Campos: `id`, `idProfile`, `name`, `background`, `level` (1–20), `isAlive`
- Associações N:N: `classes` (RpgClass[], mínimo 1 obrigatório), `system` (System, obrigatório)
- Pertence a um Profile; ID gerado internamente via `crypto.randomUUID()`

### Theme, RpgClass, System
- Entidades de catálogo: `{ id, name }` apenas
- IDs gerados internamente via `crypto.randomUUID()`
- Sem associações próprias (são referenciadas por Profile e Character)

### Interfaces de porta

```typescript
// Inbound
IProfileUseCase:   createProfile, getProfileById, updateProfile, resyncProfiles
ICharacterUseCase: createCharacter, getCharacterById, listCharactersByProfile, updateCharacter
IThemeUseCase:     createTheme, getThemeById, listThemes
IRpgClassUseCase:  createRpgClass, getRpgClassById, listRpgClasses
ISystemUseCase:    createSystem, getSystemById, listSystems

// Outbound
IProfileRepository:   save, findById, findAll, update
ICharacterRepository: save, findById, findByProfileId, update
IThemeRepository:     save, findById, findAll
IRpgClassRepository:  save, findById, findAll
ISystemRepository:    save, findById, findAll
IEventPublisher:      publish(routingKey, payload)
```

---

## Tabelas do Banco

```
profiles            — dados do perfil
themes              — catálogo de temas
classes             — catálogo de classes RPG
systems             — catálogo de sistemas RPG
characters          — personagens (FK → profiles)
profile_themes      — N:N perfis ↔ temas
profile_classes     — N:N perfis ↔ classes
profile_systems     — N:N perfis ↔ sistemas
characters_classes  — N:N personagens ↔ classes
characters_systems  — N:N personagens ↔ sistemas (na prática, 1:1 forçado pela entidade)
```

Tipos Kysely definidos em `src/adapters/outbound/db/types.ts` (interface `Database`).

---

## Padrões de código

### TypeScript com NodeNext

- Imports sempre com extensão `.js` (mesmo para arquivos `.ts`): `import { foo } from './foo.js'`
- `tsconfig.json`: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`
- Tipos exportados de `domain/entities/*.ts` e `domain/ports/`

### Entidades — métodos obrigatórios

Toda entidade expõe: `create(data)`, `fromPersistence(row)`, `update(data)`, `toJSON()`

### Validação

- **Env vars**: Zod em `src/config/env.ts` — `process.exit(1)` se inválido
- **HTTP bodies**: Zod nas rotas, lança `ValidationError` se inválido
- **Entidade**: `Entity.create()` e `entity.update()` validam com Zod

### Tratamento de erros

Hierarquia em `src/shared/errors.ts`:
- `AppError` (base) → capturado pelo error handler do Fastify
- `NotFoundError` → 404
- `ValidationError` → 400
- `ConflictError` → 409

Erros de banco (chave duplicada) são capturados no repositório/use-case e convertidos em `ConflictError`.

### Kysely (ORM)

- Colunas `snake_case` no banco → `camelCase` na entidade via `#toEntity(row)` no repositório (ou `fromPersistence` na entidade)
- `DECIMAL` retornado como string pelo driver `pg` → converter com `parseFloat()` no repositório
- Sem SQL raw fora dos repositórios e das migrations

### Migrations

- Arquivos em `src/adapters/outbound/db/migrations/`
- Nome: `NNN_descricao.ts` (ex: `001_create_profiles_table.ts`)
- Exportam funções `up(db)` e `down(db)` tipadas com `Kysely<unknown>`
- Executadas automaticamente na inicialização via `runMigrations()`
- O migrator detecta se está rodando em dev (`.ts`) ou produção (`.js`) via `import.meta.url`
- Use `sql` template para tipos customizados: `.addColumn('col', sql\`decimal(10,8)\`)`

### RabbitMQ

- Exchange: `profile.events` (tipo `topic`, durable)
- Routing key pattern: `[service].[entity].[action]` → `profile.profile.updated`
- **Routing key unificada**: criação, atualização e resync de perfil publicam o mesmo evento. Configurada pela env var `PROFILE_EVENT_ROUTING_KEY` (default: `profile.profile.updated`) — injetada via construtor em `ProfileUseCase`, sem acoplar o domínio ao `env`
- Publisher usa confirm channel — aguarda ack do broker; mensagens persistentes: `{ persistent: true }`
- Subscriber está implementado como placeholder — `registerSubscribers()` não consome nada ainda
- **Endpoint de resync** (`POST /profiles/resync`): registrado apenas quando `NODE_ENV !== 'production'`

---

## Como adicionar uma nova entidade

1. **Criar entidade** em `src/domain/entities/nova-entidade.ts` com `create()`, `fromPersistence()`, `update()`, `toJSON()`
2. **Criar portas** em `src/domain/ports/inbound/nova-entidade-use-case.port.ts` e `outbound/nova-entidade-repository.port.ts`
3. **Criar migration** `src/adapters/outbound/db/migrations/NNN_create_nova_entidade_table.ts`
4. **Adicionar tipo Kysely** em `src/adapters/outbound/db/types.ts` (interface `Database`)
5. **Implementar repositório** `src/adapters/outbound/db/postgres-nova-entidade.repository.ts`
6. **Criar use case** `src/domain/use-cases/nova-entidade.use-case.ts`
7. **Criar service** `src/application/services/nova-entidade.service.ts`
8. **Criar rotas** `src/adapters/inbound/http/routes/nova-entidade.routes.ts`
9. **Registrar rotas** em `src/adapters/inbound/http/server.ts`
10. **Wirear dependências** em `src/main.ts`

---

## Decisões técnicas

- **ID do Profile vem do API Gateway**: `POST /profiles` lê o `id` do header `X-User-Id` (injetado pelo Gateway após validar o JWT) — não aceita `id` no body e não gera UUID. O ID deve coincidir com o do auth-service. Todas as demais entidades geram UUID internamente via `crypto.randomUUID()`.
- **Sem auth no serviço**: enforcement de autenticação é responsabilidade do API Gateway. O ProfileService confia no header `X-User-Id` como fonte de identidade.
- **latitude/longitude como DECIMAL separados**: Kysely não tem suporte nativo a tipos geométricos do PostgreSQL.
- **TypeScript first**: primeiro serviço TS do ecossistema FindMyParty (skeleton-service é JS).
- **Wiring explícito em `main.ts`**: sem IoC container — cada dependência é instanciada e injetada manualmente, tornando o grafo de dependências explícito e rastreável.
- **OpenTelemetry inicializado antes de tudo**: `initTelemetry()` é chamado no topo de `main.ts` para garantir que o SDK faça o monkey-patch dos módulos antes de qualquer import de biblioteca instrumentada.
