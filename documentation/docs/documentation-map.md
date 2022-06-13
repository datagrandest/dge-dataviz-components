# DGE Map

Un composant pour afficher facilement une carte.

<div style="width:40%">
    <dge-map 
        id="dge-map-1" 
        height="50vh" 
        attribution="text:DataGrandEst;url:https://www.datagrandest.fr" 
        api="geojson"
        url="./data/departements.geojson" 
        layersname="Départements" 
        center="48.6|7.6" 
        zoom="8" 
        fields="code,nom,site,logo" 
        labels="CODE,NOM,SITE,LOGO"
        queryable="departements.geojson"
        osm="true"
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

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| api       | String | "wms"  |

Format de la source de données cartographique: `wms` ou `geojson`.

Exemple: `api="geojson"`

### attribution

| Propriété   | Type   | Défaut |
| ----------- | ------ | ------ |
| attribution | Object | false  |

| Attribut | Type   | Défaut | Propriété équivalente | Description                                                                                  |
| -------- | ------ | ------ | --------------------- | -------------------------------------------------------------------------------------------- |
| text     | String | null   | attributiontext       | Texte à afficher qude support au lien vers le site indiqué (cf. attribut `url`)              |
| icon     | String | null   | attributionicon       | Nom de l'îcon (cf. bibliothèque "[Bootstrap Icons v1.7.x](https://icons.getbootstrap.com/)") |
| prefix   | String | null   | attributionprefix     | Texte prefixant l'attribut `text`                                                            |
| url      | String | null   | attributionurl        | Lien vers un site internet                                                                   |
| size     | String | 1rem   | attributionsize       | Taille de l'icon. L'unité doit être précisée (ex.: "1.5rem" ou "18px")                       |
| color    | String | #000   | attributioncolor      | Couleur de l'icon (ex.: "#393" ou "#99564c" ou "rgba(50,200,35,0.6)")                        |
| title    | String | text   | attributiontitle      | Titre du texte ou de l'icon qui appraît au survol par la souris                              |

Sources des données utilisées par le composant.
Cette propriété est de type object et se compose d'une liste d'attributs permettant de préciser le texte ou l'icon à afficher, l'URL, etc.

Exemple: `attribution="text:DataGrandEst;url:https://www.datagrandest.fr"`

### baselayer

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| baselayer | String | null   |

**Propriété qui sera supprimée au profit de `baselayers` dans une future verson de `dge-map`.**

Prorpiété permettant de préciser l'URL et le nom de la couche à afficher en fonds de carte.  
Le séparateur est ",". L'ordre de paramètres est `baselayer="url,layername,version,style"`.

Exemple: `baselayer="https://osm.datagrandest.fr/mapcache/?,relief"`

### baselayers

| Propriété  | Type   | Défaut |
| ---------- | ------ | ------ |
| baselayers | Object | null   |

| Attribut    | Type   | Défaut       | Propriété | Description                             |
| ----------- | ------ | ------------ | --------- | --------------------------------------- |
| url         | String | null         | --        | URL du flux WMS                         |
| layer       | String | null         | --        | Nom de la couche ("layer")              |
| format      | String | "image/jpeg" | --        | Format d'affichage des images           |
| style       | String | null         | --        | Nom du style à utiliser le cas échéant  |
| transparent | String | false        | --        | Gestion de la transparence de la couche |
| version     | String | 1.1.0        | --        | Version du flux WMS (1.1.0/1.1.1/1.3.0) |

Prorpiété visant à remplacer `baselayer`. Elle permet de préciser plusieurs couches de fonds WMS et leurs propriétés/attributs.

Exemple: `baselayers="url:https://osm.datagrandest.fr/mapcache/?;layer:relief|https://osm.datagrandest.fr/mapcache/?;layer:défault"`

### center;

| Propriété | Type   | Défaut |
| --------- | ------ | ------ | ----- |
| center    | String | "7.52  | 47.5" |

Coordonnées du centre de la carte à l'affichage.

Exemple: `center="7.42|47.9"`

### data

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| data      | String | null   |

| Attribut    | Type   | Défaut      | Propriété | Description                                     |
| ----------- | ------ | ----------- | --------- | ----------------------------------------------- |
| api         | String | null        | --        | Type de données à afficher (wms/geojson)        |
| url         | String | null        | --        | URL du flux WMS ou chemin du fichier JSON       |
| layers      | String | null        | --        | Liste des couches ou fichiers JSON à afficher   |
| formats     | String | "image/png" | --        | Formats d'affichage des images pour le flux WMS |
| styles      | String | null        | --        | Liste des styles à utiliser le cas échéant      |
| transparent | String | true        | --        | Gestion de la transparence de la couche         |
| versions    | String | 1.1.0       | --        | Versions du flux WMS (1.1.0 / 1.1.1 / 1.3.0)    |
| queryable   | String | 1.1.0       | --        | Liste des couches interrogeable                 |
| fields      | String | 1.1.0       | --        | Liste des champs à afficher si interrogeable    |
| labels      | String | 1.1.0       | --        | Alias des noms à afficher                       |
| filter      | String | 1.1.0       | --        | Filtre à appliquer pour l'affichage des données |

**Propriété devant remplacer `api`, `url`, `layers`, `layersname`, `fields`, `labels`, `styles`, `version`, `format`, `transparent`, `filters` et `queryable`. dans une future version de `dge-map`.**

Liste des couches (layers) à afficher.

Exemple: 

```html
data="
    url:https://www.datagrandest.fr/geoserver/region-grand-est/ows?;
    api:wms;
    layers:commune_actuelle_3857,commune_actuelle_centroide;
    layersname:Communes (poly),Commmunes (point);
    transparent:true;
    filters:id_epci='246700488';
    queryable:commune_actuelle_3857;
    fields:insee_com,nom_com,id_epci,epci_nom_complet;
    labels:INSEE,COMMUNE,EPCI ID,EPCI|

    url:./data/departements.geojson;
    layersname:Départements;
    api:geojson;
    fields:code,nom,site,logo;
    labels:CODE,NOM,SITE,LOGO;
    queryable:departements.geojson"
```

### fields

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| fields    | String | null   |

Liste des champs à afficher dans l'infobulle.

Exemple: `fields="insee_com|nom_com|id_epci|epci_nom_complet"`

### filters

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| filter    | String | null   |

Propriété permettant de filtrer les entittés affichées sur la carte.

Exemple: `filters="id_epci='246700488'"`

### formats

| Propriété | Type   | Défaut      |
| --------- | ------ | ----------- |
| formats   | String | "image/png" |

Format des couches WMS à afficher.

Exemple: `formats="image/jpeg"`

### gesturehandling

| Propriété       | Type    | Défaut  |
| --------------- | ------- | ------- |
| gesturehandling | Boolean | false   |

Indique si la touche "Contrôle" doit être appuyée pour pouvoir zoomer.

Exemple: `gesturehandling="true"`

### height

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| height    | String | "50vh" |

Hauteur de la carte.

Exemple: `height="400px"`

### id

| Propriété | Type   | Défaut     |
| --------- | ------ | ---------- |
| id        | String | "dge-text" |

Identifiant du composant. Il peut être utilisé pour appliquer une mise en forme spécifique via du CSS.

Exemple: `id="dge-text-1"`

### labels

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| height    | String | null   |

Alias du nom de chaque champ à afficher dans l'infobulle.

Exemple: `labels="INSEE|COMMUNE|EPCI ID|EPCI"`

### layers

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| layers    | String | null   |

Liste des layers à afficher dans le cas d'un flux WMS.

Exemple: `layers="url=commune_actuelle_3857|commune_actuelle_centroide"`

### layersname

| Propriété  | Type   | Défaut |
| ---------- | ------ | ------ |
| layersname | String | null   |

Liste des noms des layers qui sont affichés (pour la légende).

Exemple: `layersname="Communes (poly)|Commmunes (point)"`

### localcss

| Propriété | Type    | Défaut |
| --------- | ------- | ------ |
| localcss  | Boolean | false  |

Indique si le composant utilise des fichiers CSS locaux ou distants. Ce paramètre permet notamment de pouvoir utiliser le composant dans un contexte hors ligne.  
Par défaut, les fichiers CSS des bibliothèques Bootstrap et Bootstrap Icons sont chargées via les liens:

-   https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
-   https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css

Si la propriété localcss est activée (`localcss="1"`) alors le composant essaie de charger les fichiers suivants:

-   "./bootstrap/css/bootstrap.min.css"
-   "./bootstrap-icons/bootstrap-icons.css"
-   "./global.css"

Exemple: `localcss="1"`

### osm

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| osm       | String | false  |

Afficher le fond de carte OSM par défaut.

Exemple: `osm="true"`

### queryable

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| queryable | String | null   |

Nom de la couche interrogeable le cas échéant.

Exemple: `queryable="commune_actuelle_3857"`

### styles

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| styles    | String | null   |

Styles à utiliser pour mettre en forme les layers.

Exemple: `styles="workspace:default"`

### title

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| title     | String | null   |

Titre du composant.

Exemple: `title="Titre de mon composant DGE text"`

### transparent

| Propriété   | Type    | Défaut |
| ----------- | ------- | ------ |
| transparent | Boolean | true   |

Indique si le WMS affiché doit gérer la transparence (format `image/png` attendu dans ce cas).

Exemple: `transparent="false"`

### url

| Propriété | Type   | Défaut |
| --------- | ------ | ------ |
| url       | String | null   |

URL des données (flux WMS ou fichier GeoJson).  
Fonctionne en lien avec la propriété `layers` pour les flux de type WMS.  
Une des limites de ce composant est de ne pouvoir afficher des flux que d'un URL unique.

Exemple:

-   `url="./data/departements.geojson"`
-   `url="https://www.datagrandest.fr/geoserver/region-grand-est/ows?"`

### version

| Propriété | Type   | Défaut  |
| --------- | ------ | ------- |
| version   | String | "1.1.0" |

Version du flux WMS à afficher.

Exemple: `version="1.3.0`

### zoom

| Propriété | Type    | Défaut |
| --------- | ------- | ------ |
| zoom      | Integer | 10     |

Niveau de zoom initial de la carte.

Exemple: `zoom="10"`

## Exemples

Pour plus de détails, vous pouvez consulter la page de [démo](examples-map.md).
