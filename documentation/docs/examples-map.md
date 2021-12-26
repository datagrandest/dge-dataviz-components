# DGE Map - Exemples

Les exemples présentés ci-dessous vous permettent de mieux appréhender l'usage du composant DGE Chart.  

## Exemple 1: affichage d'une carte à partir d'un GeoJSON

Cet exemple montre notamment la détection automatique des URL et des images lors de l'affichage du popup d'interrogation d'un éléments (cf. Bas-Rhin).

!!! example "Exemple 1"

    === "HTML"

        ``` html
        <dge-map 
            id="dge-map-1" 
            height="50vh" 
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr" 
            center="48.6|7.75" 
            zoom="10" 
            api="geojson" 
            url="./data/departements.geojson" 
            layersname="Départements" 
            fields="code|nom|site|logo" 
            labels="CODE|NOM|SITE|LOGO" />
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-map 
                id="dge-map-1" 
                height="50vh" 
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr" 
                center="48.6|7.75" 
                zoom="10" 
                api="geojson" 
                url="./data/departements.geojson" 
                layersname="Départements" 
                fields="code|nom|site|logo" 
                labels="CODE|NOM|SITE|LOGO" />
        </div>


## Exemple 2: affichage d'une carte à partir d'un flux WMS GeoServer

Cet exemple montre les principales fonctionnalités actuellement disponibles: ajout d'un titre et des sources à la carte, définition du centre et du niveau de zoom initial, affichage de plusieurs couches, dont une interrogeable, configuration des champs à afficher dans l'infobulle et de leur alias, application d'un filtre sur les données récupérées (ici, les communes de l'EMS uniquement).

!!! example "Exemple 2"

    === "HTML"

        ``` html
        <dge-map 
            id="dge-map-2" 
            height="50vh" 
            title="Communes de l'EMS" 
            attribution="text:DataGrandEst,https://www.datagrandest.fr" 
            center="48.6|7.75" 
            zoom="10"
            url="https://www.datagrandest.fr/geoserver/region-grand-est/ows?" 
            api="wms" 
            layers="commune_actuelle_3857|commune_actuelle_centroide" 
            layersname="Communes (poly)|Commmunes (point)" 
            styles="" 
            version="1.1.0" 
            format="image/png" 
            transparent="1" 
            filters="id_epci='246700488'" 
            queryable="commune_actuelle_3857" 
            fields="insee_com|nom_com|id_epci|epci_nom_complet" 
            labels="INSEE|COMMUNE|EPCI ID|EPCI" />
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-map 
                id="dge-map-2" 
                height="50vh" 
                title="Communes de l'EMS" 
                attribution="text:DataGrandEst,https://www.datagrandest.fr" 
                center="48.6|7.75" 
                zoom="10"
                url="https://www.datagrandest.fr/geoserver/region-grand-est/ows?" 
                api="wms" 
                layers="commune_actuelle_3857|commune_actuelle_centroide" 
                layersname="Communes (poly)|Commmunes (point)" 
                styles="" 
                version="1.1.0" 
                format="image/png" 
                transparent="1" 
                filters="id_epci='246700488'" 
                queryable="commune_actuelle_3857" 
                fields="insee_com|nom_com|id_epci|epci_nom_complet" 
                labels="INSEE|COMMUNE|EPCI ID|EPCI" />
        </div>

## Exemple 3: modification du fond de carte à partir d'un flux WMS

Cet exemple montre, à partir de l'exemple précédent, comment utiliser la propriété `baselayer` pour changer le fond de carte par défaut (OSM).  
Le fond utilisé ici vient du [serveur OSM GéoGrandEst](https://osm.datagrandest.fr)

!!! example "Exemple 3"

    === "HTML"

        ``` html
        <dge-map 
            id="dge-map-3"
            height="50vh"
            title="Communes de l'EMS"
            attributions="GéoGrandEst,https://www.datagrandest.fr|OpenStreetMap,https://www.openstreetmap.org/copyright"
            center="48.6|7.75"
            zoom="10"
            url="https://www.datagrandest.fr/geoserver/region-grand-est/ows?"
            api="wms"
            layers="commune_actuelle_3857|commune_actuelle_centroide"
            layersname="Communes (poly)|Commmunes (point)"
            styles="" 
            version="1.1.0"
            format="image/png"
            transparent="1"
            filters="id_epci='246700488'" 
            queryable="commune_actuelle_3857" 
            fields="insee_com|nom_com|id_epci|epci_nom_complet" 
            labels="INSEE|COMMUNE|EPCI ID|EPCI" 
            baselayer="https://osm.datagrandest.fr/mapcache/?|relief" />
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-map 
                id="dge-map-3"
                height="50vh"
                title="Communes de l'EMS"
                attributions="GéoGrandEst,https://www.datagrandest.fr|OpenStreetMap,https://www.openstreetmap.org/copyright"
                center="48.6|7.75"
                zoom="10"
                url="https://www.datagrandest.fr/geoserver/region-grand-est/ows?"
                api="wms"
                layers="commune_actuelle_3857|commune_actuelle_centroide"
                layersname="Communes (poly)|Commmunes (point)"
                styles="" 
                version="1.1.0"
                format="image/png"
                transparent="1"
                filters="id_epci='246700488'" 
                queryable="commune_actuelle_3857" 
                fields="insee_com|nom_com|id_epci|epci_nom_complet" 
                labels="INSEE|COMMUNE|EPCI ID|EPCI" 
                baselayer="https://osm.datagrandest.fr/mapcache/?|relief" />
        </div>



