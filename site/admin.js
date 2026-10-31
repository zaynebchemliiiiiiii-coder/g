/* ==========================================================
   admin.js — page d'administration (commandes + produits)
   Cette page est cachée aux clients, mais la VRAIE protection
   est dans la base : sans rôle admin, Supabase refuse les actions.
   ========================================================== */
(function () {
  'use strict';
  const { esc, money, fmtDate, STATUSES, orderDetailHTML } = window.HL;
  const $ = (s, r = document) => r.querySelector(s);
  const PAGE = 50;
  let offset = 0, busy = false, products = [];

  function say(el, text, ok) { el.textContent = text; el.className = ok ? 'form-ok' : 'form-error'; el.hidden = !text; }

  async function init() {
    const gate = $('#adm-gate'), S = window.Shop;
    if (!S || !S.isConfigured()) { gate.innerHTML = '<div class="note warn"><p>Supabase n’est pas configuré (voir SUPABASE.md).</p></div>'; return; }
    const user = await S.getUser();
    if (!user) { gate.innerHTML = '<div class="note warn"><p>Connectez-vous pour accéder à cette page. <a href="login.html?next=admin.html">Se connecter</a></p></div>'; return; }
    if (!(await S.isAdmin(user))) { gate.innerHTML = '<div class="note warn"><p><strong>Page réservée à l’administrateur.</strong> Votre compte est un compte client : rendez-vous sur <a href="compte.html">Mon compte</a>.</p></div>'; return; }
    gate.hidden = true; $('#adm-main').hidden = false;
    $('#ord-refresh').addEventListener('click', () => loadOrders(true));
    $('#ord-filter').addEventListener('change', () => loadOrders(true));
    $('#ord-more').addEventListener('click', () => loadOrders(false));
    $('#ord-list').addEventListener('click', saveStatus);
    $('#prod-form').addEventListener('submit', saveProduct);
    $('#prod-new').addEventListener('click', () => fillForm(null));
    $('#prod-list').addEventListener('click', productAction);
    loadOrders(true); loadProducts();
  }

  /* ----- Commandes ----- */
  function orderRow(o) {
    const s = o.shipping || {};
    const opts = Object.keys(STATUSES).map((k) => `<option value="${k}"${k === o.status ? ' selected' : ''}>${STATUSES[k]}</option>`).join('');
    return `<article class="ord" data-id="${esc(o.id)}" data-updated="${esc(o.updated_at)}">
      <div class="ord-head"><strong>${esc(o.reference)}</strong><span>${esc(fmtDate(o.created_at))}</span>
        <span>${esc(s.first_name)} ${esc(s.last_name)}</span><span>${money(o.total_cents)}</span><span class="status">${esc(STATUSES[o.status] || o.status)}</span></div>
      <details><summary>Voir le détail</summary>${orderDetailHTML(o)}</details>
      <div class="ord-status"><label>Statut <select aria-label="Statut de la commande ${esc(o.reference)}">${opts}</select></label>
        <button type="button" class="btn btn-ghost" data-save>Enregistrer le statut</button><span class="form-ok" role="status" hidden></span></div></article>`;
  }
  async function loadOrders(reset) {
    if (busy) return; busy = true;
    const list = $('#ord-list'), msg = $('#ord-msg'), more = $('#ord-more');
    if (reset) { offset = 0; list.innerHTML = ''; }
    say(msg, 'Chargement…', true);
    try {
      const rows = await window.Shop.adminOrders({ status: $('#ord-filter').value, from: offset, to: offset + PAGE - 1 });
      list.insertAdjacentHTML('beforeend', rows.map(orderRow).join(''));
      offset += rows.length;
      more.hidden = rows.length < PAGE;
      say(msg, !list.children.length ? 'Aucune commande pour ce filtre.' : '', true);
    } catch (e) { say(msg, e.message, false); }
    busy = false;
  }
  async function saveStatus(e) {
    const b = e.target.closest('[data-save]'); if (!b || b.disabled) return;
    const card = b.closest('.ord'), out = $('[role=status]', card), sel = $('select', card);
    b.disabled = true; out.hidden = true;
    try {
      const row = await window.Shop.adminSetStatus(card.dataset.id, sel.value, card.dataset.updated);
      if (!row) { out.className = 'form-error'; out.textContent = 'Cette commande a été modifiée ailleurs. Cliquez sur Actualiser.'; }
      else { card.dataset.updated = row.updated_at; $('.status', card).textContent = STATUSES[row.status]; out.className = 'form-ok'; out.textContent = 'Statut enregistré.'; }
    } catch (err) { out.className = 'form-error'; out.textContent = err.message; }
    out.hidden = false; b.disabled = false;
  }

  /* ----- Produits ----- */
  async function loadProducts() {
    const list = $('#prod-list');
    try {
      products = await window.Shop.adminProducts();
      list.innerHTML = products.map((p) => `<div class="prod-row"><span>${esc(p.name)}</span><span>${esc(p.category)}</span><span>${money(p.price_cents)}</span>
        <span>${p.available ? 'Visible' : 'Masqué'}</span>
        <button type="button" class="btn btn-ghost" data-edit="${esc(p.id)}">Modifier</button>
        <button type="button" class="btn btn-ghost" data-del="${esc(p.id)}">Supprimer</button></div>`).join('') || '<div class="note"><p>Aucun produit enregistré.</p></div>';
    } catch (e) { list.innerHTML = `<div class="note"><p>${esc(e.message)}</p></div>`; }
  }
  function fillForm(p) {
    const f = $('#prod-form'); f.reset(); say($('#prod-msg'), '', true);
    f.dataset.mode = p ? 'edit' : 'new'; f.id.readOnly = !!p;
    $('#prod-title').textContent = p ? 'Modifier un produit' : 'Ajouter un produit';
    if (!p) { f.available.checked = true; return; }
    f.id.value = p.id; f.name.value = p.name; f.category.value = p.category; f.price.value = (p.price_cents / 100).toFixed(2);
    f.image.value = p.image; f.description.value = p.description; f.features.value = p.features.join('\n'); f.available.checked = p.available;
    f.scrollIntoView({ block: 'center' });
  }
  async function productAction(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) return fillForm(products.find((p) => p.id === b.dataset.edit));
    if (b.dataset.del) {
      const p = products.find((x) => x.id === b.dataset.del);
      if (!confirm('Supprimer définitivement « ' + p.name + ' » ?')) return;
      b.disabled = true;
      try { await window.Shop.adminDeleteProduct(p.id); await loadProducts(); say($('#prod-msg'), 'Produit supprimé.', true); }
      catch (err) { say($('#prod-msg'), err.message, false); b.disabled = false; }
    }
  }
  async function saveProduct(e) {
    e.preventDefault();
    const f = e.target, msg = $('#prod-msg'), btn = $('button[type=submit]', f);
    if (btn.disabled) return;
    const price = Number(String(f.price.value).replace(',', '.'));
    const p = { id: f.id.value.trim(), name: f.name.value.trim(), category: f.category.value, description: f.description.value.trim(),
      price_cents: Math.round(price * 100), image: f.image.value.trim(),
      features: f.features.value.split('\n').map((s) => s.trim()).filter(Boolean), available: f.available.checked };
    if (!/^[a-z0-9-]{2,60}$/.test(p.id)) return say(msg, 'Identifiant : 2 à 60 caractères, minuscules, chiffres et tirets.', false);
    if (!p.name || !p.description) return say(msg, 'Le nom et la description sont obligatoires.', false);
    if (!(price > 0) || p.price_cents > 1000000) return say(msg, 'Prix invalide.', false);
    if (!/^images\/[\w.-]+$/.test(p.image) && !/^https:\/\/\S+$/.test(p.image)) return say(msg, 'Image : un fichier du dossier images/ ou une URL https://.', false);
    btn.disabled = true;
    try {
      await window.Shop.adminSaveProduct(f.dataset.mode !== 'edit', p);
      say(msg, 'Produit enregistré.', true); fillForm(null); await loadProducts();
    } catch (err) { say(msg, err.message, false); }
    btn.disabled = false;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
