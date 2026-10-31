/* ==========================================================
   catalog.js — données du site (catégories, produits, conseils)

   ⚠ LES PRODUITS CI-DESSOUS SONT DES EXEMPLES. Remplacez noms, prix,
   descriptions et images par vos vrais produits.
   - Prix en CENTIMES : 550 = 5,50 DT.
   - Quand Supabase est configuré, la table "products" remplace cette
     liste (voir supabase-setup.sql, qui contient les mêmes exemples).
   ========================================================== */
window.HL_CATEGORIES = [
  {
    id: 'conseils', file: 'categorie-conseils.html', name: 'Conseils gratuits',
    image: 'images/cat-conseils.svg',
    desc: 'Des conseils simples sur l’alimentation, l’hydratation et les étiquettes. Gratuits pour tous.',
    title: 'Conseils gratuits',
    subtitle: 'Des conseils simples sur l’alimentation, l’hydratation et la lecture des étiquettes, gratuits pour tous.'
  },
  {
    id: 'sans-gluten', file: 'categorie-sans-gluten.html', name: 'Sans gluten',
    image: 'images/cat-sans-gluten.svg',
    desc: 'Pâtes, farines, pains et biscuits sans gluten pour les sportifs.',
    title: 'Produits sans gluten',
    subtitle: 'Pâtes, farines, pains et biscuits sans gluten, pensés pour les sportifs.'
  },
  {
    id: 'sans-sucre', file: 'categorie-sans-sucre.html', name: 'Sans sucre ajouté',
    image: 'images/cat-sans-sucre.svg',
    desc: 'Confitures, chocolat, barres et granola sans sucre ajouté.',
    title: 'Produits sans sucre ajouté',
    subtitle: 'Confitures, chocolat, barres et granola sans sucre ajouté pour composer vos collations.'
  }
];

window.HL_FALLBACK_PRODUCTS = [
  { id: 'pates-riz-complet', name: 'Pâtes de riz complet', category: 'sans-gluten', price_cents: 550, image: 'images/pates-riz-complet.svg', available: true,
    description: 'Des pâtes à base de riz complet, une alternative sans gluten aux pâtes de blé.',
    features: ['Sans gluten', 'À base de riz complet', 'Cuisson à l’eau bouillante'] },
  { id: 'farine-sarrasin', name: 'Farine de sarrasin', category: 'sans-gluten', price_cents: 890, image: 'images/farine-sarrasin.svg', available: true,
    description: 'Une farine sans gluten pour vos crêpes, galettes et pains maison.',
    features: ['Sans gluten', 'Pour pâtisserie et cuisine salée', 'Se conserve au sec'] },
  { id: 'pain-graines', name: 'Pain aux graines sans gluten', category: 'sans-gluten', price_cents: 750, image: 'images/pain-graines.svg', available: true,
    description: 'Un pain moelleux aux graines, sans gluten, pour vos petits-déjeuners.',
    features: ['Sans gluten', 'Aux graines', 'À tartiner ou à toaster'] },
  { id: 'biscuits-avoine', name: 'Biscuits à l’avoine sans gluten', category: 'sans-gluten', price_cents: 990, image: 'images/biscuits-avoine.svg', available: true,
    description: 'Des biscuits à l’avoine sans gluten, à emporter avant ou après l’entraînement.',
    features: ['Sans gluten', 'À l’avoine', 'Format à emporter'] },
  { id: 'pancakes-mix', name: 'Préparation pancakes sans gluten', category: 'sans-gluten', price_cents: 1450, image: 'images/pancakes-mix.svg', available: true,
    description: 'Une préparation prête à l’emploi pour des pancakes sans gluten.',
    features: ['Sans gluten', 'Prête à l’emploi', 'Ajoutez simplement du liquide'] },
  { id: 'coffret-gluten', name: 'Coffret petit-déjeuner sans gluten', category: 'sans-gluten', price_cents: 3900, image: 'images/coffret-gluten.svg', available: true,
    description: 'Un coffret pour découvrir plusieurs produits sans gluten au petit-déjeuner.',
    features: ['Sans gluten', 'Assortiment', 'Idée cadeau'] },
  { id: 'confiture-sans-sucre', name: 'Confiture de fruits rouges sans sucre ajouté', category: 'sans-sucre', price_cents: 850, image: 'images/confiture-sans-sucre.svg', available: true,
    description: 'Une confiture de fruits rouges sans sucre ajouté pour vos tartines.',
    features: ['Sans sucre ajouté', 'Fruits rouges', 'Se conserve au frais après ouverture'] },
  { id: 'chocolat-noir', name: 'Chocolat noir sans sucre ajouté', category: 'sans-sucre', price_cents: 950, image: 'images/chocolat-noir.svg', available: true,
    description: 'Une tablette de chocolat noir sans sucre ajouté pour les envies gourmandes.',
    features: ['Sans sucre ajouté', 'Chocolat noir', 'Format tablette'] },
  { id: 'barres-proteinees', name: 'Barres protéinées sans sucre ajouté', category: 'sans-sucre', price_cents: 1200, image: 'images/barres-proteinees.svg', available: true,
    description: 'Des barres protéinées sans sucre ajouté, pratiques dans le sac de sport.',
    features: ['Sans sucre ajouté', 'Riche en protéines', 'Format à emporter'] },
  { id: 'granola', name: 'Granola sans sucre ajouté', category: 'sans-sucre', price_cents: 1590, image: 'images/granola.svg', available: true,
    description: 'Un granola croustillant sans sucre ajouté, à servir avec du yaourt ou du lait.',
    features: ['Sans sucre ajouté', 'Céréales et graines', 'Pour le petit-déjeuner'] },
  { id: 'pate-tartiner', name: 'Pâte à tartiner noisette sans sucre ajouté', category: 'sans-sucre', price_cents: 1800, image: 'images/pate-tartiner.svg', available: true,
    description: 'Une pâte à tartiner à la noisette sans sucre ajouté.',
    features: ['Sans sucre ajouté', 'Goût noisette', 'À tartiner'] },
  { id: 'coffret-sucre', name: 'Coffret découverte sans sucre ajouté', category: 'sans-sucre', price_cents: 4900, image: 'images/coffret-sucre.svg', available: true,
    description: 'Un coffret pour découvrir plusieurs produits sans sucre ajouté.',
    features: ['Sans sucre ajouté', 'Assortiment', 'Idée cadeau'] }
];

/* Conseils gratuits : service sans prix, texte à adapter. */
window.HL_ADVICE = [
  { id: 'conseil-hydratation', name: 'Bien s’hydrater autour de l’entraînement', image: 'images/conseil-hydratation.svg',
    description: 'Les bons réflexes pour boire avant, pendant et après l’effort.',
    body: ['Commencez la séance bien hydraté : buvez régulièrement dans les heures qui précèdent.',
           'Pendant l’effort, buvez par petites gorgées plutôt qu’en une seule fois, surtout s’il fait chaud.',
           'Après la séance, continuez à boire et prévoyez une collation. Votre soif et la couleur de vos urines sont de bons repères.'] },
  { id: 'conseil-assiette', name: 'Composer une assiette équilibrée', image: 'images/conseil-assiette.svg',
    description: 'Une méthode simple pour équilibrer vos repas de sportif.',
    body: ['Remplissez environ la moitié de l’assiette de légumes, un quart de protéines et un quart de féculents.',
           'Variez les sources : légumineuses, œufs, poisson, viandes maigres, céréales complètes.',
           'Ajoutez une petite part de bonnes matières grasses, comme l’huile d’olive ou les fruits à coque.'] },
  { id: 'conseil-etiquettes', name: 'Repérer les sucres ajoutés sur une étiquette', image: 'images/conseil-etiquettes.svg',
    description: 'Apprenez à lire la liste des ingrédients.',
    body: ['Les ingrédients sont listés du plus présent au moins présent : un sucre en début de liste est un signal.',
           'Le sucre se cache sous plusieurs noms : saccharose, glucose, sirop de glucose, dextrose, maltodextrine, miel, sirop.',
           '« Sans sucre ajouté » ne veut pas dire « sans sucre » : les fruits et le lait contiennent des sucres naturellement.'] },
  { id: 'conseil-sans-gluten', name: 'Manger sans gluten : les bons réflexes', image: 'images/conseil-sans-gluten.svg',
    description: 'Où se trouve le gluten et comment l’éviter au quotidien.',
    body: ['Le gluten se trouve dans le blé, l’orge et le seigle, donc dans de nombreux pains, pâtes, biscuits et sauces.',
           'Lisez toujours l’étiquette : certains produits transformés en contiennent sans que l’on s’y attende.',
           'Si vous pensez être sensible au gluten, parlez-en à un médecin avant de supprimer le gluten de votre alimentation.'] }
];
