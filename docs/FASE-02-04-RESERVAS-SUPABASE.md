# FASE 2.4 — Reservas no Supabase

- `reservations` passa a ser a fonte preferencial do backend para leitura, criação e atualização.
- O GitHub Pages possui fallback de leitura direta para colaboradores autenticados.
- A tabela cloud inicia vazia; reservas-demo não são copiadas para produção.
- O fallback inseguro que atribuía qualquer quarto quando não havia disponibilidade foi removido.
- JSON permanece fallback temporário até a FASE 2.7.
- Concorrência/garantia atômica contra duas reservas simultâneas continua para a fase de integridade transacional.
