# Checkpoint 1.5.1 — Bootstrap do primeiro administrador

- Supabase do projeto novo hotel configurado como fallback seguro usando publishable key.
- Primeiro usuário pode criar o próprio perfil admin somente enquanto staff_users estiver vazio.
- Login no GitHub Pages autentica diretamente via Supabase Auth e usa staff_users como fallback quando o backend Express não estiver hospedado.
- Nenhuma senha é gravada em código.
