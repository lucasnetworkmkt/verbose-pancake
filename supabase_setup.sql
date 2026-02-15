
-- --- GUIA DE CORREÇÃO DO BANCO DE DADOS ---

-- PARTE 1: CORREÇÃO DA BUSCA (ESSENCIAL)
-- Rode este bloco para criar as funções que permitem buscar amigos.
-- Isso resolve o problema de "não achar ninguém".

CREATE OR REPLACE FUNCTION public.search_users(search_query text)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    user_id as id,
    data->'user'->>'username' as username,
    data->'user'->>'avatarUrl' as avatar_url
  FROM 
    app_data
  WHERE 
    data->'user'->>'username' ILIKE '%' || search_query || '%'
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(target_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    user_id as id,
    data->'user'->>'username' as username,
    data->'user'->>'avatarUrl' as avatar_url
  FROM 
    app_data
  WHERE 
    user_id = target_id;
END;
$$;


-- PARTE 2: REALTIME (CHAT E AMIZADES)
-- Se você já viu o erro "relation ... is already member of publication",
-- significa que o comando correspondente JÁ FOI FEITO. Pode pular.
-- Tente rodar um por um se tiver dúvida.

-- Ativar Realtime para Mensagens (Provavelmente já feito)
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Ativar Realtime para Amizades (Rode este se notificações não aparecerem)
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
