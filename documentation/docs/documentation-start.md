---
tags:
  - insiders
  - brand new
---

# Documentation

## Qu'est ce qu'un composant web?

Un composant web est un élément HTML que l'on peut intégrer dans une page web pour introduire une nouvelle fonctionnalité sous la forme d'un "widget".
Il peut être configurer via des paramètre prédéfinis via lesquels ont passe des valeurs au composant.

Voici un premier exemple:

!!! example "Exemple"

    === "HTML"

        ``` html
        <dge-chart id="dge-chart-1" 
            title="Prix des objets de test.csv"
            api="csv"
            url="data/test.csv" 
            x="objet" 
            y="prix" 
            series="Prix des objets" 
            chart="bar" />
        ```

    === "Data"

        ``` csv
        id;objet;prix
        1;stylo;4.1
        2;cahier;7.2
        3;gomme;5.8
        4;crayon;6.4
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart id="dge-chart-1" 
                title="Prix des objets de test.csv"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="csv"
                url="data/test.csv" 
                x="objet" 
                y="prix" 
                series="Prix des objets" 
                chart="bar"
                />
        </div>


## Utilisation de DGE Dataviz Components

Pour utiliser DGE Dataviz Components vous devez tout d'abord télécharger et intégrer le code javascript du composant à utiliser dans votre page.  
Pour télécharger les différents composants:

* `dge-figure`: [téléchargement](./dist/4.2.0/dge-figure.js){:target="_blank"}
* `dge-table`: [téléchargement](./dist/4.2.0/dge-table.js){:target="_blank"}
* `dge-chart`: [téléchargement](./dist/4.2.0/dge-chart.js){:target="_blank"}
* `dge-text`: [téléchargement](./dist/4.2.0/dge-text.js){:target="_blank"}
* `dge-image`: [téléchargement](./dist/4.2.0/dge-image.js){:target="_blank"}

Vous pouvez également télécharger l'ensemble des composants sous la forme d'un seul fichier. Cela limite la taille gloable du chargement cumulé des différents composants du fait de la redondance de certaines bibliothèques externes entre composants (ex. : "Papaparse" et "AlaSQL").

* `dge-all`: [téléchargement](./dist/4.2.0/dge-all.js){:target="_blank"}

Le code à ajouter à votre page web est le suivant (une ligne par composant en adaptant au besoin le chemin vers le fichier):

``` html
<script defer src='dge-dataviz-components/dge-figure.js'></script>
<script defer src='dge-dataviz-components/dge-table.js'></script>
<script defer src='dge-dataviz-components/dge-image.js'></script>
<script defer src='dge-dataviz-components/dge-text.js'></script>
<script defer src='dge-dataviz-components/dge-chart.js'></script>
<script defer src='dge-dataviz-components/dge-map.js'></script>
```

Ou:

``` html
<script defer src='dge-dataviz-components/dge-all.js'></script>
```

Vous devez ensuite intégrer le code du composant à l'endroit voulu de votre page web et le configurer à partir des propriétés disponibles. 
Voici l'exemple du code d'un composant `dge-chart`:

``` html
<dge-chart id="dge-chart-1" 
    title="Prix des objets de test.csv"
    attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
    api="csv"
    url="data/test.csv" 
    x="objet" 
    y="prix" 
    series="Prix des objets" 
    chart="bar"
    />
```

!!! Info "Package pour démarrer"
    Pour simplifier la mise en oeuvre initiale vous pouvez télécharger le "package de démarrage". Il comprend l'ensemble des fichiers nécessaires pour débuter (framework `Bootstrap v5` inclu):

    * [Format ZIP](dist/4.2.0/dist_4.2.0.zip)
    * [Format 7Z](dist/4.2.0/dist_4.2.0.7z)


## Les sources de données

DGE Dataviz Components supporte 4 sources de données:

* Les fichiers **CSV**
* Les fichiers et API **JSON** simples (ex.: fonctionne avec l'API NocoDB)
* L'**API Data4Citizen**
* Les flux OGC **WFS**

Le type de source de données est précisé par la propriété `api`. Elle peut prendre 4 valeurs différentes:

- "csv" : données provenant d'un fichier CSV
- "json" : données provenant d'un fichier JSON
- "wfs" : données provenant d'un flux WFS
- "d4c" : données provenant d'une plateforme Data4Citizen

Il est également nécessaire de préciser l'URL des données via la propriété `url` du composant et les jeux de données à réccupérer via la propriété `datasets`.


