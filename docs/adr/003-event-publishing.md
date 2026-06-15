# ADR 003: Publicação de Eventos a Cada Mutação

**Data:** 2026-06-15
**Status:** Aceito

## Contexto

Outros serviços da plataforma FindMyParty precisam reagir quando perfis são criados ou atualizados (ex: serviço de matchmaking que precisa indexar perfis, serviço de notificações, etc.).

Precisamos decidir como comunicar essas mudanças de estado.

## Decisão

A cada mutação no Profile Service (criação ou atualização), publicamos um evento no RabbitMQ com o **estado completo** do perfil após a operação.

### Especificação

- **Exchange:** `profile.events` (tipo `topic`, durable)
- **Routing keys:** `profile.profile.created`, `profile.profile.updated`
- **Payload:** `profile.toJSON()` — estado completo após a mutação
- **Persistência:** mensagens persistentes (`{ persistent: true }`)
- **Confirmação:** confirm channel — aguarda ack do broker antes de resolver

### Padrão de routing key

```
[service].[entity].[action]
profile.profile.created
profile.profile.updated
```

## Consequências

**Positivo:**
- Desacoplamento: o Profile Service não precisa saber quem consome seus eventos
- Consumidores recebem o estado completo e não precisam fazer uma chamada adicional ao Profile Service
- Mensagens persistentes garantem entrega mesmo se o consumidor estiver offline momentaneamente
- Confirm channel garante que a mensagem foi aceita pelo broker antes de confirmar a operação

**Negativo:**
- Payload maior (estado completo vs. apenas o ID)
- Consistência eventual: consumidores podem ter dados momentaneamente desatualizados
- Sem rollback automático se o evento for publicado mas a persistência falhar (precisa de outbox pattern para garantia total — fora do escopo atual)

## Alternativas consideradas

- **Notificação mínima (apenas ID):** mais leve, mas força consumidores a fazer uma chamada REST adicional
- **Webhooks HTTP:** mais simples de implementar, mas menos resiliente e sem retry automático
- **Outbox pattern:** garante atomicidade entre persistência e publicação, mas adiciona complexidade operacional — considerado para uma iteração futura
