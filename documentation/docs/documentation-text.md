# DGE text

Un composant pour afficher facilement du texte.

<div style="width:40%">
    <dge-text 
        id="dge-text-1" 
        text="Mon texte descriptif ici..." 
        title="Exemple de texte" 
        attribution="GéoGrandEst;url:https://www.datagrandest.fr" 
        />
</div>

## Liste des propriétés

Il existe 4 grands types de propriétés:

- "String": chaîne de caractères (ex.: `title="Un titre"`) 
- "Integer": Un nombre (ex.: `decimal="3"`) 
- "Boolean": une valeur binaire (vrai ou faux): "true"/"false" (ex.: `localcss="true"`) 
- "Objects": ensemble de couples clé/valeur inclus dans une propriété (Ex.: `property="att1:value1;att2:value2;att3:value3..."`). Dans ce cas, vous trouverez dans la documentation un tableau qui précise la nature de chaque attribut attendu. Pour certains attributs, ils peuvent aussi exister sous forme de propriété individuelle (ex: `attribution="text:DataGrandEst"` est équivalent à `attributiontext="DataGrandEst"`)

Il est important de respecter le type de valeur attendu par les propriétés et attributs pour le bon fonctionnement des composants web.

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

Exemple: `attribution="text:DataGrandEst;url:https://www.datagrandest.fr"`

### id

| Propriété | Type   | Défaut     |
|-----------|--------|------------|
| id        | String | "dge-text" |

Identifiant du composant. Il peut être utilisé pour appliquer une mise en forme spécifique via du CSS.

Exemple: `id="dge-text-1"`

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

Text à afficher dans le composant.

Exemple: `text="Texte de mon composant..."`

### title

| Propriété | Type   | Défaut     |
|-----------|--------|------------|
| title     | String | null       |

Titre du composant.

Exemple: `title="Titre de mon composant DGE text"`

## L'utilisation des `slots`

Le contenu du composant peut également être défini via un `slot`. Cela permet d'ajouter du code HTML pour mettre en forme le conteu du composant.  
Pour cela, il faut ajouter entre les balises du composant un élément HTML possédant une propriété `slot="text"`. Cet élément devra contenir à son tour le code HTML a afficher dans le composant.

Exemple:

``` html
<dge-text id="dge-text-2">
    <div slot="text">
        <h5>Le titre de mon texte dans le <em>slot</em></h5>
        <p class="m-0 p-0">Le texte avec un <em>slot</em> de mise en forme...<br />
            et la possibilité d'utiliser du <em>HTML</em>, par exemple ajouter un bouton.
        </p>
        <button type="button" class="btn btn-primary mt-3 float-right">Action</button>
    </div>
</dge-text>
```


## Exemples

Pour plus de détails, vous pouvez consulter la page de [démo](examples-text.md).
