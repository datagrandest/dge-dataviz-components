# DGE Figure

Un composant pour afficher facilement un chiffre ou un indicateur.

<div style="width:40%">
    <dge-figure 
        id="dge-figure-1" 
        icon="bounding-box-circles" 
        unit="m²" 
        text="Contenance totale des propriétés foncières de la Région Grand Est"
        attribution="text:DataGrandEst;url:https://www.datagrandest.fr" 
        api="wfs" 
        url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs" 
        datasets="propriete_fonciere_region" 
        max="200" 
        operation="sum|contenance" 
        filter="" 
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

| Propriété | Type   | Défaut     |
|-----------|--------|------------|
| id        | String | "dge-figure" |

Identifiant du composant. Il peut être utilisé pour appliquer une mise en forme spécifique via du CSS.

Exemple: `id="dge-figure-1"`

### attribution

| Propriété   | Type   | Défaut     |
|-------------|--------|------------|
| attribution | Object | false      |

| Attribut | Type   | Défaut | Propriété  équivalente | Description                                                                                  |
|----------|--------|--------|------------------------|----------------------------------------------------------------------------------------------|
| text     | String | null   | attributiontext        | Texte à afficher qude support au lien vers le site indiqué (cf. attribut `url`)              |
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

### text

| Propriété   | Type   | Défaut     |
|-------------|--------|------------|
| text        | String | null       |

Texte affiché sous le chiffre ou indicateur pour expliquer sa signification. 
Si le paramètre `filter` ou `search` est utilisée, la valeur recherchée peut être affiché respectivement via les variables `%filter%` et `%search%`.

Exemples:

- `text="Nombre de projets"`
- `text="Nombre de projets pour l'année %filter%"` affiche "Nombre de projets pour l'année 2006" si on a ajouter un paramètre `filter` et si la valeur "2006" est sélectionnée dans la liste.

### unit

| Propriété   | Type   | Défaut     |
|-------------|--------|------------|
| unit        | String | null       |

Unité à affichier après le chiffre ou indicateur.

Exemples:

- `unit="m²"`
- `unit="€"`

### operation

| Propriété   | Type   | Défaut       |
|-------------|--------|--------------|
| operation   | String | ""           |

Opération à réaliser sur les données pour calculer l'indicateur à afficher. 
Le champ utilisé doit être numérique.

Cette propriété est composée de 2 parties séparées par un "|".  
La première correspond à l'opération a effectuer et la seconde au champ à prendre en compte.

Les operations possibles sont inspirées du langage SQL:

- "average": moyenne
- "sum": somme
- "min": minimum
- "max": maximum
- "count": compte le nombre de valeurs
- "value": affiche la valeur du résultat demandé

Exemples:

- `operation="sum|habitants"` (Affiche la somme de la colonne `habitants`)
- `operation="value|quantité"` (Affiche la première ligne du résultat. Peut être utilisé avec la propriété `filter` pour cibler une ligne particulière.)
- `operation="value|sum(prix*quantité)"` (Equivalent à `operation="sum|prix*quantité"`)

### decimal

| Propriété | Type    | Défaut      |
|-----------|---------|-------------|
| decimal   | Integer | 0           |

Nombre de decimal à afficher après la virgule.

Exemple: `decimal="2"`

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


### datalink

| Propriété        | Type   | Défaut      |
|------------------|--------|-------------|
| datalink         | Object | false       |


| Attribut | Type   | Défaut | Propriété  équivalente | Description                                                                                  |
|----------|--------|--------|------------------------|----------------------------------------------------------------------------------------------|
| text     | String | null   | datalinktext           | Texte à afficher comme support au lien vers le site indiqué (cf. attribut `url`)              |
| icon     | String | null   | datalinkicon           | Nom de l'îcon (cf. bibliothèque "[Bootstrap Icons v1.7.x](https://icons.getbootstrap.com/)") |
| prefix   | String | null   | datalinkprefix         | Texte prefixant l'attribut `text`                                                            |
| url      | String | null   | datalinkurl            | Lien vers un site internet                                                                   |
| size     | String | 1rem   | datalinksize           | Taille de l'icon. L'unité doit être précisée (ex.: "1.5rem" ou "18px")                       |
| color    | String | #000   | datalinkcolor          | Couleur de l'icon (ex.: "#393" ou "#99564c" ou "rgba(50,200,35,0.6)")                        |
| title    | String | text   | datalinktitle          | Titre du texte ou de l'icon qui appraît au survol par la souris                              |

Propriété permettant de préciser sous forme de texte ou d'icon un lien vers les données sources.

Exemples: 

- `icon="text:data;url:https://datagrandest.fr/public/data/villes.csv"`
- `icontext="data" iconurl="https://datagrandest.fr/public/data/villes.csv"`


### icon

| Propriété    | Type   | Défaut      |
|--------------|--------|-------------|
| icon         | Object | false       |

| Attribut | Type   | Défaut | Propriété  équivalente | Description                                                                                  |
|----------|--------|--------|------------------------|----------------------------------------------------------------------------------------------|
| name     | String | null   | iconname               | Nom de l'îcon (cf. bibliothèque "[Bootstrap Icons v1.7.x](https://icons.getbootstrap.com/)") |
| size     | String | "48px" | iconsize               | Taille de l'icon. L'unité doit être précisée (ex.: "1.5rem" ou "18px")                       |
| color    | String | "#000" | iconcolor              | Couleur de l'icon (ex.: "#393" ou "#99564c" ou "rgba(50,200,35,0.6)")                        |
| position | String | "top"  | iconposition           | Position de l'icon: "top", "left", "right", "bottom"                                         |

Il est possible d'ajouter un icon à côté de l'indicateur grâce aux propriétés et attributs ci-dessus.  
DGE Dataviz Components utilise la bibliothèque [Bootstrap Icons](https://icons.getbootstrap.com/).

Exemples:

- `icon="name:people-fill;color:#393;size:60rem;position:left"`
- `iconname="people-fill"`

### iconsurl

**NON UTILISE ACTUELLEMENT**

URL/chemin vers la bibliothèque des icons (fichier SVG).

Exemple: `iconsurl=""./libs/bootstrap-icons/bootstrap-icons.svg#"`

### image

| Propriété    | Type   | Défaut      |
|--------------|--------|-------------|
| image        | Object | false       |

| Attribut | Type   | Défaut | Propriété  équivalente | Description                                                                                  |
|----------|--------|--------|------------------------|----------------------------------------------------------------------------------------------|
| url      | String | null   | imageurl               | Lien (URL) de l'image à afficher                                                             |
| position | String | "top"  | imageposition          | Poition de l'image: "top", "left", "right", "bottom"                                         |
| rounded  | String | false  | imagerounded           | Afficher l'image avec ou non des coins arrondis                                              |
| alt      | String | ""     | imagealt               | Texte à utiliser si l'image ne peut être affichée                                            |

Propriété permettant d'afficher une image au dessus, à droite, à gauche ou en dessous de l'indicateur.

Exemple: image="rounded:true;position:left;url:https://www.rue89strasbourg.com/wp-content/uploads/2020/11/33963593718-dcde964cd0-k.jpg"

### imageurl

| Propriété    | Type   | Défaut      |
|--------------|--------|-------------|
| imageurl     | String | false       |

Lien (URL) de l'image à afficher.

Exemple: `imageurl="https://www.rue89strasbourg.com/wp-content/uploads/2020/11/33963593718-dcde964cd0-k.jpg"`

### imageposition

| Propriété     | Type   | Défaut      |
|---------------|--------|-------------|
| imageposition | String | "top"       |

Poition de l'image: "top", "left", "right", "bottom".

Exemple: `imageposition="bottom"`

### imagerounded

| Propriété    | Type    | Défaut      |
|--------------|---------|-------------|
| imagerounded | Boolean | false       |

Afficher l'image avec ou non des coins arrondis.

Exemple: `imagerounded="true"`

### imagealt

| Propriété    | Type   | Défaut      |
|--------------|--------|-------------|
| imagealt     | String | ""          |

Texte à utiliser si l'image ne peut être affichée.

Exemple: `imagealt="Illustration de l'indicateur"`

### refresh

| Propriété      | Type    | Défaut      |
|----------------|---------|-------------|
| refresh        | Integer | false       |

Propriété permettant de recharger régulièrement les données pour mettre à jour l'indicateur à interval de temps régulier sans recharger la page (l'interval est exprimé en secondes).  
Cela peut-être utile notamment dans le cas de données mises à jour en temps réel.
Si plusieurs sources de données sont indiquées, le rafraichissement est valable pour l'ensemble des datasets.

Exemple: `refresh="60"` pour une mise à jour toutes les minutes

### value

| Propriété      | Type    | Défaut      |
|----------------|---------|-------------|
| value          | String  | false       |

Propriété permettant d'indiquer une valeur sans faire appel à une source de données externe du type API, flux ou fichier.  
Cela peut être intéressant pour générer la valeur directement avec du code dans la page.

Exemples: 

- `value="'156'"`
- `value="'<?php echo round($value, 2); ?>'"`

## Exemples

Pour plus de détails, vous pouvez consulter la page de [démo](examples-figure.md).