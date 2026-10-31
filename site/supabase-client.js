/* ==========================================================
   supabase-client.js — UNE SEULE initialisation du client Supabase.

   1. Dans Supabase : Project Settings > API (ou "Connect").
   2. Copiez "Project URL" et "Publishable key" ci-dessous.
   ⚠ Ne collez JAMAIS une clé "secret" ou "service_role" ici.
   La Publishable key peut être publique : la sécurité vient des
   règles RLS définies dans les fichiers .sql.
   ========================================================== */
const SUPABASE_URL = 'https://VOTRE-PROJET.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'VOTRE-PUBLISHABLE-KEY';

window.hlSupabase = (function () {
  const configured = !SUPABASE_URL.includes('VOTRE-') && !SUPABASE_PUBLISHABLE_KEY.includes('VOTRE-');
  if (!configured) return null;
  if (!window.supabase || !window.supabase.createClient) {
    console.warn('Bibliothèque Supabase non chargée (connexion internet ?).');
    return null;
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();
