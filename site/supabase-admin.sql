-- ==========================================================
-- supabase-admin.sql  (ORDRE D'EXÉCUTION : 3 sur 3, à la fin)
-- Donne le rôle "admin" à UN utilisateur existant.
--
-- Étapes :
--  1. Créez d'abord un compte depuis le site (signup.html) et confirmez l'e-mail.
--  2. Supabase > Authentication > Users : copiez l'UUID de cet utilisateur.
--  3. Remplacez VOTRE-UUID ci-dessous (en gardant les apostrophes), puis Run.
--
-- Cette opération se fait UNIQUEMENT ici, jamais depuis le navigateur.
-- ==========================================================
insert into public.user_roles (user_id, role)
values ('VOTRE-UUID', 'admin')
on conflict (user_id) do update set role = 'admin';

-- Pour retirer le rôle admin plus tard :
-- delete from public.user_roles where user_id = 'VOTRE-UUID';
