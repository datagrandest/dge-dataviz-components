# DGE table

Un composant pour afficher facilement un tableau.

<div style="width:40%">
    <dge-table 
        id="dge-table-1" 
        api="csv" 
        url="./data/test1.csv" 
        fields="id,couleur,objet,prix" 
        labels="ID|Couleur|Objet|Prix" 
        where="couleur='bleu'"
        title="Liste des fournitures de couleur bleue du fichier data/test1.csv"
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

### columns

| Propriété       | Type   | Défaut      |
|-----------------|--------|-------------|
| columns         | String | false       |

Ordre des champs pour l'affichage des colonnes de la table.

Exemples:
- `columns="id,ville,population"`
- `columns="commandes.id|objets.objet|objets.couleur|commandes.quantite|objets.prix|commandes.quantite*objets.prix,cout|contacts.nom"`

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

### displaytotal

| Propriété        | Type   | Défaut      |
|------------------|--------|-------------|
| displaytotal     | String | false       |

Propriété permettant d'afficher le nombre de lignes total en dessous du tableau.

Exemple: `dsplaytotal="1"`

### displaypagination

| Propriété           | Type   | Défaut      |
|---------------------|--------|-------------|
| displaypagination   | String | false       |

Propriété permettant d'afficher la pagination en bas de page.

Exemple: `displaypagination="1"`

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

- `filter="Sélectionner un EPCI|epci"`
- `filter="Sélectionner une commune|f4|Strasbourg"`
- `filter="|year|"`

### from

| Propriété    | Type   | Défaut      |
|--------------|--------|-------------|
| from         | String | false       |

Propriété qui permet dans le cas de l'utilisation de plusieurs datasets de préciser la jointure entre les sources de données. 
Elle est équivalente à la partie "FROM" de la requête SQL ou le nom des tables est remplacé par des "?", en respectant l'ordre défini dans la propriété `datasets=""`.

Exemple: `? AS table1 join ? AS table2 ON table1.field2=table2.field1 JOIN ? AS table3 ON table1.field3=table3.field1`

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

### id

| Propriété | Type   | Défaut     |
|-----------|--------|------------|
| id        | String | "dge-figure" |

Identifiant du composant. Il peut être utilisé pour appliquer une mise en forme spécifique via du CSS.

Exemple: `id="dge-figure-1"`

### klass

| Propriété | Type   | Défaut      |
|-----------|--------|-------------|
| klass     | String | ""          |

Classes CSS définies pour le composant. Attention, la propriété est "klass" et non "class"!

Exemple: `klass="primary-color"`

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

### labels

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| labels         | String | false       |

Alias des noms de colonnes à afficher dans l'ordre des colonnes définies par la propriété `columns`.

Exemples:

- `labels="ID|VILLE|POP. (HAB.)"`
- `labels="ID|OBJET|COULEUR|QUANTITE|PRIX (€)|COUT (€)|CONTACT"`

### max

| Propriété        | Type    | Défaut      |
|------------------|---------|-------------|
| max              | Integer | false       |

Nombre d'entité à retourner lors de l'appel à l'API.  
Cette propriété est notamment à utiliser avec les API `wfs` et `d4c` quilimitent par défaut le nombre de données retournées.

Exemple: `max="500"`


### orderby

| Propriété       | Type   | Défaut      |
|-----------------|--------|-------------|
| orderby         | String | false       |

Propriété qui permet de trier et afficher les résultats d'une requête par ordre croissant (`ASC`) ou décroissant (`DESC`) selon un ou plusieurs champs (séparateur "|").

Exemple: `orderby="type,DESC"`

### page

| Propriété           | Type   | Défaut      |
|---------------------|--------|-------------|
| page                | String | false       |

Propriété permettant d'indiquer la page à afficher au chargement du composant.

Exemple: `page="2"`

### pagination

| Propriété        | Type   | Défaut      |
|------------------|--------|-------------|
| pagination       | Object | false       |

| Attribut    | Type    | Défaut           | Propriété  équivalente | Description                                                 |
|-------------|---------|------------------|------------------------|-------------------------------------------------------------|
| display     | String  | false            | displaypagination      | Afficher la pagination en bas de page                       |
| perpage     | Integer | 10               | perpage                | Nombre de ligne à afficher par page                         |
| page        | Integer | 1                | page                   | Première page à afficher au chargement du composant         |
| selectpages | String  | "5,10,25,50,100" | selectpages            | Liste du nombre de lignes à afficher par page dans la table |

Propriété permettant d'afficher une barre de pagination sous le tableau.  
Elle reprend sous forme globale avec des attributs les propriétés `displaypagination`, `perpage`, `page` et `selectpages`.

Exemples: 

- `pagination="display:true;perpage:5"`
- `displaypagination="1" page="2"`

### parsehtml

| Propriété      | Type    | Défaut      |
|----------------|---------|-------------|
| parsehtml      | Boolean | false       |

Propriété permettant d'analyser les valeurs de la table et de les afficher au format HTML le cas échéant.

Ainsi:

- Toute valeur commençant par la chaîne "http" est intéprété comme un URL et un lien est créé automatiquement.
- Toute balise HTML est interprétée. La valeur `<b>en gras</b>` sera alors affichée en gras.

Exemple: `parsehtml="true"` pour activer la reonnaissance des liens et balises HTML

### perpage

| Propriété           | Type   | Défaut      |
|---------------------|--------|-------------|
| perpage   | String | false       |

Propriété permettant d'indiquer le nombre de ligne à afficher par page.

Exemple: `perpage="25"`

### properties

| Propriété       | Type   | Défaut      |
|-----------------|--------|-------------|
| properties      | String | false       |

Chemin vers la propriété contenant la liste des données à utiliser dans le résultat de la requête. Les propriétés doivent être séparées par un point ".".  
Si plusieurs jeux de données sont concernés, le séparateur entre les jeux de donénes est "|".

Exemples: 

- `properties="list"`
- `properties="|list|records.data"`

### refresh

| Propriété      | Type    | Défaut      |
|----------------|---------|-------------|
| refresh       | Integer | false       |

Propriété permettant de recharger régulièrement les données pour mettre à jour la table à interval de temps régulier sans recharger la page (l'interval est exprimé en secondes).  
Cela peut-être utile notamment dans le cas de données mises à jour en temps réel.
Si plusieurs sources de données sont indiquées, le rafraichissement est valable pour l'ensemble des datasets.

Exemple: `refresh="60"` pour une mise à jour toutes les minutes

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

- `search="Rechercher un EPCI|epci"`
- `search="Rechercher une commune|f4|Str"`

### selectpages

| Propriété           | Type   | Défaut           |
|---------------------|--------|------------------|
| selectpages         | String | "5,10,25,50,100" |

Propriété permettant de définir la liste du nombre de lignes à afficher via la pagination.

Exemple: `selectpages="6,12,24,48,96"`

### sortcolumns

| Propriété           | Type    | Défaut           |
|---------------------|---------|------------------|
| sortcolumns         | String  | ""               |

Activier le tri sur certaines colonnes du tableau indiquées avec le séparateur ',' (une double flêche apparaît à droite du titre de la colonne).  
Pour activer le tri sur toutes les colonnes utiliser `sortcolumns="true"`.

Exemple: `sortcolumns="nom, prenom, cmd_id"`


### smalltable

| Propriété      | Type   | Défaut      |
|----------------|--------|-------------|
| smalltable     | String | false       |

Propriété permettant de réduire l'espaces autour du texte dans le tableau pour le compacter afin qu'il prenne moins de place sur la page.

Exemple: `smalltable="1"`

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

### where

| Propriété     | Type   | Défaut      |
|---------------|--------|-------------|
| where         | String | false       |

Filtre appliqué sur les données récupérées. Il correspond à la partie "WHERE" de la requête SQL.
Si la valeur recherchée est une chaïne de caractères il faut l'encadrer avec des apostrophes ("'"). Cla n'est pas nécessaire pour les nombres. La conversion des chaînes en nombre peux dépendre de la source de données.

Exemples: 

- `where="commande=3`
- `where="object='cahier'`

## Exemples

Pour plus de détails, vous pouvez consulter la page de [démo](examples-table.md).
