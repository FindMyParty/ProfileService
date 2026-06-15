# Profile Service — Guia para Claude

## Arquitetura Hexagonal

O serviço segue arquitetura hexagonal (ports & adapters):

```
domain/          ← núcleo de negócio, sem dependências externas
  entities/      ← Profile (Zod + lógica)
  ports/         ← interfaces TypeScript (contratos)
  use-cases/     ← orquestração de negócio

application/     ← camada de aplicação
  services/      ← converte entidades em DTOs para as rotas

adapters/
  inbound/http/  ← Fastify (recebe HTTP, chama services)
  outbound/db/   ← Kysely/PostgreSQL (implementa IProfileRepository)
  outbound/messaging/ ← amqplib (implementa IEventPublisher)
```

**Regra de dependência:** `domain` não importa nada de fora. `adapters` implementam as interfaces de `domain/ports`.

---

## Padrões de código

### TypeScript com NodeNext

- Imports sempre com extensão `.js` (mesmo para arquivos `.ts`): `import { foo } from './foo.js'`
- `tsconfig.json`: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`
- Tipos exportados de `domain/entities/profile.ts` e `domain/ports/`

### Validação

- **Env vars**: Zod em `src/config/env.ts` — falha na inicialização se inválido
- **HTTP bodies**: Zod nas rotas, lança `ValidationError` se inválido
- **Entidade**: `Profile.create()` e `profile.update()` validam com Zod

### Tratamento de erros

Hierarquia em `src/shared/errors.ts`:
- `AppError` (base) → capturado pelo error handler do Fastify
- `NotFoundError` → 404
- `ValidationError` → 400
- `ConflictError` → 409

Erros de banco (chave duplicada) precisam ser capturados no use case e convertidos em `ConflictError`.

### Kysely (ORM)

- Tipos da tabela em `src/adapters/outbound/db/types.ts` (interface `Database`)
- Sem SQL raw fora de `postgres-profile.repository.ts` e das migrations
- Colunas `snake_case` no banco → `camelCase` na entidade via `#toEntity(row)` no repositório
- DECIMAL retornado como string pelo driver `pg` → converter com `parseFloat()` no repositório

### Migrations

- Arquivos em `src/adapters/outbound/db/migrations/`
- Nome: `NNN_descricao.ts` (ex: `001_create_profiles_table.ts`)
- Exportam funções `up(db)` e `down(db)` tipadas com `Kysely<unknown>`
- Executadas automaticamente na inicialização via `runMigrations()`
- O migrator detecta se está rodando em dev (`.ts`) ou produção (`.js`) via `import.meta.url`
- Use `sql` template para tipos customizados do Kysely: `.addColumn('col', sql\`decimal(10,8)\`)`

### RabbitMQ

- Exchange: `profile.events` (tipo `topic`, durable)
- Routing key pattern: `[service].[entity].[action]` → `profile.profile.created`
- Publisher usa confirm channel — aguarda ack do broker
- Mensagens persistentes: `{ persistent: true }`

---

## Como adicionar uma nova entidade

1. **Criar entidade** em `src/domain/entities/nova-entidade.ts` com `create()`, `fromPersistence()`, `update()`, `toJSON()`
2. **Criar porta** `src/domain/ports/outbound/nova-entidade-repository.port.ts` (interface)
3. **Criar migration** `src/adapters/outbound/db/migrations/NNN_create_nova_entidade_table.ts`
4. **Adicionar tipo Kysely** em `src/adapters/outbound/db/types.ts`
5. **Implementar repositório** `src/adapters/outbound/db/postgres-nova-entidade.repository.ts`
6. **Criar use case** `src/domain/use-cases/nova-entidade.use-case.ts`
7. **Criar service** `src/application/services/nova-entidade.service.ts`
8. **Criar rotas** `src/adapters/inbound/http/routes/nova-entidade.routes.ts`
9. **Registrar rotas** em `src/adapters/inbound/http/server.ts`
10. **Wirear dependências** em `src/main.ts`

---

## Decisões técnicas

- **ID do Profile vem do API Gateway**: `POST /profiles` lê o `id` do header `X-User-Id` (injetado pelo Gateway após validar o JWT) — não aceita `id` no body e não gera UUID. O ID deve coincidir com o do auth-service. Todas as demais entidades (character, theme, rpg-class, system) geram UUID internamente via `crypto.randomUUID()`.
- **Sem auth no serviço**: enforcement de autenticação é responsabilidade do API Gateway. O ProfileService confia no header `X-User-Id` como fonte de identidade.
- **latitude/longitude como DECIMAL separados**: Kysely não tem suporte nativo a tipos geométricos do PostgreSQL.
- **TypeScript first**: primeiro serviço TS do ecossistema FindMyParty (skeleton-service é JS).
- **Sem auth no serviço**: enforcement é responsabilidade do API Gateway. O serviço confia no `id` fornecido pelo caller.
