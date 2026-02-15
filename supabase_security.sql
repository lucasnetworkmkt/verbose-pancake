
-- RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE
-- IMPORTANTE: Este script NÃO apaga dados. Ele apaga apenas as REGRAS de segurança antigas para criar novas corretas.

-- 1. Remove regras antigas que podem estar bloqueando o acesso (Seguro: não deleta linhas da tabela)
drop policy if exists "Enable insert for users based on user_id" on public.app_data;
drop policy if exists "Enable update for users based on user_id" on public.app_data;
drop policy if exists "Enable select for users based on user_id" on public.app_data;
drop policy if exists "Enable delete for users based on user_id" on public.app_data;
drop policy if exists "Allow Select Own Data" on public.app_data;
drop policy if exists "Allow Insert Own Data" on public.app_data;
drop policy if exists "Allow Update Own Data" on public.app_data;
drop policy if exists "Allow Delete Own Data" on public.app_data;

-- 2. Garante que a tabela existe (caso não exista)
create table if not exists public.app_data (
  user_id uuid not null references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. Ativa o sistema de segurança (RLS)
alter table public.app_data enable row level security;

-- 4. CRIA AS NOVAS REGRAS PERMISSIVAS

-- Regra 1: Permitir que o dono da conta VEJA seus dados (Resolve o problema de "conta nova")
create policy "Allow Select Own Data"
on public.app_data for select
using (auth.uid() = user_id);

-- Regra 2: Permitir que o dono da conta CRIE seus dados (Apenas se não existirem)
create policy "Allow Insert Own Data"
on public.app_data for insert
with check (auth.uid() = user_id);

-- Regra 3: Permitir que o dono da conta SALVE alterações
create policy "Allow Update Own Data"
on public.app_data for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Regra 4: Permitir deletar (opcional)
create policy "Allow Delete Own Data"
on public.app_data for delete
using (auth.uid() = user_id);
