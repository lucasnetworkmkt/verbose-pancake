-- Execute este script no SQL Editor do seu projeto no Supabase

-- 1. Cria a tabela para armazenar os dados do aplicativo (JSON)
create table if not exists app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilita segurança a nível de linha (RLS)
alter table app_data enable row level security;

-- 3. Cria políticas de acesso (apenas o dono dos dados pode ver/editar)

-- Política para INSERIR dados (Registro)
create policy "Users can insert their own data"
  on app_data for insert
  with check (auth.uid() = user_id);

-- Política para ATUALIZAR dados (Save)
create policy "Users can update their own data"
  on app_data for update
  using (auth.uid() = user_id);

-- Política para LER dados (Login)
create policy "Users can select their own data"
  on app_data for select
  using (auth.uid() = user_id);
