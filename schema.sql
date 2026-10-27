-- Rode no Supabase: SQL Editor > New query > Run
create table if not exists public.leads (
  id text primary key,
  dados jsonb not null,
  atualizado timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Só usuários logados (equipe) leem e escrevem
create policy "equipe autenticada" on public.leads
  for all to authenticated using (true) with check (true);

-- Atualização em tempo real entre aparelhos
alter publication supabase_realtime add table public.leads;
