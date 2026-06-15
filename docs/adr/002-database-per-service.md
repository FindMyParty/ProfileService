# ADR 002: Database-per-Service

**Data:** 2026-06-15
**Status:** Aceito

## Contexto

A plataforma FindMyParty é composta por múltiplos microsserviços. Precisamos decidir como cada serviço gerencia seus dados.

## Decisão

Cada microsserviço possui seu próprio banco de dados PostgreSQL, isolado dos demais. O Profile Service tem seu próprio banco (`profile_service`) e gerencia seu schema via migrations Kysely.

Nenhum outro serviço acessa diretamente o banco do Profile Service. A comunicação entre serviços ocorre via:
1. **API REST** (para consultas síncronas)
2. **Eventos RabbitMQ** (para notificações assíncronas)

## Consequências

**Positivo:**
- Isolamento total: mudanças no schema do Profile Service não afetam outros serviços
- Escalabilidade independente: o banco pode ser dimensionado separadamente
- Deploy independente: não há coordenação de schema entre serviços
- Resiliência: falha no banco de um serviço não derruba outros

**Negativo:**
- Sem joins entre tabelas de serviços diferentes (requer desnormalização ou chamadas adicionais)
- Consistência eventual entre serviços (aceitável para o domínio de RPG)
- Mais overhead operacional: múltiplos bancos para gerenciar

## Alternativas consideradas

- **Banco compartilhado**: mais simples, mas cria acoplamento entre serviços e impede deploy independente
- **Schema-per-service no mesmo banco**: compromisso, mas ainda compartilha recursos e complexifica permissões
