---
hide:
    - navigation
    # - toc
---

# Des composants web de dataviz faciles à mettre en oeuvre

#### "DGE Dataviz Components" est un ensemble de composants web pour faciliter la construction de tableaux de bords simples mais efficaces à partir de sources données diverses.

<div class="row">
    <div class="col-4">
        <dge-table 
            id="dge-table-1" 
            api="csv" 
            url="data/villes.csv" 
            fields="id,ville,population,superficie" 
            labels="ID|VILLE|HBITANTS|KM²" 
            displaytotal="true" 
            displaypagination="true" 
            perpage="4"
            selectpages="2,4,8,16,32"
            smalltable="1"
            title="Liste des villes" />
    </div>
    <div class="col-4">
        <dge-figure 
            id="dge-figure-2"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            fields="population" 
            max="50"
            icon="name:people-fill"
            operation="sum|population"
            unit="hab."
            text="Population totale" />
    </div>
    <div class="col-4">
        <dge-chart
            id="dge-chart-1" 
            title="Population et superficie par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            x="ville" 
            y="population|superficie" 
            orderby="population"
            series="Nombre d'habitants|Superficie (ha)"
            chart="bar|line" />
    </div>
</div>

!!! Todo "Profil utilisateur"
    Il est préférable d'avoir des notions en HTML, voire CSS et Javascript. Quelques connaissances en gestion de données et SQL peuvent également être intéressantes même si elles ne sont pas indispensables.
    La mise en oeuvre de tels composants sera facilité si vous êtes par exemple webmasters, administrateur de site internet, développeur web, datascientists, etc. 

    Dans le cas contraire, ne fuyez pas tout de suite!
    La prise en mains de "DGE Dataviz Components" est relativement simple et peut se faire assez rapidement si vous êtes attentif et motivé.

[:material-file-document-multiple: Lire la documentation](documentation-start.md){ .md-button .md-button--primary }
[:material-test-tube: Voir les exemples](examples-figure.md){ .md-button }

## Les composants web disponibles

Actuellement, 5 composants web sont disponibles pour construire des tableaux de bord et autres dataviz:

* `dge-figure` pour l'affichade d'indicateurs chiffrés
* `dge-table` pour l'affichade de tableaux
* `dge-chart` pour l'affichade de graphiques
* `dge-text` pour l'affichade de textes (exemple: définition d'un indicateur, commentaire d'un graphique, etc.)
* `dge-image` pour l'affichade d'une image


## Les sources de données supportées

DGE Dataviz Components supporte 4 sources de données:

* Les fichiers **CSV**
* Les fichiers et API **JSON** simples (ex.: API NocoDB)
* L'**API Data4Citizen**
* Les flux OGC **WFS**

Pour plus d'information, vous pouvez vous référer à la section dédiée aux [sources de données](documentation-start.md#les-sources-de-donnees).