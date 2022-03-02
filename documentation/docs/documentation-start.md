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

* `dge-figure`: [téléchargement](./dist/4.4.0/dge-figure.js){:target="_blank"}
* `dge-table`: [téléchargement](./dist/4.4.0/dge-table.js){:target="_blank"}
* `dge-chart`: [téléchargement](./dist/4.4.0/dge-chart.js){:target="_blank"}
* `dge-text`: [téléchargement](./dist/4.4.0/dge-text.js){:target="_blank"}
* `dge-image`: [téléchargement](./dist/4.4.0/dge-image.js){:target="_blank"}

Vous pouvez également télécharger l'ensemble des composants sous la forme d'un seul fichier. Cela limite la taille gloable du chargement cumulé des différents composants du fait de la redondance de certaines bibliothèques externes entre composants (ex. : "Papaparse" et "AlaSQL").

* `dge-all`: [téléchargement](./dist/4.4.0/dge-all.js){:target="_blank"}

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

    * [Format ZIP](dist/4.4.0/dist_4.4.0.zip)
    * [Format 7Z](dist/4.4.0/dist_4.4.0.7z)


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
Lors de la récupération des données, le composant essai de deviner le type de champ utilisé ("string", "inteder", "date", etc.). Pour cela, la propriété `dynamicTyping` de la bibliothèque [papaparse](https://www.papaparse.com/docs#config) est utilisée

### Fichier CSV

Les fichiers CSV doivent avoir la structure suivante.

``` csv
id;objet;prix
1;stylo;4.1
2;cahier;7.2
3;gomme;5.8
4;crayon;6.4
```

### Fichier et API JSON

DGE Dataviz Components ne supporte pas les structures de données complexes. Les fichiers JSON doivent être à plat sur le modèle suivant.

``` json
[
    { 
        "id": 1,
        "contenance": 256,
        "type": 0
    }, { 
        "id": 2,
        "contenance": 212,
        "type": 1
    }, { ...  }, { 
        "id": 7,
        "contenance": 198,
        "type": 1
    }
]
```

Il en est de même pour les fichiers provenant des API qui renvoie des données au format JSON.

Dans le cas d'une structuration plus complexe, il est nécessaire de prévoir une conversion des données.  
Dans les cas simples, l'utilisation d'un fichier PHP récupérant les données source via la fonction `file_get_contents()`, les transformant puis les renvoyant au format JSON (header adapté) via la fonction `json_encode()` peut suffir. Dans les cas plus complexe, le recourt à la bibliothèque `cURL` peut être préférable.

### Flux OGC WFS

DGE Dataviz Components peut intégrer des données provenant de flux WFS. Seules les données attributaires précisées dans la propriété `fields` sont récupérées du serveur. Les tests ont été rélalisés à partir de GeoServer.  
Dans ce cas, il est nécessaire d'indiquer l'URL du WFS dans la propriété `url` (en précisant de préférence le "workspace") et le nom du layer dans la propriété `datasets`. Par défaut, GeoServer renvoie uniquement les 50 premiers objects du flux. Il est donc nécessaire le cas échéant de préciser le nombre maximum d'objets à retourner via la propriété `max`.

Exemple:

```html
<...
api="wfs" 
url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs" 
datasets="propriete_fonciere_region" 
max="200"
... />
```


### API Data4Citizen (D4C)

Le principe est similaire à celui des flux WFS en indiquant "d4c" comme nom d'api, l'URL du serveur pour la propriété `url` et le nom de la données comme `datasets `.  

``` html
<...
api="d4c" 
url="https://dev.datagrandest.fr/data4citizen/d4c/api/records/1.0/search"
datasets="zonages-administratifs-cantons-haute-marne"
max="500"
.../>
```


## CSS et mise en forme

Les CSS chargés dans le page HTML qui intègre les composants n'influent pas sur la mise en forme des composants.  
Ces derniers chargent par défaut les fichiers suivants:

- Bootstrap: [https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css](https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css){:target="\_blank"}
- Bootstrap Icons: [https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css](https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css){:target="\_blank"}

La propriété `localcss="true"` permet cependant de charger ses propres fichiers CSS. Elle indique au composant de charger successivement les fichiers:

- `./dist/bootstrap/css/bootstrap.min.css`
- `./dist/bootstrap-icons/bootstrap-icons.css`
- `./dist/global.css`

Il est ainsi possible d'utiiser une mise en forme fournie par [Bootwatch](https://bootswatch.com/) en plçant le fichier `bootstrap.min.css` sur le serveur dans le dossier `./dist/bootstrap/css/`.  
Le fichier `./dist/global.css` permet quant à lui généralement de spécifier des mises en formes ponctuelles. A noter que certaines balises des éléments des composants web contiennent des classes qui peuvent être utilisées dans le fichier `global.css`. De même l'identifiant du composant (propriété `id=...`) peut aussi être utilisé comme référence pour la mise en forme.

Exemple:

```css
#dge-figure-1 {
    border: 0;
}

#dge-figure-1 h2 {
    color: #592;
    font-weight: bold;
}
```

Pour plus de détail sur la structure des composants, vous pouvez utiliser la console de développement de votre navigateur accessible via la touche `F12`.