-- ATENÇÃO: Execute este script no SQL Editor do Supabase para corrigir as permissões.

-- 1. Remove TODAS as políticas possíveis para limpar o terreno e evitar erro 42710
drop policy if exists "Usuários gerenciam seus próprios dados" on public.app_data;
drop policy if exists "Enable insert for users based on user_id" on public.app_data;
drop policy if exists "Enable update for users based on user_id" on public.app_data;
drop policy if exists "Enable select for users based on user_id" on public.app_data;
drop policy if exists "Enable delete for users based on user_id" on public.app_data;

-- 2. Garante que a tabela existe
create table if not exists public.app_data (
  user_id uuid not null references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. Habilita segurança (Row Level Security)
alter table public.app_data enable row level security;

-- 4. Cria as políticas separadas

-- Permitir INSERT
create policy "Enable insert for users based on user_id"
on public.app_data for insert
with check (auth.uid() = user_id);

-- Permitir UPDATE
create policy "Enable update for users based on user_id"
on public.app_data for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Permitir SELECT
create policy "Enable select for users based on user_id"
on public.app_data for select
using (auth.uid() = user_id);

-- Permitir DELETE
create policy "Enable delete for users based on user_id"
on public.app_data for delete
using (auth.uid() = user_id);
