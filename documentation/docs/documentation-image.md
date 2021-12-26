# DGE Image

Un composant pour afficher facilement une image ou photo.

<div style="width:40%">
    <dge-image 
        id="dge-image-1" 
        title="Exemple d'image"
        attribution="Viago;url:https://viago.ca/top-10-des-activites-a-faire-au-japon/"
        src="https://viago.ca/wp-content/uploads/2017/09/Essentiels_Japon-768x432.jpg"
        legend="Essentiels Japon"
         />
</div>

## Liste des propriétés

Il existe 4 grands types de propriétés:

- "String": chaîne de caractères (ex.: `title="Un titre"`) 
- "Integer": Un nombre (ex.: `decimal="3"`) 
- "Boolean": une valeur binaire (vrai ou faux): "true"/"false" (ex.: `localcss="true"`) 
- "Objects": ensemble de couples clé/valeur inclus dans une propriété (Ex.: `property="att1:value1;att2:value2;att3:value3..."`). Dans ce cas, vous trouverez dans la documentation un tableau qui précise la nature de chaque attribut attendu. Pour certains attributs, ils peuvent aussi exister sous forme de propriété individuelle (ex: `attribution="text:DataGrandEst"` est équivalent à `attributiontext="DataGrandEst"`)

Il est important de respecter le type de valeur attendu par les propriétés et attributs pour le bon fonctionnement des composants web.

### id

| Propriété | Type   | Défaut      |
|-----------|--------|-------------|
| id        | String | "dge-image" |

Identifiant du composant. Il peut être utilisé pour appliquer une mise en forme spécifique via du CSS.

Exemple: `id="dge-image-1"`

### attribution

| Propriété   | Type   | Défaut     |
|-------------|--------|------------|
| attribution | Object | false      |

| Attribut | Type   | Défaut | Propriété  équivalente | Description                                                                                  |
|----------|--------|--------|------------------------|----------------------------------------------------------------------------------------------|
| text     | String | null   | attributiontext        | Texte à afficher comme support au lien vers le site indiqué (cf. attribut `url`)              |
| icon     | String | null   | attributionicon        | Nom de l'îcon (cf. bibliothèque "[Bootstrap Icons v1.7.x](https://icons.getbootstrap.com/)") |
| prefix   | String | null   | attributionprefix      | Texte prefixant l'attribut `text`                                                            |
| url      | String | null   | attributionurl         | Lien vers un site internet                                                                   |
| size     | String | 1rem   | attributionsize        | Taille de l'icon. L'unité doit être précisée (ex.: "1.5rem" ou "18px")                       |
| color    | String | #000   | attributioncolor       | Couleur de l'icon (ex.: "#393" ou "#99564c" ou "rgba(50,200,35,0.6)")                        |
| title    | String | text   | attributiontitle       | Titre du texte ou de l'icon qui appraît au survol par la souris                              |

Sources des données utilisées par le composant. 
Cette propriété est de type object et se compose d'une liste d'attributs permettant de préciser le texte ou l'icon à afficher, l'URL, etc.

Exemple: 

- `attribution="text:DataGrandEst;url:https://www.datagrandest.fr"`
- `attributiontext="DataGrandEst" attributionurl="https://www.datagrandest.fr"`

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

Exemple: `title="Titre de mon composant DGE image"`

### src

| Propriété   | Type   | Défaut     |
|-------------|--------|------------|
| src         | String | false      |

Source de l'image (URL).

Exemple: `src="https://viago.ca/wp-content/uploads/2017/09/Essentiels_Japon-768x432.jpg"`

### legend

| Propriété   | Type   | Défaut     |
|-------------|--------|------------|
| legend      | String | false      |

Légende de l'image. Ce texte est affiché sous l'image. 

Exemple: `legend="Ceci est une très belle illustration."`

## Exemples

Pour plus de détails, vous pouvez consulter la page de [démo](examples-image.md).
