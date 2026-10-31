/* ==========================================================
   supabase-shop.js — tout l'accès à Supabase (auth, catalogue,
   commandes, admin). Les autres fichiers appellent window.Shop.
   La sécurité réelle est dans la base (RLS), pas ici.
   ========================================================== */
(function () {
  'use strict';
  const sb = window.hlSupabase || null;

  function need() {
    if (!sb) throw new Error('Supabase n’est pas configuré. Voir SUPABASE.md.');
    return sb;
  }

  // Transforme une erreur technique en message compréhensible.
  function friendly(e, fallback) {
    const m = (e && e.message) || '';
    if (/PRICE_CHANGED/.test(m)) return 'PRICE_CHANGED';
    if (/Invalid login/i.test(m)) return 'E-mail ou mot de passe incorrect.';
    if (/not confirmed/i.test(m)) return 'Adresse e-mail pas encore confirmée. Ouvrez le message de confirmation reçu par e-mail.';
    if (/already registered|already been registered/i.test(m)) return 'Cette adresse e-mail est déjà utilisée.';
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Connexion impossible. Vérifiez votre réseau puis réessayez.';
    if (/row-level security|permission denied/i.test(m)) return 'Action non autorisée avec ce compte.';
    if (/duplicate key/i.test(m)) return 'Cet identifiant existe déjà.';
    return fallback || m || 'Une erreur est survenue.';
  }
  function check(res, fallback) {
    if (res.error) throw new Error(friendly(res.error, fallback));
    return res.data;
  }
  const redirectTo = () => new URL('login.html', location.href).href; // fonctionne en localhost et sur Vercel

  const Shop = {
    isConfigured: () => !!sb,

    /* ----- Authentification ----- */
    async getUser() {
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      const res = await sb.auth.getUser();      // vérifie la session auprès de Supabase
      return res.error ? null : res.data.user;
    },
    onAuthChange(cb) { if (sb) sb.auth.onAuthStateChange(() => cb()); },
    async signUp({ email, password, firstName, lastName }) {
      const res = await need().auth.signUp({
        email, password,
        options: { emailRedirectTo: redirectTo(), data: { first_name: firstName, last_name: lastName } }
      });
      if (res.error) throw new Error(friendly(res.error, 'Inscription impossible.'));
      const u = res.data.user;
      // Supabase renvoie un utilisateur sans "identities" si l'adresse existe déjà.
      if (u && Array.isArray(u.identities) && u.identities.length === 0) throw new Error('Cette adresse e-mail est déjà utilisée.');
      return { needsConfirmation: !res.data.session };
    },
    async resendConfirmation(email) {
      const res = await need().auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo() } });
      if (res.error) throw new Error(friendly(res.error, 'Envoi impossible.'));
    },
    async signIn(email, password) {
      const res = await need().auth.signInWithPassword({ email, password });
      if (res.error) throw new Error(friendly(res.error, 'Connexion impossible.'));
      return res.data.user;
    },
    async signOut() { if (sb) await sb.auth.signOut(); },
    async isAdmin(user) {
      if (!sb || !user) return false;
      const res = await sb.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      return !res.error && !!res.data && res.data.role === 'admin';
    },

    /* ----- Catalogue ----- */
    async fetchProducts() {
      const res = await need().from('products').select('*').eq('available', true)
        .order('category').order('price_cents');
      return check(res, 'Catalogue indisponible.').map(normalize);
    },

    /* ----- Commandes client ----- */
    async createOrder({ attemptId, items, shipping, payment, expectedTotalCents }) {
      const res = await need().rpc('create_demo_order', {
        p_attempt_id: attemptId, p_items: items, p_shipping: shipping,
        p_payment: payment, p_expected_total_cents: expectedTotalCents
      });
      // Les messages de la fonction SQL (code P0001) sont déjà en français et explicites.
      if (res.error && res.error.code === 'P0001' && !/PRICE_CHANGED/.test(res.error.message)) throw new Error(res.error.message);
      return check(res, 'La commande n’a pas pu être enregistrée.');
    },
    async fetchMyOrders(limit = 100) {
      const res = await need().from('orders').select('*').order('created_at', { ascending: false }).limit(limit);
      return check(res, 'Impossible de charger vos commandes.');
    },
    async fetchOrderByRef(ref) {
      const res = await need().from('orders').select('*').eq('reference', ref).maybeSingle();
      return check(res, 'Commande introuvable.');
    },

    /* ----- Administration (le rôle est revérifié par la base) ----- */
    async adminOrders({ status, from, to }) {
      let q = need().from('orders').select('*').order('created_at', { ascending: false }).range(from, to);
      if (status) q = q.eq('status', status);
      return check(await q, 'Impossible de charger les commandes.');
    },
    // Ne modifie que si la commande n'a pas changé depuis son chargement (updated_at).
    async adminSetStatus(id, status, expectedUpdatedAt) {
      const res = await need().from('orders').update({ status })
        .eq('id', id).eq('updated_at', expectedUpdatedAt).select('id,status,updated_at');
      const rows = check(res, 'Statut non enregistré.');
      return rows && rows.length ? rows[0] : null; // null = modification concurrente
    },
    async adminProducts() {
      const res = await need().from('products').select('*').order('created_at', { ascending: false });
      return check(res, 'Impossible de charger les produits.').map(normalize);
    },
    async adminSaveProduct(isNew, p) {
      const row = { name: p.name, category: p.category, description: p.description, price_cents: p.price_cents,
        image: p.image, features: p.features, available: p.available };
      const res = isNew
        ? await need().from('products').insert({ id: p.id, ...row })
        : await need().from('products').update(row).eq('id', p.id);
      check(res, 'Produit non enregistré.');
    },
    async adminDeleteProduct(id) {
      check(await need().from('products').delete().eq('id', id), 'Suppression impossible.');
    }
  };

  function normalize(p) { return { ...p, features: Array.isArray(p.features) ? p.features : [] }; }
  window.Shop = Shop;
})();
