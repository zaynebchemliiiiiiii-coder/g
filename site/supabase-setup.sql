-- ==========================================================
-- supabase-setup.sql  (ORDRE D'EXÉCUTION : 1 sur 3)
-- Catalogue "products", rôles "user_roles", sécurité RLS, produits d'exemple.
--
-- ⚠ À lancer sur un projet Supabase NEUF (ou sans tables "products"/"user_roles").
-- Si ces tables existent déjà : NE LANCEZ PAS ce fichier. Faites une migration
-- séparée après avoir examiné leur schéma. Ce script ne supprime aucune donnée.
-- Lancez-le dans Supabase > SQL Editor > New query > Run.
-- ==========================================================

-- ----- Table des produits (prix en centimes : 550 = 5,50 DT) -----
create table if not exists public.products (
  id           text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  name         text not null check (length(name) between 1 and 150),
  category     text not null check (category in ('sans-gluten', 'sans-sucre')),
  description  text not null,
  price_cents  integer not null check (price_cents > 0 and price_cents <= 1000000),
  image        text not null check (image ~ '^(images/[A-Za-z0-9_.-]+|https://[^ ]+)$'),
  features     text[] not null default '{}',
  available    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ----- Rôles : l'absence de ligne = compte client. Seul "admin" existe. -----
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role    text not null check (role = 'admin')
);

-- ----- Fonction utilisée par les règles : l'utilisateur courant est-il admin ? -----
-- SECURITY DEFINER pour lire user_roles sans boucle de règles ; search_path vide.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ----- Droits SQL + RLS -----
alter table public.products   enable row level security;
alter table public.user_roles enable row level security;

revoke all on public.products   from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;  -- limité aux admins par les règles ci-dessous
grant select on public.user_roles to authenticated;                -- aucune écriture depuis le navigateur

-- Produits : tout le monde lit les produits disponibles ; l'admin lit et gère tout.
drop policy if exists products_public_read  on public.products;
drop policy if exists products_admin_read   on public.products;
drop policy if exists products_admin_insert on public.products;
drop policy if exists products_admin_update on public.products;
drop policy if exists products_admin_delete on public.products;
create policy products_public_read  on public.products for select to anon, authenticated using (available);
create policy products_admin_read   on public.products for select to authenticated using (public.is_admin());
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());

-- Rôles : chacun lit uniquement son propre rôle. Aucune règle d'écriture = écriture impossible.
drop policy if exists user_roles_read_own on public.user_roles;
create policy user_roles_read_own on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

-- ----- Produits d'EXEMPLE (mêmes que catalog.js) : remplacez-les par les vôtres -----
insert into public.products (id, name, category, description, price_cents, image, features) values
 ('pates-riz-complet', 'Pâtes de riz complet', 'sans-gluten', 'Des pâtes à base de riz complet, une alternative sans gluten aux pâtes de blé.', 550, 'images/pates-riz-complet.svg', array['Sans gluten','À base de riz complet','Cuisson à l’eau bouillante']),
 ('farine-sarrasin', 'Farine de sarrasin', 'sans-gluten', 'Une farine sans gluten pour vos crêpes, galettes et pains maison.', 890, 'images/farine-sarrasin.svg', array['Sans gluten','Pour pâtisserie et cuisine salée','Se conserve au sec']),
 ('pain-graines', 'Pain aux graines sans gluten', 'sans-gluten', 'Un pain moelleux aux graines, sans gluten, pour vos petits-déjeuners.', 750, 'images/pain-graines.svg', array['Sans gluten','Aux graines','À tartiner ou à toaster']),
 ('biscuits-avoine', 'Biscuits à l’avoine sans gluten', 'sans-gluten', 'Des biscuits à l’avoine sans gluten, à emporter avant ou après l’entraînement.', 990, 'images/biscuits-avoine.svg', array['Sans gluten','À l’avoine','Format à emporter']),
 ('pancakes-mix', 'Préparation pancakes sans gluten', 'sans-gluten', 'Une préparation prête à l’emploi pour des pancakes sans gluten.', 1450, 'images/pancakes-mix.svg', array['Sans gluten','Prête à l’emploi','Ajoutez simplement du liquide']),
 ('coffret-gluten', 'Coffret petit-déjeuner sans gluten', 'sans-gluten', 'Un coffret pour découvrir plusieurs produits sans gluten au petit-déjeuner.', 3900, 'images/coffret-gluten.svg', array['Sans gluten','Assortiment','Idée cadeau']),
 ('confiture-sans-sucre', 'Confiture de fruits rouges sans sucre ajouté', 'sans-sucre', 'Une confiture de fruits rouges sans sucre ajouté pour vos tartines.', 850, 'images/confiture-sans-sucre.svg', array['Sans sucre ajouté','Fruits rouges','Se conserve au frais après ouverture']),
 ('chocolat-noir', 'Chocolat noir sans sucre ajouté', 'sans-sucre', 'Une tablette de chocolat noir sans sucre ajouté pour les envies gourmandes.', 950, 'images/chocolat-noir.svg', array['Sans sucre ajouté','Chocolat noir','Format tablette']),
 ('barres-proteinees', 'Barres protéinées sans sucre ajouté', 'sans-sucre', 'Des barres protéinées sans sucre ajouté, pratiques dans le sac de sport.', 1200, 'images/barres-proteinees.svg', array['Sans sucre ajouté','Riche en protéines','Format à emporter']),
 ('granola', 'Granola sans sucre ajouté', 'sans-sucre', 'Un granola croustillant sans sucre ajouté, à servir avec du yaourt ou du lait.', 1590, 'images/granola.svg', array['Sans sucre ajouté','Céréales et graines','Pour le petit-déjeuner']),
 ('pate-tartiner', 'Pâte à tartiner noisette sans sucre ajouté', 'sans-sucre', 'Une pâte à tartiner à la noisette sans sucre ajouté.', 1800, 'images/pate-tartiner.svg', array['Sans sucre ajouté','Goût noisette','À tartiner']),
 ('coffret-sucre', 'Coffret découverte sans sucre ajouté', 'sans-sucre', 'Un coffret pour découvrir plusieurs produits sans sucre ajouté.', 4900, 'images/coffret-sucre.svg', array['Sans sucre ajouté','Assortiment','Idée cadeau'])
on conflict (id) do nothing;
