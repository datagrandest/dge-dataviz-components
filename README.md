# DataGrandEst Dataviz Components

Ensemble de composants web pour afficher des données de différentes sources sous forme d'indicateurs, de tableaux, de graphiques et de carte.
Les composants web s'apparentent à des widgets utilisables dans une page HTML.

Les composants disponibles sont:
- `<dge-figure />` pour l'affichage d'indicateurs
- `<dge-table />` pour l'affichage de tableaux
- `<dge-chart />` pour l'affichage de graphiques
- `<dge-map />` pour l'affichage de cartes
- `<dge-image />` pour l'affichage de image
- `<dge-text />` pour l'affichage de texte

## Documentation et démonstration

Pour voir ce que ça donne et disposer de plus de détails sur la manière d'utiliser ces composants, rendez-vous sur le [site dédié](https://datagrandest.github.io/dge-dataviz-components).

## Développement

Ce code source est sous licence ouverte MIT.

Ces composants sont produits grâce au framework [Svelte JS](https://svelte.dev/).

Le projet a été initié via le template proposé par [sinedied](https://github.com/sinedied) : https://github.com/sinedied/svelte-web-components-template

Pour modifier le code et recompiler les composants:

```bash
# Cloner le dépot GitHub
git clone https://github.com/datagrandest/dge-dataviz-components

# Installer les modules nodejs
cd dge-dataviz-components
npm install

# Réaliser les modifications nécessaires puis recompiler le code
npm run build:chart  # recompile uniquement le composant "dge-chart.js"
npm run build:figure  # recompile uniquement le composant "dge-figure.js"
npm run build:image  # recompile uniquement le composant "dge-image.js"
npm run build:map  # recompile uniquement le composant "dge-map.js"
npm run build:table  # recompile uniquement le composant "dge-table.js"
npm run build:text  # recompile uniquement le composant "dge-text.js"
# ou
npm run build:all  # recompile l'ensemble des composants individuellement plus le fichier global dge-all.js
```
