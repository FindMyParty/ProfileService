# ADR 001: Arquitetura Hexagonal

**Data:** 2026-06-15
**Status:** Aceito

## Contexto

O Profile Service precisa de uma arquitetura que permita:
- Testar a lógica de negócio sem depender de banco de dados ou RabbitMQ
- Trocar implementações de infraestrutura (ex: migrar de PostgreSQL para outro banco) sem tocar no domínio
- Manter a lógica de negócio isolada e fácil de entender

## Decisão

Adotamos a **Arquitetura Hexagonal** (Ports & Adapters), seguindo o padrão estabelecido pelo `skeleton-service` do ecossistema FindMyParty.

### Estrutura

```
domain/          ← núcleo, sem dependências externas
  entities/      ← entidades de domínio com Zod
  ports/         ← interfaces TypeScript (contratos)
  use-cases/     ← orquestração, regras de negócio

application/     ← converte entidades em DTOs

adapters/
  inbound/       ← HTTP (Fastify) — chama use cases
  outbound/      ← DB (Kysely) e Mensageria (amqplib) — implementam ports
```

### Regra de dependência

O código flui de fora para dentro:
```
HTTP Routes → Application Services → Use Cases → Domain Entities
                                    ↑
                  Repository Port ──┘  (implementado por PostgresProfileRepository)
                  Publisher Port ───┘  (implementado por AmqpPublisher)
```

O `domain/` nunca importa de `adapters/` ou `application/`.

## Consequências

**Positivo:**
- Lógica de negócio testável com mocks das portas
- Infraestrutura substituível sem impactar o domínio
- Código do domínio claro e focado em regras de negócio

**Negativo:**
- Mais arquivos e camadas do que uma arquitetura simples (CRUD direto)
- Curva de aprendizado para desenvolvedores novos no padrão

## Alternativas consideradas

- **MVC simples**: mais rápido de implementar, mas mistura lógica de negócio com infraestrutura
- **CQRS**: considerado complexo demais para o escopo atual
