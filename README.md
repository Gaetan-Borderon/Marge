# Marge — Rentabilité de vos projets

Application en français pour calculer la rentabilité d’un projet avec plusieurs services ou produits et des dépenses détaillées : billets d’avion, logement, taxes, prestataires, salaires et autres frais.

Le code est prêt à être hébergé sur **GitHub Pages**. Aucun serveur applicatif, compte tiers, clé API ou base de données n’est nécessaire. L’application fonctionne entièrement dans le navigateur.

## Exécuter l’application sur votre ordinateur

1. Installez [Node.js](https://nodejs.org/) en version 22 ou supérieure si nécessaire.
2. Décompressez l’archive et ouvrez un terminal dans le dossier `marge`, celui qui contient `package.json`.
3. Lancez :

```sh
npm start
```

4. Ouvrez **http://localhost:8080** dans votre navigateur. Pour arrêter, appuyez sur `Ctrl+C` dans le terminal.

Il n’y a aucune dépendance à installer : `npm install` et une compilation ne sont pas nécessaires.

Autre possibilité, avec Python 3 :

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Sous Windows, la commande Python peut être `py` plutôt que `python3`. Ouvrez l’application avec un serveur HTTP ; le double-clic sur `index.html` ne suffit pas pour charger les modules JavaScript.

## Mettre le code dans votre dépôt GitHub

Créez un dépôt vide sur GitHub, par exemple `marge`, puis exécutez les commandes suivantes depuis le dossier décompressé. Remplacez `VOTRE_COMPTE` et `VOTRE_DEPOT` par les noms de votre compte et de votre dépôt :

```sh
git init
git add .
git commit -m "Ajouter le simulateur Marge"
git branch -M main
git remote add origin https://github.com/VOTRE_COMPTE/VOTRE_DEPOT.git
git push -u origin main
```

Vous pouvez aussi copier les fichiers dans un dépôt déjà cloné, puis les enregistrer avec votre méthode habituelle. Copiez également le dossier caché `.github` : il contient le déploiement automatique.

## Publier l’application avec GitHub Pages

GitHub Pages doit être disponible pour votre dépôt selon votre offre GitHub.

1. Dans le dépôt, ouvrez **Settings → Pages**.
2. Dans **Build and deployment → Source**, choisissez **GitHub Actions**.
3. Ouvrez l’onglet **Actions**, puis le workflow **Publier Marge sur GitHub Pages**.
4. Cliquez sur **Run workflow**, choisissez `main` et lancez le workflow.
5. Quand l’exécution réussit, le lien du site apparaît dans le déploiement `github-pages` et dans **Settings → Pages**.

L’adresse habituelle est `https://VOTRE_COMPTE.github.io/VOTRE_DEPOT/`. Utilisez le lien exact fourni par GitHub. Les chemins des fichiers sont relatifs, ce qui permet l’hébergement dans un sous-dossier de dépôt.

Ensuite, chaque envoi de modifications sur `main` ou `master` relance les tests et publie le dossier `dist/`. Si le premier lancement automatique a précédé l’activation de GitHub Pages, relancez le workflow après l’étape 2. Aucun secret GitHub à ajouter.

## Planning et modèles de coûts locaux

Dans l’onglet **Consultants**, chaque personne possède ses propres dates de mission, tarif de vente journalier et coût de rémunération. Le calcul retient les dates inclusives comprises dans la période du projet. Il compte le lundi au vendredi ; les jours fériés, congés et autres absences se déduisent manuellement. Les week-ends travaillés et les heures supplémentaires ont leurs champs dédiés. Saisissez les taux de vente et d’achat des heures supplémentaires ; aucun coefficient n’est supposé automatiquement.

Les coûts locaux sont des modèles enregistrés dans le navigateur. Chaque poste peut être journalier, ponctuel ou réparti selon la formule `montant × quantité ÷ jours de référence`. Une case permet d’inclure ou d’exclure chaque poste, ainsi que sa TVA et sa sécurité éventuelles.

Le taux de référence est exprimé en **USD pour 1 EUR**. Un taux budgétaire distinct, exprimé en **EUR pour 1 USD**, peut le remplacer pour calculer les coûts. Si la sécurité est marquée « déjà intégrée », aucune majoration n’est ajoutée. Les taux sont saisis manuellement et ne sont pas actualisés sur les marchés.

Utilisez **Modèles de coûts** pour créer, copier, importer ou exporter un modèle JSON. Le modèle par défaut du projet est copié uniquement sur les nouveaux consultants. Chaque consultant conserve ensuite sa propre copie, ajustable avec **Ajuster les coûts**. Modifier ou supprimer un modèle de la bibliothèque ne modifie pas ces copies ni les anciens projets.

Un lien d’import peut proposer un modèle dans le fragment de l’adresse. Il ouvre l’éditeur pour vérification ; le modèle n’est enregistré qu’après une action explicite. Le fragment est retiré de l’adresse après lecture. Les coûts personnalisés ne sont pas intégrés au code public du dépôt.

Les budgets v1 et v2 sont convertis au format v3 sans changer leurs totaux. Leurs anciennes clés de stockage sont conservées.

## Fonctionnalités

- Consultants avec arrivées et départs décalés, tarifs individuels et heures supplémentaires.
- Modèles de coûts locaux indépendants, exportables et réutilisables.
- Plusieurs services et produits complémentaires dans un même projet, avec quantité, tarif et fréquence.
- Revenus et dépenses mensuels ou ponctuels.
- Dépenses calculées en quantité × coût unitaire ou en pourcentage du chiffre d’affaires.
- Coûts rattachés à un service ou communs au projet.
- Résultat global, marge, chiffre d’affaires minimum estimé et contribution de chaque service.
- Scénarios prudent, central et optimiste.
- Sauvegarde locale de plusieurs projets et export CSV détaillé.

## Stockage des projets

Les projets sont conservés dans le stockage local du navigateur (`localStorage`). Ils ne sont pas envoyés à GitHub, ne sont pas inclus dans le code et ne se synchronisent pas entre appareils.

Chaque adresse de site possède son propre stockage. Les données de l’ancien site ne sont donc pas transférées automatiquement vers GitHub Pages. L’export CSV permet de conserver un rapport détaillé ; cette version ne propose pas d’import de projet.

## Modifier le code

```text
marge/
├── .github/workflows/deploy-pages.yml  Déploiement GitHub Pages
├── dist/
│   ├── index.html                     Interface et textes
│   ├── styles.css                     Apparence et mise en page
│   ├── app.js                         Interactions et sauvegarde
│   ├── finance.js                     Résultats et consolidation
│   ├── planning.js                    Calendrier et coûts locaux
│   └── planner-ui.js                  Planning et bibliothèque de modèles
├── scripts/serve.mjs                  Serveur local sans dépendance
├── tests/finance.test.mjs             Consolidation et budgets
├── tests/planning.test.mjs            Dates, consultants et modèles locaux
├── package.json
└── README.md
```

Pour modifier l’application, éditez directement les fichiers du dossier `dist/`. Ce dossier contient le code source du site, sans compilation ni fichiers minimisés. Le workflow ne déploie que ce dossier, pas le serveur local ni les tests.

## Vérifier les calculs

```sh
npm test
```

Les tests couvrent plusieurs services et consultants, les dates inclusives et week-ends, les absences et heures supplémentaires, les frais mensuels, journaliers, répartis et ponctuels, la conversion USD/EUR, la sécurité déjà intégrée, les taxes, les scénarios, les contributions et la conversion des anciens budgets.

## Hypothèses du modèle

Le résultat global est égal aux revenus moins toutes les dépenses saisies et la mise initiale supplémentaire. Une ligne mensuelle est répétée sur la durée choisie. Une ligne ponctuelle est comptée une seule fois.

Les taxes et charges ne sont ajoutées que si vous les saisissez. Pour les salaires, indiquez le coût employeur complet. Les montants sont hors TVA récupérable ; incluez la TVA non récupérable dans les coûts. Le modèle ne calcule pas les amortissements, le financement ni les délais de paiement. Les formules sont également expliquées dans l’application.
