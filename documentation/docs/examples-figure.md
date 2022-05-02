# DGE Figure - Exemples

Les exemples présentés ci-dessous vous permettent de mieux appréhender l'usage du composant DGE Figure.  

## Exemple 1: calcul d'un indicateur simple

Calcul et affichage de la somme des contenances des propriétés foncières de la Région Grand Est à partir d'un flux WFS GeoServer.
Cet exemple utilise un paramétrage CSS sur la mise en forme de l'indicateur (couleur et bordure).

!!! example "Exemple 1"

    === "HTML"

        ``` html
        <dge-figure id="dge-figure-1"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="wfs"
            url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
            fields="contenance" 
            datasets="propriete_fonciere_region" 
            max="200" 
            icon="bounding-box-circles" 
            operation="sum|contenance" 
            unit="m²" 
            filter=""
            localcss="1"
            text="Contenance totale des propriétés foncières de la Région Grand Est" />
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-figure id="dge-figure-1"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="wfs"
                url="https://www.datagrandest.fr/geoserver/region-grand-est/wfs"
                fields="contenance" 
                datasets="propriete_fonciere_region" 
                max="200" 
                icon="bounding-box-circles" 
                operation="sum|contenance" 
                unit="m²" 
                filter="" 
                localcss="1"
                text="Contenance totale des propriétés foncières de la Région Grand Est" />
        </div>


## Exemple 2: calcul d'un indicateur simple

Calcul et affichage du nombre d'habitants de la commune de Hegeney à partir d'un flux WFS GeoServer.
Cet exemple utilise un filtre sur le code INSEE de la commune à afficher.

!!! example "Exemple 1"

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
            icon="people-fill"
            operation="sum|pmun_rp2019"
            unit="hab."
            where="insee_com=67186"
            text="Commune de Hegeney (2019)" />
        ```

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
                icon="people-fill"
                operation="sum|pmun_rp2019"
                unit="hab."
                where="insee_com=67186"
                text="Commune de Hegeney (2019)" />
        </div>
