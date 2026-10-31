# Connecter le site à Supabase et le publier sur Vercel

Supabase gère les comptes, le catalogue et les commandes. Le paiement reste une **simulation** : aucune donnée bancaire n’est demandée.

> Je n’ai pas pu exécuter ces scripts SQL ni déployer le site à votre place : ces étapes sont à faire dans votre compte.

## 1. Créer le projet

1. Allez sur supabase.com, créez un compte, puis **New project**.
2. Choisissez un nom, un mot de passe de base de données (gardez-le, ne le collez jamais dans le site) et une région proche.
3. Attendez la fin de la création.

## 2. Récupérer l’URL et la Publishable key

1. Dans le projet : **Project Settings > API** (ou le bouton **Connect**).
2. Copiez **Project URL** et **Publishable key** (anciennement « anon key »).
3. Ouvrez `supabase-client.js` et remplacez `VOTRE-PROJET` et `VOTRE-PUBLISHABLE-KEY`.
4. N’utilisez **jamais** la clé *secret* ou *service_role* dans le site.

## 3. Exécuter les scripts SQL (dans cet ordre)

Dans Supabase : **SQL Editor > New query**, collez le contenu du fichier, puis **Run**.

1. `supabase-setup.sql` : produits, rôles, sécurité, produits d’exemple. (Projet neuf uniquement : si vos tables `products` ou `user_roles` existent déjà, ne le lancez pas.)
2. `supabase-orders.sql` : commandes et fonction `create_demo_order`. Relançable sans perdre de commandes.
3. `supabase-admin.sql` : à faire plus tard, voir l’étape 5.

## 4. Configurer l’authentification

1. **Authentication > Providers** : vérifiez que **Email** est activé et que **Confirm email** est coché.
2. **Authentication > URL Configuration** :
   - **Site URL** : `http://localhost:8000` (ou l’adresse Live Server, ex. `http://127.0.0.1:5500`).
   - **Redirect URLs** : ajoutez `http://localhost:8000/**`, `http://127.0.0.1:5500/**` et plus tard `https://VOTRE-SITE.vercel.app/**`.
3. Le service d’e-mail gratuit de Supabase est limité en nombre d’envois : en cas d’erreur « rate limit », patientez.

## 5. Devenir administrateur

1. Sur le site, créez un compte (`signup.html`) et cliquez sur le lien reçu par e-mail.
2. Supabase : **Authentication > Users**, copiez l’**UUID** de votre utilisateur.
3. Ouvrez `supabase-admin.sql`, remplacez `VOTRE-UUID` (gardez les apostrophes), puis **Run** dans SQL Editor.
4. Déconnectez-vous puis reconnectez-vous : le lien **Admin** apparaît dans le menu.

## 6. Tester

Faites ces tests avec de vrais comptes sur le site, pas seulement dans SQL Editor (qui contourne les règles de sécurité) :

- Visiteur : voit les produits ; `compte.html` et `checkout.html` redirigent vers la connexion ; `admin.html` demande de se connecter.
- Client A : commande, voit **ses** commandes. Client B : ne voit pas celles de A.
- Client : `admin.html` affiche « Page réservée à l’administrateur ».
- Admin : voit toutes les commandes, change un statut, ajoute/modifie/supprime un produit.
- Réseau : coupez internet pendant la validation : le panier reste, et un nouvel essai ne crée pas de doublon.

## 7. Erreurs fréquentes

| Message | Cause probable |
|---|---|
| « Comptes et commandes non configurés » | `supabase-client.js` pas encore rempli, ou bibliothèque Supabase non chargée (pas d’internet) |
| Lien de confirmation vers `localhost` qui ne s’ouvre pas | Mauvaise **Site URL** / **Redirect URLs** (étape 4) |
| « Adresse e-mail pas encore confirmée » | Cliquez sur le lien du message de confirmation |
| « Action non autorisée avec ce compte » | Règles RLS : compte non admin, ou SQL non exécuté |
| « Un prix a changé… » | Un prix a été modifié depuis l’ajout au panier : actualisez la page |
| Catalogue d’exemple affiché | `supabase-setup.sql` pas exécuté, ou connexion impossible |
| `invalid input syntax for type uuid` | `VOTRE-UUID` pas remplacé dans `supabase-admin.sql` |

## 8. Publier sur Vercel (adresse en vercel.app)

1. Mettez le dossier du site dans un dépôt **GitHub** (`index.html` à la racine du dépôt).
2. Sur vercel.com : **Add New > Project**, importez le dépôt.
3. **Framework Preset** : `Other`. **Root Directory** : le dossier contenant `index.html`.
4. **Build Command** : laissez vide. **Output Directory** : laissez vide (ou `.`).
5. **Deploy**. Vous obtenez une adresse `https://xxx.vercel.app`.
6. Retournez dans Supabase, **Authentication > URL Configuration** : mettez cette adresse en **Site URL** et ajoutez `https://xxx.vercel.app/**` aux **Redirect URLs**.
7. Refaites les tests de l’étape 6 sur l’adresse HTTPS finale.

## Limites à connaître

- Paiement simulé uniquement : ne le présentez pas comme un vrai service de paiement.
- Les frais de livraison (7 DT, offerts dès 100 DT) existent dans `script.js` **et** `supabase-orders.sql` : modifiez les deux ensemble.
- La récupération du mot de passe n’est pas implémentée.
- Les anciennes commandes locales ne sont pas importées.
