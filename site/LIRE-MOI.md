# healthylifestyle : guide pour débutant

Site de vente de produits healthy (sans gluten, sans sucre ajouté) avec des conseils gratuits.
Technologies : HTML, CSS et JavaScript simples. Aucun framework.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | Page d’accueil |
| `produits.html` | Page principale : catégories + tous les produits avec filtre |
| `categorie-sans-gluten.html`, `categorie-sans-sucre.html`, `categorie-conseils.html` | Une page par catégorie |
| `produit.html` | Détail d’un produit ou d’un conseil (`produit.html?id=...`) |
| `a-propos.html`, `contact.html` | Présentation et contact |
| `panier.html`, `checkout.html`, `confirmation.html` | Achat (paiement simulé) |
| `login.html`, `signup.html`, `verification.html`, `compte.html` | Comptes |
| `admin.html` + `admin.js` | Administration (commandes et produits) |
| `style.css` | Apparence (couleurs en haut du fichier) |
| `script.js` | Interactions : menu, panier, pages |
| `catalog.js` | Catégories, produits d’exemple, conseils |
| `supabase-client.js`, `supabase-shop.js` | Connexion à Supabase |
| `supabase-setup.sql`, `supabase-orders.sql`, `supabase-admin.sql` | Base de données (à lancer dans cet ordre) |
| `images/` | Images du site |

## 1. Ouvrir le projet

1. Installez **VS Code** (code.visualstudio.com) si ce n’est pas fait.
2. Menu **Fichier > Ouvrir un dossier**, choisissez le dossier du site.
3. Les fichiers doivent apparaître dans la colonne de gauche.

## 2. Lancer le site

**Méthode simple (recommandée) : Live Server**
1. Dans VS Code, ouvrez l’onglet Extensions (carré à gauche) et installez **Live Server**.
2. Clic droit sur `index.html`, puis **Open with Live Server**.
3. Le navigateur s’ouvre sur une adresse du type `http://127.0.0.1:5500/`.

**Méthode avec le terminal**
1. Menu **Terminal > Nouveau terminal** (raccourci : Ctrl + `).
2. Tapez `dir` (Windows) ou `ls` (Mac/Linux) : vous devez voir `index.html`.
3. Tapez `python -m http.server 8000` (ou `python3 -m http.server 8000`).
4. Ouvrez `http://localhost:8000` dans le navigateur.
5. Pour arrêter : Ctrl + C dans le terminal.
6. Si « python n’est pas reconnu » : installez Python (python.org) ou utilisez Live Server.

Sans Supabase, vous pouvez déjà parcourir le catalogue, filtrer et remplir le panier.
Comptes et commandes demandent Supabase : voir `SUPABASE.md`.

## 3. Modifier le site

- **Un texte** : ouvrez le fichier `.html`, cherchez le texte (Ctrl + F), modifiez, Ctrl + S, actualisez le navigateur.
- **Une couleur** : ouvrez `style.css`, modifiez les variables tout en haut (`--bg`, `--brown`...).
- **Un produit** : modifiez `catalog.js` (prix en centimes : 550 = 5,50 DT). Avec Supabase, utilisez la page Admin.
- **Une image** : remplacez le fichier dans `images/` en gardant le même nom, ou changez le chemin `images/...`.
- **Les frais de livraison** : en haut de `script.js` (`CFG`) **et** dans `supabase-orders.sql` (7 DT, offerte dès 100 DT).

## 4. À compléter

- Les produits actuels sont des **exemples** : remplacez noms, prix, descriptions.
- Les images sont des **illustrations générées** : ajoutez vos vraies photos dans `images/`.
- Coordonnées de `contact.html` : téléphone, e-mail, adresse, horaires, réseaux sociaux.
- Le formulaire de contact est une démonstration : il n’envoie rien.
- Aucun logo fourni : une feuille simple est utilisée.
- Les textes des conseils sont généraux : faites-les relire par un professionnel de santé.
