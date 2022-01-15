# DGE Chart

Un composant pour afficher facilement des graphiques.

<div style="width:40%">
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

## Liste des propriétés

Il existe 4 grands types de propriétés:

- "String": chaîne de caractères (ex.: `title="Un titre"`) 
- "Integer": Un nombre (ex.: `decimal="3"`) 
- "Boolean": une valeur binaire (vrai ou faux): "true"/"false" (ex.: `localcss="true"`) 
- "Objects": ensemble de couples clé/valeur inclus dans une propriété (Ex.: `property="att1:value1;att2:value2;att3:value3..."`). Dans ce cas, vous trouverez dans la documentation un tableau qui précise la nature de chaque attribut attendu. Pour certains attributs, ils peuvent aussi exister sous forme de propriété individuelle (ex: `attribution="text:DataGrandEst"` est équivalent à `attributiontext="DataGrandEst"`)

Il est important de respecter le type de valeur attendu par les propriétés et attributs pour le bon fonctionnement des composants web.

Par ailleurs, le traitement des données se fait via des requêtes SQL qui s'apuient sur des mots-clés réservés (cf. https://github.com/agershun/alasql/wiki/AlaSQL%2DKeywords
). Ils ne devraient pas être utilisés comme nom de champs.  
Une solution de contournement existe en "échappant" c'est noms de champs avec ``fieldname`` ou `[fieldname]` (ex.: `operation="sum|`value`"`).

### id

| Propriété | Type   | Défaut      |
|-----------|--------|-------------|
| id        | String | "dge-chart" |

Identifiant du composant. Il peut être utilisé pour appliquer une mise en forme spécifique via du CSS.

Exemple: `id="dge-chart-1"`

### attribution

| Propriété   | Type   | Défaut     |
|-------------|--------|------------|
| attribution | Object | false      |

| Attribut | Type   | Défaut | Propriété  équivalente | Description                                                                                  |
|----------|--------|--------|------------------------|----------------------------------------------------------------------------------------------|
| text     | String | null   | attributiontext        | Texte à afficher comme support au lien vers le site indiqué (cf. attribut `url`)             |
| icon     | String | null   | attributionicon        | Nom de l'îcon (cf. bibliothèque "[Bootstrap Icons v1.7.x](https://icons.getbootstrap.com/)") |
| prefix   | String | null   | attributionprefix      | Texte prefixant l'attribut `text`                                                            |
| url      | String | null   | attributionurl         | Lien vers un site internet                                                                   |
| size     | String | 1rem   | attributionsize        | Taille de l'icon. L'unité doit être précisée (ex.: "1.5rem" ou "18px")                       |
| color    | String | #000   | attributioncolor       | Couleur de l'icon (ex.: "#393" ou "#99564c" ou "rgba(50,200,35,0.6)")                        |
| title    | String | text   | attributiontitle       | Titre du texte ou de l'icon qui appraît au survol par la souris                              |

Sources des données utilisées par le composant. 
Cette propriété est de type object et se compose d'une liste d'attributs permettant de préciser le texte ou l'icon à afficher, l'URL, etc.

Exemple: `attribution="text:DataGrandEst;url:https://www.datagrandest.fr"`

### localcss

| Propriété   | Type    | Défaut     |
|-------------|---------|------------|
| localcss    | Boolean | false      |

Indique si le composant utilise des fichiers CSS locaux ou distants. Ce paramètre permet notamment de pouvoir utiliser le composant dans un contexte hors ligne.  
Par défaut, les fichiers CSS des bibliothèques Bootstrap et Bootstrap Icons sont chargées via les liens:

- https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
- https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css

Si la propriété localcss est activée (`localcss="1"`) alors le composant essaie de charger les fichiers suivants:

- "./bootstrap/css/bootstrap.min.css"
- "./bootstrap-icons/bootstrap-icons.css"
- "./global.css"

Exemple: `localcss="1"`

### title

| Propriété | Type   | Défaut     |
|-----------|--------|------------|
| title     | String | null       |

Titre du composant.
Si le paramètre `filter` ou `search` est utilisée, la valeur recherché peut être affiché respectivement via les variables `%filter%` et `%search%`.  

Des variables calaculées à partir des données peuvent également être ajoutées dans le titre. Elles sont de la forme `%operation,decimal,[line],[field]%`. Une seule variable peut être utilisée par ligne de texte.
- operation: "sum", "min", "max", "average", "percent", "value"
- decimal: nombre de décimal à afficher
- line: selection de la ligne ou valeur à afficher dans la série
- field: colonne à sélectionner pour définir la série à afficher (dans le cas de `dge-table`)

Exemples: 

- `title="Evolution de la population par commune"`
- `title="Nombre de projets pour l'année %filter%"` affiche "Nombre de projets pour l'année 2006" si on a ajouter un paramètre `filter` et si la valeur "2006" est sélectionnée dans la liste
- `title="Total: %sum,0,0,cout%"`

### animation

| Propriété | Type   | Défaut     |
|-----------|--------|------------|
| animation | Object | null       |

| Attribut   | Type    | Défaut              | Propriété éq. | Description                                                                            |
|------------|---------|---------------------|---------------|----------------------------------------------------------------------------------------|
| duration   | Integer | 1000                | animduration  | Durée de l'animation en millisecondes                                                  |
| easing     | String  | "easeOutQuart"      | animeasing    | Type d'animation (cf. [liste](https://www.chartjs.org/docs/3.3.1/configuration/animations.html#easing) |
| delay      | Integer | null                | animdelay     | Délai avant de lancer l'animation                                                      |
| loop       | Boolean | null                | animloop      | Si "true" l'animation tourne en boucle                                                 |

Propriété permettant de définir l'animation à l'affichage du graphique.
La liste des paramètres est celle de la proriété "animation" de Chartjs. Cf. https://www.chartjs.org/docs/latest/configuration/animations.html#animation

Exemple: `animation="duration:5000"`

### api

| Propriété   | Type   | Défaut       |
|-------------|--------|--------------|
| api         | String | "json"       |

Typde de source de données. Les valeurs possibles sont:

- "json": fichier JSON
- "csv": fichier CSV
- "wfs": flux WFS
- "dc4": API provenant d'une plateforme Data4Citizen

Exemple: `api="csv"`

### url

| Propriété   | Type   | Défaut      |
|-------------|--------|-------------|
| url         | String | false       |

URL de la source de données (cf. la propriété `api` pour connaîtres les sources de données possibles).

:material-arrow-right-bold-circle: Pour les flux WFS, le workspace doit être précisé.  
:material-arrow-right-bold-circle: Pour les fichiers JSON et CSV, le nom du fichier peut être indiqué dans la propriété `datasets`.

Exemples:

- `url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"`
- `url="https://dev.datagrandest.fr/data4citizen/d4c/api/records/1.0/search"`
- `url="./data/test.json"`
- `url="https://www.datagrandest.fr/tools/dge-dataviz-components/dge-components/data/test.csv"`

### datasets

| Propriété        | Type   | Défaut      |
|------------------|--------|-------------|
| datasets         | String | false       |

Nom du ou des jeux de données utilisés. Si plusieurs jeux de données sont précisés (exemples: plusieurs fichiers JSON ou CSV) il doivent être séprés par un "|" et provenir de la même source (propriété `url`).

:material-arrow-right-bold-circle: Pour un flux WFS il s'agit du ou des noms des couches de données ("layer").  
:material-arrow-right-bold-circle: Pour un fichier JSON ou CSV il s'agit du ou des noms de fichiers, extension comprise.

Un alias peut être donné aux datasets, notamment lors de l'utilisation de plusieurs sources de données. Il permet, comme dans le language SQL de préfixer le nom des champs dans d'autres propriété (`where`, `from`, etc.) et éviter les confusions. 

Exemples:

- `datasets="commune_actuelle"`
- `datasets="commandes.csv,cmd|contact.csv,cnt"`

### max

| Propriété        | Type    | Défaut      |
|------------------|---------|-------------|
| max              | Integer | false       |

Nombre d'entité à retourner lors de l'appel à l'API.  
Cette propriété est notamment à utiliser avec les API `wfs` et `d4c` quilimitent par défaut le nombre de données retournées.

Exemple: `max="500"`

### fields

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| fields         | String | false       |

Liste des champs renvoyé lors de la récupération des données. Cette propriété est obligatoire dans le cas de l'utilisation de plusieurs datasets. 
La liste doit d'ailleurs dans ce cas respecter l'ordre des sources de données définies dans la propriété `datasets=""`.

Cette propriété est également conseillée pour les flux WFS. Elle permet d'alléger le volume de données en évitant que le serveur renvoi les géométries au format GeoJSON. 
Ce paramètre n'a pas d'influence avec les sources de données Data4Citizen et les fichiers JSON et CSV.

Le séparateur de champ est ",". Si plusieurs datasets sont précisés, les champs doivent être indiqué dans l'ordre des datasets, séparés par des "|".

Exemples: 

- `fields="id,code,name,color"`
- `fields="id,code_id,name,color|id,code,value"`

### from

| Propriété    | Type   | Défaut      |
|--------------|--------|-------------|
| from         | String | false       |

Propriété qui permet dans le cas de l'utilisation de plusieurs datasets de préciser la jointure entre les sources de données. 
Elle est équivalente à la partie "FROM" de la requête SQL ou le nom des tables est remplacé par des "?", en respectant l'ordre défini dans la propriété `datasets=""`.

Exemple: `? AS table1 join ? AS table2 ON table1.field2=table2.field1 JOIN ? AS table3 ON table1.field3=table3.field1`

### where

| Propriété     | Type   | Défaut      |
|---------------|--------|-------------|
| where         | String | false       |

Filtre appliqué sur les données récupérées. Il correspond à la partie "WHERE" de la requête SQL.
Si la valeur recherchée est une chaïne de caractères il faut l'encadrer avec des apostrophes ("'"). Cla n'est pas nécessaire pour les nombres. La conversion des chaînes en nombre peux dépendre de la source de données.

Exemples: 

- `where="commande=3`
- `where="object='cahier'`

### groupby

| Propriété       | Type   | Défaut      |
|-----------------|--------|-------------|
| groupby         | String | false       |

Propriété permettant de grouper les résultats selon un champ (une "catégorie" ou un "type" par exemple). 

Pour les graphiques, elle fonctionne en général conjointement à une formule de regroupement sur les ordonnées (ex.: `y="SUM(values)"`). 
Les formulaes de regroupement sont celles du SQL: "SUM", "MIN", "MAX", "COUNT", "AVG".

Exemples: `groupby="category"`

### having

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| having         | String | false       |

Propriété fonctionnant en lien avec `groupby=""` (et `y=""`). Comme dans le cadre des requêtes SQL, elle permet de réaliser un filtre sur le résultat d'un regroupement, là ou la propriété `where=""` permet un filtre sur les éléments retournés avant leur regroupement. 
On aura donc conjointement par exemple: `y="SUM(values),somme" groupby="categorie" having="somme>100"`.

Exemple: `having="somme>100"`

### orderby

| Propriété       | Type   | Défaut      |
|-----------------|--------|-------------|
| orderby         | String | false       |

Propriété qui permet de trier et afficher les résultats d'une requête par ordre croissant (`ASC`) ou décroissant (`DESC`) selon un ou plusieurs champs (séparateur "|").

Exemple: `orderby="type,DESC"`

### filter

Affichage d'une liste de sélection pour filtrer les données.

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| filter         | String | false       |

Ce paramètre se compose de 3 parties:

- Le texte à afficher par défaut quand aucune valeur n'est sélectionnée (si cette valeur est vide, aucune valeur par défaut n'est utilisée)
- Le champ à utiliser pour le filtre
- Eventuellement une valeur de filtre prédéfinie

Exemples:

- `select="Sélectionner un EPCI|epci"`
- `select="Sélectionner une commune|f4|Strasbourg"`
- `select="|year|"`

### search

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| search         | String | false       |

Affichage d'une barre de recherche pour filtrer les données.

Ce paramètre se compose de 3 parties:

- Le texte à afficher par défaut dans la barre de recherche
- Le champ à utiliser pour le filtre
- Eventuellement une valeur de filtre prédéfinie

Dans le cas de l'utilisation de la propriété `sql`, il faut utiliser ici le nom de l'alias du champ de recherche.

Exemples:

- `select="Rechercher un EPCI|epci"`
- `select="Rechercher une commune|f4|Str"`

### x

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| x              | String | false       |

Données à afficher en abscisse du graphique. Il s'agit du nom d'une colonne ou d'une opération SQL sur les colonnes du jeu de données.

Exemple: `x="nom_commune"`

### y

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| y              | String | false       |

Données à afficher en ordonnées du graphique. Il est possible d'indiquer plusieurs champs séparés par "|" dans le cas de l'ajout de plusieurs séries de données à un graphique. 
Il est également possible de préciser un alias séparé par une virgule "," dans le cas d'une valeur calculée.

Exemple:

- `y="superficie"`
- `y="superficie|population"`
- `y="prix*quantite,cout"`
- `y="prix*quantite,cout|total"`

### xaxis

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| xaxis          | String | false       |

Propriété permettant de configurer l'axe des abscisses. La notation se fait sous la forme `clé:valeur` séparées par des virgules (`,`).
L'axe des abscisses est unique.

Les propriétés disponibles sont:

- type: type d'axe des abscisses (valeurs: `linear|logarithmic|category|time|timeseries`)

Exemple:

- `x=type:time`

### yaxis

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| yaxis          | String | false       |

Propriété permettant de configurer l'axe des ordonnées des différentes séries de données. La notation se fait sous la forme `clé:valeur` séparées par des virgules (`,`).
Chaque axe des ordonnées peut être configuré séparémment. le séparateur est `|`.

Les propriétés disponibles sont:

- start: précise si l'axe commence à la valeur 0 ou à une valeur proche du minimal de la série (valeurs: `0|1`)
- position: précise ou placer l'axe (valeurs: `left|right`)
- drawGrid: précise si les lignes de la grille doivent être affichées (valeurs: `0|1`)

Exemple:

- `yaxis="start:1,position:left|start:0,position:right,drawGrid:0"`

### chart

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| chart          | String | false       |

Type de graphique utilisé pour la représentation des données. 
Les type de graphiques possible sont (cf. librairie ChartJS):

- "bar": représentation en barres
- "line": représentation sous forme de ligne
- "pie": représentation sous forme de camembert
- "doughnut": représentation sous forme de donuts
- "polarArea": représentation sous forme de polarArea
- "radar": représentation sous forme de radar

A cela s'ajout pour les diahrammes en barres les variantes suivantes:

- "bars": graphique en barres avec des couleurs différentes pour chaque barre
- "bar-h": graphique en barres horizontales
- "bars-h": graphique en barres horizontales avec avec des couleurs différentes pour chaque barre
- "bar-s": graphique en barres superposées
- "bar-s": graphique en barres superposées avec avec des couleurs différentes pour chaque barre
- "gauge": graphiuqe sous forme de jauge

Le type gauge dispose de sa propre propriété `gauge=`. Elle définie un ensemble de paramètre permettant de mettre en forme la jauge.
Exemple: `gauge="circumference:270;rotation:-135;cutout:75%;radius:98%;borderRadius:2;offset:15"` (paramètre par défaut)

### width et height

| Propriété      | Type    | Défaut      |
|----------------|---------|-------------|
| width          | Integer | 4           |
| height         | Integer | 3           |

Propriétés permettant de définir la largeur (`width`) et la hauteur du grphique (`height`). Les dimensions sont calculées automatiquement de façon responsive à partir du rapport entre la hauteur et la largeur. Par défaut ces valeurs sont respectivement de 4 et 3 soit un rapport de 4/3.

Exemple: `width="4" height="1"`

### colors

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| colors         | String | false       |

Par défaut, les couleurs du graphiques sont générées aléatoirement. 
Il est possble de définir des couleurs fixes par série via la propriété `colors=""`. Le séparateur entre les séries est "|".
Pour le type `bars` il est possible de préciser la couleur de chaque barre si le nombre de données représentées est connu. Le séparateur entre les barres d'un même série est `;`.

Exemple: `colors="rgba(226,58,112,0.5)|rgba(52,85,186,0.5)"`

### legend

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| legend         | Object | false       |

| Attribut      | Type    | Défaut              | Propriété éq. | Description                                                                            |
|---------------|---------|---------------------|---------------|----------------------------------------------------------------------------------------|
| display       | Boolean | true                | --            | Afficher la légende                                                                    |
| position	    | String  | "top"               | --            | Postiond e la légende                                                                  |
| align         | Integer | "center"            | --            | Alignement de la legend                                                                |
| maxHeight     | Number  | null                | --            | Hauteur maximale de la légende en pixels                                               |
| maxWidth      | Number  | null                | --            | Largeur maximale de la légende en pixels                                               |
| fullSize      | Boolean | true                | --            | Utiliser la taille maximale possible du canvas                                         |
| reverse       | Boolean | false               | --            | Afficher les données ens esn inverse dans la légende                                   |
| labels        | Object  | null                | --            | Configuration des étiquettes dans la légende                                           |
| rtl           | Boolean | false               | --            | Afficher la legende de droite à gauche                                                 |
| textDirection | String  | null                | --            | Forcer la direction du texte                                                           |
| title         | Object  | null                | --            | Configuration du titre de la légende                                                   |

Propriété permettant de configurer la légende. La notation se fait sous la forme `clé:valeur` séparées par des virgules (`,`).  
Les propriétés disponibles sont celles de la librairie chartjs: [options de lengende](https://www.chartjs.org/docs/latest/configuration/legend.html).
Les propriétés de type "Object" et 'Function" ne sont pas implémentées et n'ont pas été testées.

Exemple: `legend=display:false`

### labels

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| labels         | String | false       |

Propriété permettant de préciser le nom des étiquettes pour les valeurs des abscisses (x).

Exemple: `labels="OUI|NON|NE SAIS PAS"` 

### reverse

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| reverse        | String | false       |

Propriété permettant de transposer les données, c'est à dire inverser les séries en colonne en ligne. Les en-têtes de colonnes deviennent alors les valeurs d'abscisse (x). Cette propriété doit être utilisée conjointement à la proriété `labels` car par défaut ce sont les paramètres de type `y0`, `y1`, etc. qui sont utilisés comme nom de colonne pour les ordonnées (y).

Exemple: `reverse="true"`

### refresh

| Propriété      | Type    | Défaut      |
|----------------|---------|-------------|
| refrtesh       | Integer | false       |

Propriété permettant de recharger régulièrement les données pour mettre à jour le graphique à interval de temps régulier sans recharger la page (l'interval est exprimé en secondes).  
Cela peut-être utile notamment dans le cas de données mises à jour en temps réel.
Si plusieurs sources de données sont indiquées, le rafraichissement est valable pour l'ensemble des datasets.

Exemple: `refresh="60"` pour une mise à jour toutes les minutes

### textcenter

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| textcenter     | Object | false       |

| Attribut   | Type    | Défaut              | Propriété éq. | Description                                                                                  |
|------------|---------|---------------------|---------------|----------------------------------------------------------------------------------------------|
| label      | String  | ""                  | tclabel       | Texte à afficher                                                                             |
| fontsize   | Integer | 30                  | tcfontsize    | Taille du texte proportionnellement à la place disponible                                    |
| fontfamily | String  | "Arial, sans-serif" | tcfontfamily  | Font du texte à afficher                                                                     |
| lineheight | String  | null                | tclineheight  | Lien vers un site internet                                                                   |
| fontstyle  | String  | ""                  | tcfontstyle   | Style du texte (ex.: "italic")                                                               |
| fontweight | String  | "normal"            | tcfontweight  | Mettre le texte en gras (ex.: "bold")                                                        |
| color      | String  | "rgba(0,0,0,1)"     | tccolor       | Couleur du texte (ex.: "#393" ou "#99564c" ou "rgba(50,200,35,0.6)                           |
| align      | String  | "center"            | tcalign       | Alignement du texte: "center", "left", "right"                                               |
| baseline   | String  | "middle"            | tcbaseline    | Alignement du texte par rapport à la ligne d'écriture: "middle", "top", "bottom"             |
| x          | String  | 0                   | tcx           | Décallage du texte en "x"                                                                    |
| y          | String  | 0                   | tcy           | Décallage du texte en "y"                                                                    |

Propriété permettant d'afficher un texte au centre du graphique (de type doughnut ou gauge de préférence).  
Le texte peut être sur plusieurs lignes. Le séparateur "|" est utilisé entre les ligne de la façon suivante: `textcenter="line1|line2|line3"`.  
Chaque ligne est décrite selon plusieurs paramètres séparés par des ";" (cf. exemple ci-dessous).  
Paffichage d'une seule ligne, les propriétés équivalentes peuvent aussi être utilisdées (ex.: `tclabel="Mon texte" tccolor="#f00"`)

A noter également que des variables peuvent être ajoutées pour intégrer des informations chiffrées. Elles sont de la forme `%operation,decimal,[line],[field]%`. Une seule variable peut être utilisée par ligne de texte.
- operation: "sum", "min", "max", "average", "percent", "value"
- decimal: nombre de décimal à afficher
- line: selection de la ou des lignes prendre en compte dans le calcul par son numéro d'ordre (séprateur '-': 0-1-2). Cette information permet par exemple de calculer une somme ou un pourcentage partiel des données affichées.
- field: nom du champ à prendre en compte (à utiliser quand les données sont composée de plusieurs champs comme par exemple pour choisir la colonne d'une table à prendre en compte)

Exemple: `textcenter="label:OUI;color:rgba(120,180,60,1);baseLine:middle;fontSize:12;fontFamily:Arial;fontStyle:normal;fontWeight:normal;y:40|label:%percent,2,0-1%%;color:rgba(180,120,60,1);baseLine:middle;fontSize:15;fontWeight:bold;fontFamily:Arial;y:50;x:20"`

## Etiquettes

Pour la gestion des étiquettes ou "labels", `dge-chart` utilise le plugin [`chartjs-plugin-datalabels`](https://chartjs-plugin-datalabels.netlify.app/).
La correspondance entre les propriétés de `dge-chart` et de `chartjs-plugin-datalabels` est présentée dans le tableau ci-dessous.
Au lieu d'utiliser des propriétés séparées, il est également possible d'utiliser une seule proriété `datalabels` en précisant l'ensemble des valeurs séparées par des ";" sur le modèle suivant: `datalabels="display:true;displayLimit:false;color:rgba(240,240,240,1);align:center;anchor:center;format:percent,2;unit:%"`. 

Pour plus d'informations, vous pouvez vous référer à la [documentation de chartjs-plugin-datalabels](https://chartjs-plugin-datalabels.netlify.app/guide/options.html).

| chartjs-plugin-datalabels | dge-chart         |
|---------------------------|-------------------|
|anchor                     |dlanchor           |
|align                      |dlalign            |
|backgroundColor 	        |dlbackgroundcolor  |
|borderColor 	            |dlbordercolor      |
|borderRadius               |dlborderradius     |
|borderWidth                |dlborderwidth      |
|clamp                      |dlclamp            |
|clip                       |dlclip             |
|color 	                    |dlcolor            |
|display                    |dldisplay          |
|                           |dlfont
|font.family                |dlfontfamily       |
|font.size                  |dlfontsize         |
|font.style                 |dlfontstyle        |
|font.weight                |dlfontweight       |
|font.lineHeight            |dlfontlineheight   |
|labels                     |dllabels           |
|listeners                  |dllisteners        |
|offset                     |dloffset           |
|opacity                    |dlopacity          |
|                           |dlpadding          |
|padding.top                |dlpaddingtop       |
|padding.right              |dlpaddingright     |
|padding.bottom             |dlpaddingbottom    |
|padding.left               |dlpaddingleft      |
|rotation                   |dlrotation         |
|textAlign                  |dltextalign        |
|textStrokeColor 	        |dltextstrokecolor  |
|textStrokeWidth            |dltextstrokewidth  |
|textShadowBlur             |dltextshadowblur   |
|textShadowColor            |dltextshadowcolor  |
|                           |dlformat           |

Il y a 3 proprités qui sont spécifiques à `dge-chart` et n'ont pas d'équivalent dans `chartjs-plugin-datalabels`:

- `dlpadding`: elle permet de définir la propriété `padding` en une seule propriété de la forme: `padding="5,12,5,10"`
- `dlfont`: elle permet de définir la proporiété `font` en une seule propriété de la forme: `font="family:Arial,size:15,style:normal,weight:bold,lineHeight:1.5"`
- `dlformat`: elle permet de définir le format de l'étiquette à affichier. Les valeurs sont:
  - `value` (par défaut): valeur de l'abscisse
  - `label`: valeur de l'ordonnée
  - `percent,2`: valeur de l'abscisse en pourcentage du total. Le chiffre correspond au nombre de décimal après la virgule

!!! Todo "Portée des options"
    La configuration des étiquettes est définie pour l'ensemble du graphique. `dge-chart` ne prend pas en charge la définition au niveau des séries de données (dataset).

!!! Todo "Propriétés dynamiques (fonctions)"
    Dans `dge-chart` les propriétés ne peuvent prendre que des valeurs statics. L'utilisation de fonctions n'est actuellement pas possible.

!!! example "Etiquettes"

    === "HTML"

        ``` html
        <dge-chart 
            id="dge-chart-6" 
            title="Chiffres clés des dépenses" 
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr" 
            max="10000" 
            api="csv" 
            url="data/ca-region.csv" 
            fields="BGT_MTREAL,BGT_CONTNAT_LABEL,BGT_CODRD,BGT_ANNEE" 
            groupby="BGT_CONTNAT_LABEL"
            orderby="mtreal"
            where="BGT_CODRD = 'dépense' AND BGT_ANNEE = 2020" 
            x="BGT_CONTNAT_LABEL" 
            y="SUM(BGT_MTREAL),mtreal" 
            chart="doughnut"
            legend="position:top,display:false"
            padding="0,80,80,80"
            dldisplay="true"
            dldisplaylimit="100000000"
            dlborderradius="4"
            dlcolor="#666"
            dlfontweight="bold"
            dlpaddingtop="6"    
            dlpaddingright="6"    
            dlpaddingleft="6"    
            dlpaddingbottom="6"
            dlalign="end"
            dlanchor="end"
            dlunit=" €"
            />
        ```

    === "Data"

        Cf. fichier ["data/ca-region.csv"](data/ca-region.csv).

    === "Résultat"

        <div style="width:80%">
            <dge-chart 
                id="dge-chart-6" 
                title="Chiffres clés des dépenses" 
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr" 
                max="10000" 
                api="csv" 
                url="data/ca-region.csv" 
                fields="BGT_MTREAL,BGT_CONTNAT_LABEL,BGT_CODRD,BGT_ANNEE" 
                groupby="BGT_CONTNAT_LABEL"
                orderby="mtreal"
                where="BGT_CODRD = 'dépense' AND BGT_ANNEE = 2020" 
                x="BGT_CONTNAT_LABEL" 
                y="SUM(BGT_MTREAL),mtreal" 
                chart="doughnut"
                legend="position:top,display:false"
                padding="0,80,80,80"
                dldisplay="true"
                dldisplaylimit="100000000"
                dlborderradius="4"
                dlcolor="#666"
                dlfontweight="bold"
                dlpaddingtop="6"    
                dlpaddingright="6"    
                dlpaddingleft="6"    
                dlpaddingbottom="6"
                dlalign="end"
                dlanchor="end"
                dlunit=" €"  
                />
        </div>


## Type de graphiques

Les exemples suivants présentent les types de graphiques possibles, sans toute fois être exaustif.

!!! example "Graphique en barres"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="bar" />
    </div>

!!! example "Graphique en lignes"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="line" />
    </div>

!!! example "Graphique en radar"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="radar" />
    </div>

!!! example "Graphique en camembert"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="pie" />
    </div>

!!! example "Graphique en donuts"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="doughnut" />
    </div>

!!! example "Graphique en aire polaire"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="polarArea" />
    </div>

!!! example "Graphique en barres horizontales"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            fields="population,ville"
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="bar-h" />
    </div>

!!! example "Graphique en barres superposées"
    <div style="width:50%">
        <dge-chart id="dge-chart-1" 
            title="Répartition hommes/femmes par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            fields="population,ville"
            x="ville" 
            y="population*0.55,femmes|population*0.45,hommes"
            series="Femmes|Hommes"
            chart="bar-s" />
    </div>

!!! example "Graphique de type 'jauge' avec icon de sources et de téléchargement du graphique et des données"
    <div style="width:50%">
        <dge-chart 
            id="dge-chart-gauge" 
            api="csv" 
            url="data/gauge.csv" 
            fields="a,b" 
            x="a" 
            y="b" 
            series="Oui/Non" 
            chart="gauge" 
            title="Total: %sum,0% votes"
            colors="rgba(2,150,2,0.5);rgba(20,90,186,0.5)"
            animation="duration:5000"
            gauge="circumference:270;rotation:-90"
            textcenter="label:OUI;color:rgba(120,180,60,1);baseLine:middle;align:center;fontSize:12;fontFamily:Arial;fontStyle:normal;fontWeight:normal;y:0;x:0|label:%percent,2,0%%;color:rgba(180,120,60,1);baseLine:middle;align:center;fontSize:15;fontWeight:bold;fontFamily:Arial;y:0"
            dldisplay="true" dldisplaylimit="0" dlcolor="#eee" dlalign="center" dlanchor="center" dlformat="percent,2" dlunit="%"
            download="icon:cloud-download;size:1rem" attribution="icon:info-circle;url:https://www.datagrandest.fr;title:Source: DataGrandEst" datalink="icon:table;title:Lien vers les données;url:data/gauge.csv"
             />
    </div>

!!! example "Graphique de type 'nuage de mots'"
    <div style="width:50%">
        <dge-chart id="dge-chart-wordcloud" api="csv" url="data/wordcloud.csv" fields="word,val" x="word" y="val" chart="wordCloud" title="Word Cloud Test" legend="display:false" download="text:télécharger" attribution="text:DataGrandEst;url:https://www.datagrandest.fr" />
    </div>

!!! example "Graphique de type 'treemap'"
    <div style="width:50%">
        <dge-chart id="dge-chart-treemap" api="csv" url="data/ca-region.csv" fields="BGT_CONTNAT_LABEL,BGT_MTREAL" x="BGT_CONTNAT_LABEL" y="sum(BGT_MTREAL),montant" series="Budget Région" chart="treemap" groupby="BGT_CONTNAT_LABEL" treemap="decimal:2;unit: €"
                    title="Tree" colors="rgba(20,90,186,0.5)" colorgradient="true" />
    </div>
                
!!! example "Graphique de type 'barre horizontale stacked'"
    <div style="width:100%">
        <dge-chart id="dge-chart-bar-s" height="1" width="6" api="csv" url="data/gauge2.csv" fields="id,question,oui,non,saispas" x="question" y="oui|non|saispas" series="OUI|NON|NE SAIS PAS" 
        chart="bar-hs" _title="Total: %sum,0% réponses" title="Quelles sont vos préférence? (détails)" colors="rgba(2,150,2,0.5)|rgba(180,50,26,0.5)|rgba(20,90,186,0.5)"
        animation="duration:5000" where="id=1 OR id=2"
        dldisplay="true" dldisplaylimit="8" dlcolor="#eee" dlalign="center" dlanchor="center" dlformat="percent"
        dlunit="%" />
    </div>

## Exemples

Pour plus de détails, vous pouvez consulter la page de [démo](examples-chart.md).