-- ==========================================================
-- supabase-orders.sql  (ORDRE D'EXÉCUTION : 2 sur 3, après supabase-setup.sql)
-- Table "orders", sécurité RLS et fonction create_demo_order.
-- Relançable sans danger : il ne supprime aucune commande.
-- ==========================================================

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  user_id         uuid not null references auth.users (id) on delete restrict,
  attempt_id      uuid not null,                      -- identifiant de tentative (anti-doublon)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  items           jsonb not null,                     -- instantané : id, nom, prix, quantité
  shipping        jsonb not null,                     -- coordonnées de livraison
  payment_method  text not null check (payment_method in ('carte-demo', 'livraison-demo')),
  subtotal_cents  integer not null check (subtotal_cents >= 0),
  shipping_cents  integer not null check (shipping_cents >= 0),
  total_cents     integer not null check (total_cents >= 0),
  status          text not null default 'nouvelle'
                  check (status in ('nouvelle', 'en_preparation', 'terminee', 'annulee')),
  unique (user_id, attempt_id)
);
create index if not exists orders_user_created_idx   on public.orders (user_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);

-- updated_at change à chaque modification : sert à détecter une modification concurrente.
create or replace function public.touch_orders_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.touch_orders_updated_at();

-- ----- Droits et RLS -----
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;   -- l'admin ne peut modifier QUE le statut

drop policy if exists orders_read_own_or_admin on public.orders;
drop policy if exists orders_admin_update      on public.orders;
create policy orders_read_own_or_admin on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Pas de règle INSERT : un client ne peut créer une commande que via create_demo_order.

-- ----- Création d'une commande de démonstration -----
-- Règles de livraison (identiques à script.js) : 7,00 DT, offerte dès 100,00 DT.
create or replace function public.create_demo_order(
  p_attempt_id uuid,
  p_items jsonb,
  p_shipping jsonb,
  p_payment text,
  p_expected_total_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());       -- le propriétaire vient de la session, jamais du navigateur
  v_order    public.orders;
  v_count    integer;
  v_matched  integer;
  v_subtotal integer;
  v_ship     integer;
  v_total    integer;
  v_snapshot jsonb;
  v_address  jsonb := '{}'::jsonb;
  v_key      text;
  v_val      text;
begin
  if v_uid is null then
    raise exception 'Connexion requise pour commander.';
  end if;
  if p_attempt_id is null then
    raise exception 'Tentative de commande invalide.';
  end if;

  -- Nouvelle tentative identique (erreur réseau) : on renvoie la commande déjà créée.
  select * into v_order from public.orders where user_id = v_uid and attempt_id = p_attempt_id;
  if found then
    return to_jsonb(v_order);
  end if;

  if p_payment is null or p_payment not in ('carte-demo', 'livraison-demo') then
    raise exception 'Moyen de paiement simulé invalide.';
  end if;

  -- Coordonnées de livraison : champs obligatoires, texte court.
  if p_shipping is null or jsonb_typeof(p_shipping) <> 'object' then
    raise exception 'Coordonnées de livraison invalides.';
  end if;
  foreach v_key in array array['first_name','last_name','email','phone','address','city','postal_code','country'] loop
    v_val := btrim(coalesce(p_shipping ->> v_key, ''));
    if v_val = '' or length(v_val) > 200 then
      raise exception 'Coordonnées de livraison incomplètes.';
    end if;
    v_address := v_address || jsonb_build_object(v_key, v_val);
  end loop;

  -- Produits : liste de 1 à 50 lignes {id, qty}, quantité de 1 à 20 par produit.
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Panier invalide.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Panier invalide.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e -> 'id') <> 'string' or coalesce(e ->> 'qty', '') !~ '^[0-9]{1,2}$'
  ) then
    raise exception 'Panier invalide.';
  end if;

  -- Prix lus dans le catalogue de la base, jamais dans le navigateur.
  with req as (
    select e ->> 'id' as id, sum((e ->> 'qty')::integer) as qty
    from jsonb_array_elements(p_items) e
    group by 1
  )
  select count(*), count(p.id),
         coalesce(sum(p.price_cents * r.qty), 0),
         jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'price_cents', p.price_cents, 'qty', r.qty) order by r.id),
         coalesce(min(r.qty), 0)
  into v_count, v_matched, v_subtotal, v_snapshot, v_total
  from req r left join public.products p on p.id = r.id and p.available;

  if v_matched <> v_count then
    raise exception 'Un produit du panier n’est plus disponible.';
  end if;
  if v_total < 1 or exists (select 1 from jsonb_array_elements(v_snapshot) s where (s ->> 'qty')::integer > 20) then
    raise exception 'Quantité invalide (1 à 20 par produit).';
  end if;

  v_ship  := case when v_subtotal >= 10000 then 0 else 700 end;
  v_total := v_subtotal + v_ship;

  if p_expected_total_cents is distinct from v_total then
    raise exception 'PRICE_CHANGED';
  end if;

  begin
    insert into public.orders (reference, user_id, attempt_id, items, shipping, payment_method,
                               subtotal_cents, shipping_cents, total_cents)
    values ('HL-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
            v_uid, p_attempt_id, v_snapshot, v_address, p_payment, v_subtotal, v_ship, v_total)
    returning * into v_order;
  exception when unique_violation then
    -- Deux envois simultanés de la même tentative : on renvoie celle qui a gagné.
    select * into v_order from public.orders where user_id = v_uid and attempt_id = p_attempt_id;
    if not found then
      raise;
    end if;
  end;

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.create_demo_order(uuid, jsonb, jsonb, text, integer) from public, anon;
grant execute on function public.create_demo_order(uuid, jsonb, jsonb, text, integer) to authenticated;
