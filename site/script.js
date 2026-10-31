/* ==========================================================
   script.js — interactions du site healthylifestyle
   Sections : Outils · Panier · Catalogue · Pages · Démarrage
   - Le panier est gardé dans le navigateur (localStorage).
   - Comptes et commandes passent par Supabase (supabase-shop.js).
   - Le paiement est une SIMULATION : aucune donnée bancaire.
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Réglages (à garder identiques à supabase-orders.sql) ---------- */
  const CFG = { shippingCents: 700, freeFromCents: 10000, maxQty: 20, cartKey: 'hl_cart', attemptKey: 'hl_attempt' };

  /* ---------- Outils ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (cents) => (cents / 100).toFixed(2).replace('.', ',') + ' DT';
  const fmtDate = (s) => new Date(s).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const STATUSES = { nouvelle: 'Nouvelle', en_preparation: 'En préparation', terminee: 'Terminée', annulee: 'Annulée' };
  const PAYMENTS = { 'carte-demo': 'Carte bancaire (démonstration)', 'livraison-demo': 'Paiement à la livraison (démonstration)' };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const Shop = () => window.Shop;
  const catName = (id) => (window.HL_CATEGORIES.find((c) => c.id === id) || {}).name || '';

  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2500);
  }
  function showError(form, msg) {
    const p = $('.form-error', form);
    p.textContent = msg; p.hidden = !msg;
    if (msg) p.scrollIntoView({ block: 'center' });
  }
  function configWarning() {
    const m = $('main');
    if (m && !$('#cfg-warning')) {
      m.insertAdjacentHTML('afterbegin', '<div class="wrap"><div class="note warn" id="cfg-warning"><p><strong>Comptes et commandes non configurés.</strong> Renseignez Supabase dans <code>supabase-client.js</code> (voir SUPABASE.md).</p></div></div>');
    }
  }
  function safeNext() {
    const n = new URLSearchParams(location.search).get('next');
    return /^[a-z-]+\.html$/.test(n || '') ? n : null;
  }

  /* ---------- Panier (stocke seulement id + quantité ; prix relus dans le catalogue) ---------- */
  function getCart() {
    try {
      const c = JSON.parse(localStorage.getItem(CFG.cartKey) || '[]');
      return Array.isArray(c) ? c.filter((i) => i && typeof i.id === 'string' && i.qty > 0) : [];
    } catch (e) { return []; }
  }
  function saveCart(c) {
    try { localStorage.setItem(CFG.cartKey, JSON.stringify(c)); } catch (e) { /* stockage indisponible */ }
    updateCartCount();
  }
  function addToCart(id, n) {
    const c = getCart(); const it = c.find((i) => i.id === id);
    if (it) it.qty = Math.min(CFG.maxQty, it.qty + (n || 1)); else c.push({ id, qty: Math.min(CFG.maxQty, n || 1) });
    saveCart(c);
  }
  function setQty(id, qty) {
    const c = getCart(); const it = c.find((i) => i.id === id);
    if (!it) return;
    it.qty = Math.max(1, Math.min(CFG.maxQty, qty)); saveCart(c);
  }
  function removeFromCart(id) { saveCart(getCart().filter((i) => i.id !== id)); }
  function cartCount() { return getCart().reduce((n, i) => n + i.qty, 0); }
  function updateCartCount() { const b = $('#cart-count'); if (b) { b.textContent = cartCount(); } }
  // Règle de livraison unique pour panier et checkout.
  function calculateCartTotal(lines) {
    const subtotal = lines.reduce((s, l) => s + l.line, 0);
    const shipping = subtotal === 0 || subtotal >= CFG.freeFromCents ? 0 : CFG.shippingCents;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  /* ---------- Catalogue ---------- */
  let catalogPromise;
  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = (async () => {
        const S = Shop();
        if (S && S.isConfigured()) {
          try { return await S.fetchProducts(); } catch (e) { console.warn(e); toast('Catalogue en ligne indisponible : produits d’exemple affichés.'); }
        }
        return window.HL_FALLBACK_PRODUCTS;
      })();
    }
    return catalogPromise;
  }
  async function cartLines() {
    const list = await loadCatalog();
    const map = new Map(list.map((p) => [p.id, p]));
    return getCart().map((i) => { const p = map.get(i.id); return p && p.available !== false ? { p, qty: i.qty, line: p.price_cents * i.qty } : null; }).filter(Boolean);
  }

  /* ---------- Gabarits HTML ---------- */
  function productCard(p) {
    const href = 'produit.html?id=' + encodeURIComponent(p.id);
    return `<article class="card">
      <a class="card-img" href="${href}"><img src="${esc(p.image)}" alt="Illustration du produit : ${esc(p.name)}" loading="lazy" width="400" height="300"></a>
      <div class="card-body"><h3><a href="${href}">${esc(p.name)}</a></h3>
        <p>${esc(p.description)}</p>
        <div class="card-foot"><span class="price">${money(p.price_cents)}</span>
          <a class="btn btn-ghost" href="${href}">Voir le produit</a>
          <button class="btn" type="button" data-add="${esc(p.id)}">Ajouter au panier</button></div></div></article>`;
  }
  function adviceCard(a) {
    const href = 'produit.html?id=' + encodeURIComponent(a.id);
    return `<article class="card">
      <a class="card-img" href="${href}"><img src="${esc(a.image)}" alt="Illustration du conseil : ${esc(a.name)}" loading="lazy" width="400" height="300"></a>
      <div class="card-body"><h3><a href="${href}">${esc(a.name)}</a></h3><p>${esc(a.description)}</p>
        <div class="card-foot"><span class="free">Gratuit</span><a class="btn btn-ghost" href="${href}">Lire le conseil</a></div></div></article>`;
  }
  function catCard(c) {
    return `<a class="cat-card" href="${c.file}"><img src="${esc(c.image)}" alt="Illustration de la catégorie ${esc(c.name)}" loading="lazy" width="600" height="400">
      <div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p><span class="btn btn-ghost">Découvrir</span></div></a>`;
  }
  const emptyMsg = (t) => `<div class="note"><p>${t}</p></div>`;

  function orderCard(o) {
    const n = (o.items || []).reduce((s, i) => s + i.qty, 0);
    return `<article class="ord"><div class="ord-head"><strong>${esc(o.reference)}</strong><span>${esc(fmtDate(o.created_at))}</span>
      <span>${n} article${n > 1 ? 's' : ''}</span><span>${money(o.total_cents)}</span><span class="status">${esc(STATUSES[o.status] || o.status)}</span></div>
      <details><summary>Voir le détail</summary>${orderDetailHTML(o)}</details></article>`;
  }
  function orderDetailHTML(o) {
    const s = o.shipping || {};
    const items = (o.items || []).map((i) => `<li>${esc(i.name)} × ${i.qty} : ${money(i.price_cents * i.qty)}</li>`).join('');
    return `<ul class="plain">${items}</ul>
      <p>Sous-total : ${money(o.subtotal_cents)}</p>
      <p>Livraison : ${o.shipping_cents ? money(o.shipping_cents) : 'Offerte'}</p>
      <p><strong>Total : ${money(o.total_cents)}</strong></p>
      <p>Livraison à ${esc(s.first_name)} ${esc(s.last_name)}, ${esc(s.address)}, ${esc(s.postal_code)} ${esc(s.city)}, ${esc(s.country)}.</p>
      <p>Contact : ${esc(s.phone)}, ${esc(s.email)}</p>
      <p>Paiement : ${esc(PAYMENTS[o.payment_method] || o.payment_method)}. Aucun paiement réel.</p>`;
  }
  window.HL = { esc, money, fmtDate, STATUSES, PAYMENTS, orderDetailHTML, emailOk };

  /* ---------- Pages ---------- */
  function sampleByCategory(list, perCat) {
    const out = [];
    ['sans-gluten', 'sans-sucre'].forEach((c) => out.push(...list.filter((p) => p.category === c).slice(0, perCat)));
    return out;
  }

  async function pageHome() {
    $('#home-cats').innerHTML = window.HL_CATEGORIES.map(catCard).join('');
    $('#home-advice').innerHTML = window.HL_ADVICE.slice(0, 3).map(adviceCard).join('');
    const list = await loadCatalog();
    $('#home-products').innerHTML = sampleByCategory(list, 2).map(productCard).join('') || emptyMsg('Aucun produit disponible pour le moment.');
  }

  async function pageProducts() {
    $('#cat-grid').innerHTML = window.HL_CATEGORIES.map(catCard).join('');
    const list = await loadCatalog();
    const grid = $('#product-grid'), count = $('#result-count'), q = $('#search');
    let filter = 'all';
    function draw() {
      const term = q.value.trim().toLowerCase();
      const rows = list.filter((p) => (filter === 'all' || p.category === filter) && (!term || (p.name + ' ' + p.description).toLowerCase().includes(term)));
      grid.innerHTML = rows.map(productCard).join('') || emptyMsg('Aucun produit ne correspond à votre recherche.');
      count.textContent = rows.length + ' produit' + (rows.length > 1 ? 's' : '');
    }
    $$('.filters button').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      $$('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
    q.addEventListener('input', draw);
    draw();
  }

  async function pageCategory() {
    const id = document.body.dataset.category;
    const grid = $('#cat-items');
    if (id === 'conseils') grid.innerHTML = window.HL_ADVICE.map(adviceCard).join('');
    else {
      const list = (await loadCatalog()).filter((p) => p.category === id);
      grid.innerHTML = list.map(productCard).join('') || emptyMsg('Cette catégorie ne contient aucun produit pour le moment.');
    }
    $('#see-also').innerHTML = window.HL_CATEGORIES.filter((c) => c.id !== id).map(catCard).join('');
  }

  async function pageDetail() {
    const id = new URLSearchParams(location.search).get('id');
    const root = $('#detail'), crumbs = $('#crumbs-last');
    const advice = window.HL_ADVICE.find((a) => a.id === id);
    if (advice) {
      document.title = advice.name + ' | healthylifestyle';
      $('#crumbs-mid').innerHTML = '<a href="categorie-conseils.html">Conseils gratuits</a>';
      crumbs.textContent = advice.name;
      root.innerHTML = `<img src="${esc(advice.image)}" alt="Illustration du conseil : ${esc(advice.name)}" width="400" height="300">
        <div><h1>${esc(advice.name)}</h1><p class="free">Conseil gratuit</p>${advice.body.map((t) => `<p>${esc(t)}</p>`).join('')}
        <p class="muted">Ces informations sont générales et ne remplacent pas l’avis d’un professionnel de santé.</p>
        <div class="buy"><a class="btn" href="contact.html">Poser une question</a><a class="btn btn-ghost" href="categorie-conseils.html">Tous les conseils</a></div></div>`;
      return;
    }
    const p = (await loadCatalog()).find((x) => x.id === id);
    if (!p) { root.innerHTML = emptyMsg('Produit introuvable. <a href="produits.html">Voir tous les produits</a>'); $('#crumbs-mid').hidden = true; crumbs.textContent = 'Introuvable'; return; }
    const cat = window.HL_CATEGORIES.find((c) => c.id === p.category);
    document.title = p.name + ' | healthylifestyle';
    $('#crumbs-mid').innerHTML = cat ? `<a href="${cat.file}">${esc(cat.name)}</a>` : '';
    crumbs.textContent = p.name;
    root.innerHTML = `<img src="${esc(p.image)}" alt="Illustration du produit : ${esc(p.name)}" width="400" height="300">
      <div><h1>${esc(p.name)}</h1><p class="price">${money(p.price_cents)}</p><p>${esc(p.description)}</p>
      ${p.features.length ? `<h2>Caractéristiques</h2><ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      <div class="buy"><button class="btn" type="button" data-add="${esc(p.id)}">Ajouter au panier</button><a class="btn btn-ghost" href="panier.html">Voir mon panier</a></div></div>`;
  }

  async function pagePanier() {
    const root = $('#cart-root');
    async function draw() {
      const lines = await cartLines();
      if (!lines.length) {
        root.innerHTML = `<div class="note"><p><strong>Votre panier est vide.</strong></p><a class="btn" href="produits.html">Découvrir nos produits</a></div>`;
        return;
      }
      const t = calculateCartTotal(lines);
      root.innerHTML = `<div class="two"><ul class="plain">${lines.map((l) => `
        <li class="cart-line"><img src="${esc(l.p.image)}" alt="Illustration du produit : ${esc(l.p.name)}" width="84" height="63">
          <div><h3><a href="produit.html?id=${encodeURIComponent(l.p.id)}">${esc(l.p.name)}</a></h3><p class="muted">${esc(catName(l.p.category))}</p><p>${money(l.p.price_cents)} l’unité</p></div>
          <div class="qty" role="group" aria-label="Quantité de ${esc(l.p.name)}">
            <button type="button" data-dec="${esc(l.p.id)}" aria-label="Retirer une unité">−</button><output>${l.qty}</output>
            <button type="button" data-inc="${esc(l.p.id)}" aria-label="Ajouter une unité">+</button></div>
          <p class="line-total">${money(l.line)}</p>
          <div class="del"><button type="button" class="link-btn" data-del="${esc(l.p.id)}">Supprimer</button></div></li>`).join('')}</ul>
        <aside class="summary" aria-label="Résumé de la commande"><h2>Résumé</h2>
          <div class="sum-row"><span>Sous-total</span><span>${money(t.subtotal)}</span></div>
          <div class="sum-row"><span>Livraison</span><span>${t.shipping ? money(t.shipping) : 'Offerte'}</span></div>
          <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
          <p class="muted">Livraison ${money(CFG.shippingCents)}, offerte à partir de ${money(CFG.freeFromCents)}.</p>
          <a class="btn" href="checkout.html">Passer à la commande</a></aside></div>`;
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const cart = getCart();
      if (b.dataset.inc) setQty(b.dataset.inc, ((cart.find((i) => i.id === b.dataset.inc) || {}).qty || 0) + 1);
      else if (b.dataset.dec) setQty(b.dataset.dec, ((cart.find((i) => i.id === b.dataset.dec) || {}).qty || 2) - 1);
      else if (b.dataset.del) removeFromCart(b.dataset.del);
      else return;
      draw();
    });
    draw();
  }

  /* Protection d'une page par la session. ⚠ Ce n'est PAS la sécurité : la vraie
     protection est dans les règles RLS de la base. */
  async function requireUser(next) {
    const S = Shop();
    if (!S || !S.isConfigured()) { configWarning(); return null; }
    const u = await S.getUser();
    if (!u) { location.replace('login.html?next=' + encodeURIComponent(next)); return null; }
    return u;
  }

  async function pageCheckout() {
    const user = await requireUser('checkout.html'); if (!user) return;
    const lines = await cartLines();
    if (!lines.length) { location.replace('panier.html'); return; }
    const form = $('#checkout-form'), t = calculateCartTotal(lines), meta = user.user_metadata || {};
    form.hidden = false;
    form.first_name.value = meta.first_name || ''; form.last_name.value = meta.last_name || ''; form.email.value = user.email || '';
    $('#order-summary').innerHTML = `<ul class="plain">${lines.map((l) => `<li><span>${esc(l.p.name)} × ${l.qty}</span><span>${money(l.line)}</span></li>`).join('')}</ul>
      <div class="sum-row"><span>Sous-total</span><span>${money(t.subtotal)}</span></div>
      <div class="sum-row"><span>Livraison</span><span>${t.shipping ? money(t.shipping) : 'Offerte'}</span></div>
      <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
      <p class="muted">Livraison ${money(CFG.shippingCents)}, offerte à partir de ${money(CFG.freeFromCents)}. Le total est recalculé par la base de données.</p>`;

    // Identifiant de tentative : réutilisé après une erreur réseau pour éviter un doublon.
    const sig = JSON.stringify(getCart());
    function attemptId() {
      let a; try { a = JSON.parse(localStorage.getItem(CFG.attemptKey)); } catch (e) { a = null; }
      if (!a || a.sig !== sig) { a = { id: crypto.randomUUID(), sig }; localStorage.setItem(CFG.attemptKey, JSON.stringify(a)); }
      return a.id;
    }
    let busy = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (busy) return;
      const f = Object.fromEntries(new FormData(form).entries());
      const need = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'postal_code', 'country'];
      if (need.some((k) => !String(f[k] || '').trim())) return showError(form, 'Remplissez tous les champs de livraison.');
      if (!emailOk(f.email)) return showError(form, 'Adresse e-mail invalide.');
      if (!/^[+\d\s().-]{8,20}$/.test(f.phone)) return showError(form, 'Numéro de téléphone invalide.');
      if (!PAYMENTS[f.payment]) return showError(form, 'Choisissez un moyen de paiement simulé.');
      showError(form, '');
      busy = true; const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Enregistrement…';
      try {
        const shipping = {}; need.forEach((k) => { shipping[k] = f[k].trim(); });
        const order = await Shop().createOrder({
          attemptId: attemptId(), items: getCart().map((i) => ({ id: i.id, qty: i.qty })),
          shipping, payment: f.payment, expectedTotalCents: t.total
        });
        saveCart([]); localStorage.removeItem(CFG.attemptKey);       // vidé seulement après succès confirmé
        location.href = 'confirmation.html?ref=' + encodeURIComponent(order.reference);
      } catch (err) {
        showError(form, err.message === 'PRICE_CHANGED' ? 'Un prix a changé depuis l’ajout au panier. Actualisez la page et vérifiez le nouveau total.' : err.message);
        busy = false; btn.disabled = false; btn.textContent = 'Simuler le paiement';
      }
    });
  }

  async function pageConfirmation() {
    const user = await requireUser('confirmation.html' ); if (!user) return;
    const ref = new URLSearchParams(location.search).get('ref'), root = $('#conf-root');
    try {
      const o = ref ? await Shop().fetchOrderByRef(ref) : null;
      if (!o) { root.innerHTML = emptyMsg('Commande introuvable. <a href="compte.html">Voir mon compte</a>'); return; }
      root.innerHTML = `<h1>Merci pour votre commande !</h1>
        <p>Commande <strong>${esc(o.reference)}</strong> enregistrée le ${esc(fmtDate(o.created_at))}. Il s’agit d’une démonstration.</p>
        <div class="note warn"><p><strong>Aucun paiement réel n’a été effectué.</strong></p></div>
        <div class="ord">${orderDetailHTML(o)}</div>
        <p><a class="btn" href="index.html">Retour à l’accueil</a> <a class="btn btn-ghost" href="compte.html">Voir mon compte</a></p>`;
    } catch (e) { root.innerHTML = emptyMsg(esc(e.message)); }
  }

  async function pageCompte() {
    const user = await requireUser('compte.html'); if (!user) return;
    const meta = user.user_metadata || {};
    $('#acc-root').hidden = false;
    $('#acc-hello').textContent = 'Bonjour, ' + (meta.first_name || user.email);
    $('#acc-info').innerHTML = `<p>Prénom : ${esc(meta.first_name || 'non renseigné')}</p><p>Nom : ${esc(meta.last_name || 'non renseigné')}</p>
      <p>E-mail : ${esc(user.email)}</p><p>Adresse e-mail confirmée : ${user.email_confirmed_at ? 'oui' : 'non'}</p>`;
    $('#logout').addEventListener('click', async () => { await Shop().signOut(); location.href = 'index.html'; });
    try {
      const orders = await Shop().fetchMyOrders(100);
      $('#acc-orders').innerHTML = (orders.length ? orders.map(orderCard).join('') : emptyMsg('Vous n’avez pas encore passé de commande.'))
        + (orders.length >= 100 ? '<p class="muted">Seules vos 100 dernières commandes sont affichées.</p>' : '');
    } catch (e) { $('#acc-orders').innerHTML = emptyMsg(esc(e.message)); }
  }

  function pageLogin() {
    const form = $('#login-form'), next = safeNext();
    if (!Shop() || !Shop().isConfigured()) configWarning();
    if (next) $('#signup-link').href = 'signup.html?next=' + encodeURIComponent(next);
    $('#forgot').addEventListener('click', () => toast('La récupération du mot de passe n’est pas disponible pour le moment.'));
    Shop().getUser().then((u) => { if (u) location.replace(next || 'compte.html'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim(), pw = form.password.value;
      if (!emailOk(email) || !pw) return showError(form, 'Saisissez une adresse e-mail valide et votre mot de passe.');
      const btn = $('button[type=submit]', form); btn.disabled = true; showError(form, '');
      try { await Shop().signIn(email, pw); location.href = next || 'compte.html'; }
      catch (err) { showError(form, err.message); btn.disabled = false; }
    });
  }

  function pageSignup() {
    const form = $('#signup-form'), next = safeNext();
    if (!Shop() || !Shop().isConfigured()) configWarning();
    if (next) $('#login-link').href = 'login.html?next=' + encodeURIComponent(next);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = { firstName: form.first_name.value.trim(), lastName: form.last_name.value.trim(), email: form.email.value.trim(), password: form.password.value };
      if (!v.firstName || !v.lastName) return showError(form, 'Saisissez votre prénom et votre nom.');
      if (!emailOk(v.email)) return showError(form, 'Adresse e-mail invalide.');
      if (v.password.length < 8) return showError(form, 'Le mot de passe doit contenir au moins 8 caractères.');
      if (v.password !== form.password2.value) return showError(form, 'Les deux mots de passe ne correspondent pas.');
      if (!form.terms.checked) return showError(form, 'Acceptez les conditions pour continuer.');
      const btn = $('button[type=submit]', form); btn.disabled = true; showError(form, '');
      try {
        const r = await Shop().signUp(v);
        location.href = r.needsConfirmation ? 'verification.html?email=' + encodeURIComponent(v.email) + (next ? '&next=' + encodeURIComponent(next) : '') : (next || 'compte.html');
      } catch (err) { showError(form, err.message); btn.disabled = false; }
    });
  }

  function pageVerification() {
    const email = new URLSearchParams(location.search).get('email') || '';
    $('#verif-email').textContent = email || 'votre adresse e-mail';
    const next = safeNext();
    if (next) $('#verif-login').href = 'login.html?next=' + encodeURIComponent(next);
    $('#resend').addEventListener('click', async (e) => {
      if (!emailOk(email)) return toast('Adresse inconnue : recommencez l’inscription.');
      e.target.disabled = true;
      try { await Shop().resendConfirmation(email); toast('Nouvelle demande envoyée.'); }
      catch (err) { toast(err.message); }
      setTimeout(() => { e.target.disabled = false; }, 30000);
    });
  }

  function pageContact() {
    const form = $('#contact-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.name.value.trim() || !emailOk(form.email.value.trim()) || !form.message.value.trim()) return showError(form, 'Renseignez votre nom, une adresse e-mail valide et votre message.');
      showError(form, ''); form.reset();
      $('#contact-ok').hidden = false;
    });
  }

  /* ---------- Démarrage ---------- */
  async function refreshHeader() {
    updateCartCount();
    const S = Shop(); if (!S || !S.isConfigured()) return;
    const u = await S.getUser(), a = $('#account-link');
    if (u) { a.href = 'compte.html'; a.textContent = 'Mon compte'; $('#admin-link').hidden = !(await S.isAdmin(u)); }
    else { a.href = 'login.html'; a.textContent = 'Compte'; $('#admin-link').hidden = true; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('.menu-btn'), nav = $('#nav');
    btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      addToCart(b.dataset.add, 1); toast('Ajouté au panier');
    });
    refreshHeader();
    if (Shop()) Shop().onAuthChange(refreshHeader);
    const pages = { home: pageHome, produits: pageProducts, category: pageCategory, detail: pageDetail, panier: pagePanier, checkout: pageCheckout,
      confirmation: pageConfirmation, compte: pageCompte, login: pageLogin, signup: pageSignup, verification: pageVerification, contact: pageContact };
    const run = pages[document.body.dataset.page];
    if (run) run();
  });
})();
