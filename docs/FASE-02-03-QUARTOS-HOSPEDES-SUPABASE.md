# FASE 2.3 — Quartos e hóspedes no Supabase

- `rooms` passa a ser fonte preferencial para leitura e CRUD no backend.
- 8 quartos-base foram migrados para o Supabase; nomes de ocupantes demo foram anonimizados na persistência cloud.
- `guests` passa a ser fonte preferencial para dados reais criados/alterados pelo sistema.
- hóspedes fictícios do seed local não foram copiados para o banco cloud porque contêm dados pessoais simulados; quando Supabase está disponível, uma tabela `guests` vazia é tratada como estado válido, sem repopular o seed.
- JSON permanece somente como fallback temporário quando o Supabase não está disponível, até a FASE 2.7.
- alterações de status de quartos continuam disparando as automações operacionais existentes e depois sincronizam o quarto com o Supabase.
- nenhuma alteração visual foi realizada.
