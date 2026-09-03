# FASE 3.1 — Reservas atômicas e proteção contra overbooking

## Implementado
- Constraint PostgreSQL `reservations_no_overbooking` com `daterange` `[check-in, check-out)`.
- Reservas `Pendente`, `Confirmada` e `CheckIn` não podem se sobrepor no mesmo quarto.
- RPC `create_reservation_atomic` seleciona e reserva o quarto em uma única transação.
- Advisory lock por tipo de quarto serializa a seleção concorrente.
- A RPC valida período, hóspedes, forma de pagamento, capacidade e indisponibilidade operacional.
- GitHub Pages usa a RPC diretamente; um backend hospedado continua usando `/api/reservations` e também é protegido pela constraint do banco.

## Teste de integridade executado
Foi usado um tipo com apenas um quarto. A primeira reserva de teste foi aceita, a segunda tentativa para o mesmo período foi bloqueada e a reserva de teste foi removida. Zero resíduos permaneceram no banco.
