# FASE 1.6 — Endpoints públicos endurecidos

- JSON limitado a 64 KB.
- Reserva pública aceita apenas campos explicitamente permitidos.
- Validação de e-mail, datas, hóspedes, forma de pagamento e tamanho dos textos.
- Campos internos de reserva enviados pelo cliente são descartados.
- Pedidos públicos de Room Service aceitam somente formato e valores esperados.
- Rate limit em memória: 10 reservas / 10 min / IP e 30 pedidos / 10 min / IP.
- Rotas administrativas permanecem protegidas por Bearer + RBAC.
