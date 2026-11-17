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

## Parcours de pilotage (v4)

### 1. Construire le budget et le prix par jour

Le budget de référence est établi **par consultant** sur une durée modifiable. Les jours facturables prévus sont estimés du lundi au vendredi, avec déduction des jours non facturables et ajout des jours supplémentaires. Une quantité manuelle de jours peut remplacer cette estimation.

Saisissez le salaire net par jour et les postes de coûts locaux. Chaque poste a sa catégorie, sa devise, sa quantité et sa base : par jour facturable, par mois, ponctuel, réparti selon un nombre de jours de référence, ou en pourcentage du salaire net. Les coûts mensuels sont calculés au prorata des jours calendaires. Les coûts ponctuels peuvent avoir une date spécifique.

Le **coût STAT par jour** est le coût total prévu divisé par les jours facturables. Le **prix de vente conseillé** est ce coût multiplié par `1 + majoration / 100`. Une majoration de 20 % sur coût correspond à une marge de 16,67 % sur le prix de vente. Aucun salaire brut, taux légal ou supplément fiscal n’est supposé automatiquement.

Les devises, la TVA et la sécurité reprennent les possibilités de la version précédente. Le taux de référence est exprimé en USD pour 1 EUR ; le taux budgétaire en EUR pour 1 USD. La sécurité « déjà intégrée » ne s’applique pas une seconde fois.

### 2. Décliner le budget par consultant

Chaque consultant a ses dates de démarrage et de fin prévisionnelle, sa quantité de jours facturables, son salaire net ou sa majoration spécifique, son TJM vendu et ses coûts additionnels. Le tarif vendu reste fixe lorsque les coûts ou les dates changent ; un bouton permet d’adopter explicitement le prix conseillé.

Ajoutez ou retirez les catégories depuis **Gérer les catégories**. Retirer une catégorie conserve ses montants dans « Autres », y compris dans les références budgétaires et les dépenses déjà saisies.

Après le paramétrage d’une mission, cliquez sur **Valider le budget**. Cette action fige une copie des hypothèses initiales. Les modifications ultérieures alimentent la prévision révisée, sans réécrire la référence. Remplacer cette référence est une action explicite avec confirmation.

Les **dépenses réelles** sont saisies séparément avec date, catégorie, montant, consultant et explication. Les salaires et charges ne sont pas générés à partir des factures clients. Une dépense en USD conserve son propre taux de conversion historique. Les remboursements ou avoirs de coûts peuvent être saisis avec un montant négatif.

Un consultant sans historique peut être retiré. S’il possède des factures ou dépenses, il est archivé pour conserver ces données ; modifiez sa date de fin si la mission se termine plus tôt.

### 3. Enregistrer les factures et paiements

Une facture est rattachée à **un seul consultant**. Elle contient les dates de période, les jours facturés, le tarif journalier, les heures supplémentaires et les éventuelles lignes forfaitaires ou remises. Les états sont : à envoyer, à corriger, envoyée, en attente de paiement et payée.

Le CA facturé et les jours facturés proviennent uniquement des factures actuellement valides, émises au plus tard à la date d’arrêté. Les brouillons et corrections restent séparés. Le CA prévisionnel n’est jamais ajouté au CA facturé.

Les paiements partiels ou complets ont leur propre date. Les montants sont suivis en **équivalent HT**, y compris pour les règlements. La date d’arrêté exclut les émissions et paiements futurs. Aucun e-mail, facture ou paiement n’est envoyé automatiquement.

### Tableaux de bord par consultant

La vue d’ensemble présente les prévisions, la facturation, les jours facturés, les encaissements et les coûts. Chaque consultant a un tableau de bord détaillé avec :

- Coût réel saisi par jour facturé, comparé au coût budgété par jour.
- Budget initial, prévision révisée et coûts saisis à date.
- Courbes de coûts cumulés et suivi mensuel.
- Première date d’écart au rythme prévu et première date de dépassement du budget total, suivies séparément.
- Écarts par catégorie et dépenses datées avec leurs explications.

Un coût payé en avance peut créer un écart de rythme sans dépassement du budget total. Les absences prévues sont réparties uniformément dans le calendrier budgétaire. Sans dépenses réelles saisies, l’interface indique que les coûts restent à documenter.

## Modèles, sauvegardes et anciennes données

Les budgets peuvent être conservés comme modèles, exportés et importés en JSON. Les anciens modèles de coûts locaux restent importables. Les liens d’import de modèles dans un fragment d’adresse sont conservés ; leurs données ne sont pas envoyées au dépôt.

Chaque projet dispose d’une sauvegarde JSON complète et d’un export CSV comprenant consultants, budgets, factures, paiements, dépenses et écarts. Un import de sauvegarde crée une copie, sans remplacer les autres projets.

Les données sont conservées dans le stockage local du navigateur. Elles ne sont pas envoyées à GitHub et ne se synchronisent pas entre appareils. La v4 utilise une nouvelle clé de stockage, sans supprimer les anciennes. L’ancienne interface reste accessible via `legacy.html`.

Les missions précédentes sont reprises avec leurs coûts. Un ancien coût d’achat ou de rémunération non ventilé reste un poste explicite : il n’est pas renommé automatiquement « salaire net ». Vérifiez sa ventilation avant d’ajouter le salaire net, afin d’éviter un doublon. Les autres revenus et coûts de l’ancienne simulation restent identifiés à part.

## Modifier le code

```text
marge/
├── .github/workflows/deploy-pages.yml
├── dist/
│   ├── index.html                   Interface v4
│   ├── workspace.css                Mise en page responsive
│   ├── workspace.js                 Écrans, saisie et stockage
│   ├── budget-engine.js             Budget, calendrier, factures et écarts
│   ├── legacy.html                  Accès à l’ancienne interface
│   └── …                            Modules v3 conservés pour compatibilité
├── scripts/serve.mjs
├── tests/
│   ├── budget-workspace.test.mjs     Tests du pilotage v4
│   ├── finance.test.mjs
│   └── planning.test.mjs
├── package.json
└── README.md
```

Le dossier `dist/` contient directement le code du site, sans compilation. Le workflow GitHub Pages exécute les tests puis publie ce dossier.

```sh
npm test
```

Les tests couvrent notamment les majorations sur coût, jours facturables, devises, références figées, coûts datés, catégories, statuts et dates de factures, paiements partiels, jours facturés, dépassements, rapprochements des montants et migration des anciennes données.
