# PRD: Database Migrations — Pictures, Themes, Characters, Classes e Systems

## Introduction

Criar as migrations Kysely necessárias para estender o banco de dados do ProfileService com as tabelas de fotos de perfil, temas, personagens, classes e sistemas de RPG. Todas as tabelas devem seguir o padrão já estabelecido em `001_create_profiles_table.ts` e serão adicionadas em uma única migration (`002_extend_profile_tables.ts`).

## Goals

- Persistir fotos de perfil linkadas a blobs externos
- Permitir associação de temas, classes e sistemas a profiles
- Modelar personagens com classes e sistemas associados
- Manter integridade referencial com FKs para `profiles`
- Suportar rollback completo via função `down()`

## User Stories

### US-001: Criar migration com todas as tabelas novas
**Description:** As a developer, I need a single migration file that creates all new tables so the database schema is extended in one atomic step.

**Acceptance Criteria:**
- [ ] Arquivo `src/adapters/outbound/db/migrations/002_extend_profile_tables.ts` criado
- [ ] Exporta funções `up(db: Kysely<unknown>)` e `down(db: Kysely<unknown>)` tipadas
- [ ] `up()` cria as tabelas na ordem correta (tabelas de lookup antes das dependentes)
- [ ] `down()` dropa as tabelas na ordem inversa (dependentes antes das de lookup)
- [ ] Uso de `sql` template para tipos sem suporte nativo no Kysely (se necessário)
- [ ] Typecheck passes (`npx tsc --noEmit`)

### US-002: Tabela `pictures`
**Description:** As a developer, I need to store blob URLs for profile pictures so users can have multiple photos.

**Acceptance Criteria:**
- [ ] Colunas: `id_profile UUID NOT NULL`, `pic VARCHAR(2048) NOT NULL`, `is_primary BOOLEAN NOT NULL DEFAULT false`
- [ ] `PRIMARY KEY (id_profile, pic)` — chave composta
- [ ] FK `id_profile → profiles(id)` com `ON DELETE CASCADE`
- [ ] Typecheck passes

### US-003: Tabelas `themes` e `profile_themes`
**Description:** As a developer, I need lookup and join tables for themes so profiles can be tagged with their preferred game themes.

**Acceptance Criteria:**
- [ ] `themes`: `id UUID PRIMARY KEY`, `name VARCHAR(255) NOT NULL UNIQUE`
- [ ] `profile_themes`: `id_profile UUID NOT NULL`, `id_themes UUID NOT NULL`
- [ ] `profile_themes` PRIMARY KEY composta `(id_profile, id_themes)`
- [ ] FK `id_profile → profiles(id)` com `ON DELETE CASCADE`
- [ ] FK `id_themes → themes(id)` com `ON DELETE CASCADE`
- [ ] Typecheck passes

### US-004: Tabela `characters`
**Description:** As a developer, I need to store RPG characters belonging to a profile so users can register their characters.

**Acceptance Criteria:**
- [ ] Colunas: `id UUID PRIMARY KEY`, `id_profile UUID NOT NULL`, `name VARCHAR(255) NOT NULL`, `background VARCHAR(500)`, `level SMALLINT NOT NULL DEFAULT 1`, `is_alive BOOLEAN NOT NULL DEFAULT true`
- [ ] FK `id_profile → profiles(id)` com `ON DELETE CASCADE`
- [ ] Typecheck passes

### US-005: Tabelas `classes`, `characters_classes` e `profile_classes`
**Description:** As a developer, I need lookup and join tables for RPG classes so both characters and profiles can be associated with classes.

**Acceptance Criteria:**
- [ ] `classes`: `id UUID PRIMARY KEY`, `name VARCHAR(255) NOT NULL UNIQUE`
- [ ] `characters_classes`: `id_characters UUID NOT NULL`, `id_classes UUID NOT NULL`, PRIMARY KEY composta
- [ ] FK `id_characters → characters(id)` com `ON DELETE CASCADE`
- [ ] FK `id_classes → classes(id)` com `ON DELETE CASCADE`
- [ ] `profile_classes`: `id_profile UUID NOT NULL`, `id_classes UUID NOT NULL`, PRIMARY KEY composta
- [ ] FK `id_profile → profiles(id)` com `ON DELETE CASCADE`
- [ ] FK `id_classes → classes(id)` com `ON DELETE CASCADE`
- [ ] Typecheck passes

### US-006: Tabelas `systems`, `characters_systems` e `profile_systems`
**Description:** As a developer, I need lookup and join tables for RPG systems (e.g., D&D 5e, Pathfinder) so both characters and profiles can declare supported systems.

**Acceptance Criteria:**
- [ ] `systems`: `id UUID PRIMARY KEY`, `name VARCHAR(255) NOT NULL UNIQUE`
- [ ] `characters_systems`: `id_characters UUID NOT NULL`, `id_systems UUID NOT NULL`, PRIMARY KEY composta
- [ ] FK `id_characters → characters(id)` com `ON DELETE CASCADE`
- [ ] FK `id_systems → systems(id)` com `ON DELETE CASCADE`
- [ ] `profile_systems`: `id_profile UUID NOT NULL`, `id_systems UUID NOT NULL`, PRIMARY KEY composta
- [ ] FK `id_profile → profiles(id)` com `ON DELETE CASCADE`
- [ ] FK `id_systems → systems(id)` com `ON DELETE CASCADE`
- [ ] Typecheck passes

## Functional Requirements

- FR-1: A migration deve ser identificada como `002_extend_profile_tables.ts` e seguir o padrão do arquivo `001_create_profiles_table.ts`
- FR-2: Todas as PKs de lookup (`themes.id`, `classes.id`, `systems.id`, `characters.id`) devem ser `UUID`
- FR-3: Todas as tabelas de relacionamento N:M devem usar PRIMARY KEY composta (sem coluna `id` surrogate)
- FR-4: Todas as FKs para `profiles(id)` devem ter `ON DELETE CASCADE`
- FR-5: Todas as FKs para tabelas de lookup devem ter `ON DELETE CASCADE`
- FR-6: O campo `pic` em `pictures` deve ser `VARCHAR(2048)` para acomodar URLs longas de blob storage
- FR-9: Os campos `name` de `themes`, `classes` e `systems` devem ter constraint `UNIQUE`
- FR-7: `characters.level` deve ter `DEFAULT 1` e `characters.is_alive` deve ter `DEFAULT true`
- FR-8: A função `down()` deve dropar as tabelas na ordem inversa da criação para evitar erros de FK

## Non-Goals

- Não adicionar `created_at` / `updated_at` nas novas tabelas (exceto se explicitamente solicitado)
- Não criar seeders ou dados iniciais para as tabelas de lookup
- Não criar repositórios, use cases, ou rotas para as novas entidades — apenas as migrations
- Não adicionar tipos Kysely em `db/types.ts` (fora de escopo desta tarefa)
- Não validar unicidade de `themes.name`, `classes.name` ou `systems.name`

## Technical Considerations

- Seguir exatamente o padrão de `001_create_profiles_table.ts`: imports de `sql` e `Kysely`, `.ifNotExists()`, funções `up`/`down` assíncronas
- Kysely não tem método `.addForeignKeyConstraint()` direto no `createTable` — usar `.addColumn('id_profile', 'uuid', col => col.references('profiles.id').onDelete('cascade').notNull())`
- Ordem de criação no `up()`:
  1. `pictures`
  2. `themes` → `profile_themes`
  3. `characters`
  4. `classes` → `characters_classes` → `profile_classes`
  5. `systems` → `characters_systems` → `profile_systems`
- Ordem de drop no `down()`: inversa da criação
- O migrator do projeto executa `up()` automaticamente na inicialização — verificar execução via logs ao subir o serviço

## Success Metrics

- `npx tsc --noEmit` passa sem erros após criar o arquivo
- Serviço sobe sem erros com as novas tabelas criadas no banco
- `down()` executado manualmente reverte sem erros de constraint

## Open Questions

Nenhuma.
