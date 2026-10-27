# CRM Grupo Jota (versão equipe, com Supabase)

Os leads ficam em um banco na nuvem, compartilhados entre todos os usuários, com login e atualização em tempo real.

## Configuração (uma vez, ~10 min)
1. Crie uma conta e um projeto em https://supabase.com (plano gratuito serve).
2. **SQL Editor** > New query > cole o conteúdo de `schema.sql` > Run.
3. **Authentication > Sign In / Providers**: desative "Allow new users to sign up" (só você cria os acessos).
4. **Authentication > Users > Add user**: crie e-mail e senha de cada vendedor (marque "Auto Confirm User").
5. **Project Settings > API**: copie a *Project URL* e a chave *anon public* para o `config.js`.
6. No VS Code, abra a pasta e rode com a extensão **Live Server** (botão direito em `index.html`).

## Publicar online (opcional)
Suba a pasta na Netlify, Vercel ou GitHub Pages. É só HTML, sem build.

## Segurança
- A chave `anon` pode ficar no código porque as regras (RLS) do `schema.sql` só liberam usuários logados.
- Nunca coloque a chave `service_role` no projeto.

## Arquivos
`index.html`, `style.css`, `app.js` (lógica), `config.js` (chaves), `schema.sql` (tabela e regras).

## Funis
- **Funil de Clientes:** Novo, Contatado, Qualificado, Proposta, Negociação, Ganho, Perdido.
- **Funil de Oficinas:** Prospecção, Contato feito, Reunião agendada, Proposta enviada, Em credenciamento, Credenciada, Perdida.
- Cada lead tem o campo *Funil* (Clientes ou Oficinas). Leads antigos sem funil entram em Clientes; os de "Credenciamento de oficina" migram sozinhos para Oficinas.
- No CSV, a coluna `Tipo` (Cliente ou Oficina) define o funil. Sem ela, o CRM identifica pelo interesse.
- Atualizando uma instalação existente: mantenha o seu `config.js` e substitua os demais arquivos.
