# DGE Figure - Exemples

Les exemples présentés ci-dessous vous permettent de mieux appréhender l'usage du composant DGE Figure.  

## Exemple 1: calcul d'un indicateur simple avec mise en forme CSS

Calcul et affichage de la somme des contenances des propriétés foncières de la Région Grand Est à partir d'un flux WFS GeoServer.
Cet exemple utilise un paramétrage CSS sur la mise en forme de l'indicateur (couleur et bordure).

!!! example "Exemple 1"

    === "Résultat"

        <div style="width:50%">
            <dge-figure id="dge-figure-1"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="wfs"
                url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
                fields="contenance" 
                datasets="propriete_fonciere_region" 
                max="200" 
                iconname="bounding-box-circles" 
                operation="sum|contenance" 
                unit="m²" 
                filter="" 
                localcss="1"
                text="Contenance totale des propriétés foncières de la Région Grand Est" />
        </div>

    === "HTML"

        ``` html
        <dge-figure id="dge-figure-1"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="wfs"
            url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
            fields="contenance" 
            datasets="propriete_fonciere_region" 
            max="200" 
            iconname="bounding-box-circles" 
            operation="sum|contenance" 
            unit="m²" 
            filter=""
            localcss="1"
            text="Contenance totale des propriétés foncières de la Région Grand Est" />
        ```

    === "Data"

        Couche "propriete_fonciere_region" du flux WFS https://www.datagrandest.fr/geoserver/region-grand-est/wfs


## Exemple 2: calcul d'un indicateur simple avec un filtre sur les données

Calcul et affichage du nombre d'habitants de la commune de Hegeney à partir d'un flux WFS GeoServer.
Cet exemple utilise un filtre sur le code INSEE de la commune à afficher.

!!! example "Exemple 2"


    === "Résultat"

        <div style="width:50%">
            <dge-figure 
                id="dge-figure-2"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="wfs"
                url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
                fields="pmun_rp2019,insee_com"
                datasets="commune_actuelle"
                max="6000"
                icon="name:people-fill"
                operation="sum|pmun_rp2019"
                unit="hab."
                where="insee_com=67186"
                text="Commune de Hegeney (2019)" />
        </div>

    === "HTML"

        ``` html
        <dge-figure 
            id="dge-figure-2"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="wfs"
            url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
            fields="pmun_rp2019,insee_com"
            datasets="commune_actuelle"
            max="6000"
            icon="name:people-fill"
            operation="sum|pmun_rp2019"
            unit="hab."
            where="insee_com=67186"
            text="Commune de Hegeney (2019)" />
        ```

    === "Data"

        Couche "commune_actuelle" du flux WFS https://www.datagrandest.fr/geoserver/region-grand-est/wfs


## Exemple 3: calcul d'un indicateur simple avec affichage d'une image

Calcul et affichage de la contenance des proipriétés foncières de la Région Grand Est à partir d'un flux WFS GeoServer.
Cet exemple utilise une illustration sous forme d'image.

!!! example "Exemple 3"

    === "Résultat"

        <div style="width:50%">
            <dge-figure 
                id="dge-figure-3"
                api="wfs" 
                url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
                fields="contenance" 
                datasets="propriete_fonciere_region" max="200"
                image="rounded:true;position:top;url:https://www.rue89strasbourg.com/wp-content/uploads/2020/11/33963593718-dcde964cd0-k.jpg"
                operation="count|contenance" 
                datalink="icon:table;title:Lien vers les données"
                attribution="icon:info-circle-fill;title:DataGrandEst;url:https://www.datagrandest.fr" 
                unit=""
                localcss="1" 
                text="Propriétés foncières <br> de la Région Grand Est" />
        </div>

    === "HTML"

        ``` html
        <dge-figure 
            id="dge-figure-3"
            api="wfs" 
            url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
            fields="contenance" 
            datasets="propriete_fonciere_region" max="200"
            image="rounded:true;position:top;url:https://www.rue89strasbourg.com/wp-content/uploads/2020/11/33963593718-dcde964cd0-k.jpg"
            operation="count|contenance" 
            datalink="icon:table;title:Lien vers les données"
            attribution="icon:info-circle-fill;title:DataGrandEst;url:https://www.datagrandest.fr" 
            unit=""
            localcss="1" 
            text="Propriétés foncières <br> de la Région Grand Est" />
        ```

    === "Data"

        Couche "propriete_fonciere_region" du flux WFS https://www.datagrandest.fr/geoserver/region-grand-est/wfs




