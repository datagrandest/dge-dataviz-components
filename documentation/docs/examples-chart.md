# DGE Chart - Exemples

Les exemples présentés ci-dessous vous permettent de mieux appréhender l'usage du composant DGE Chart.  
Parfois, ces exemples sont simplistes ou de peut de valeur scientifique. Ils sont là uniquement pour vous aider à comprendre le fonctionnement du composant DGE Chart. N'hésitez pas à partager vos exemples et à nous contacter pour compléter cette page.

## Exemple 1: base

A partir d'un jeu de données simple, on affiche un graphique en barres avec en abscisse (x) les différents objets du tableau et en ordonnées (y) le prix de chaque objet.

Cet exemple monter aussi comment ajouter un titre, les attributions (mentions légales) et le nom de la série.

!!! example "Exemple 1"

    === "HTML"

        ``` html
        <dge-chart id="dge-chart-1" 
            title="Nombre d'habitants par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv"
            url="data/villes.csv" 
            x="ville" 
            y="population" 
            series="Nombre d'habitants" 
            chart="bar" />
        ```

    === "Data"

        ``` csv
        id;district;ville;population;superficie
        1;D1;Ville A;10000;1000
        2;D1;Ville B;11000;800
        3;D2;Ville C;8500;750
        4;D2;Ville D;6800;680
        5;D2;Ville E;9200;870
        6;D3;Ville F;16000;1100
        ```

    === "Résultat"

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


## Exemple 2: calcul sur les ordonnées (y)

Sur la base de l'exemple 1, on représente ici en ordonnées la densité par ville (densite = population / superficie).

!!! example "Exemple 2"

    === "HTML"

        ``` html
        <dge-chart
            id="dge-chart-2" 
            title="Densité par ville"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            x="ville" 
            y="population/superficie" 
            series="densité de population" 
            chart="bar" /> 
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        ``` csv
        id;district;ville;population;superficie
        1;D1;Ville A;10000;1000
        2;D1;Ville B;11000;800
        3;D2;Ville C;8500;750
        4;D2;Ville D;6800;680
        5;D2;Ville E;9200;870
        6;D3;Ville F;16000;1100
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart
                id="dge-chart-2" 
                title="Densité par ville"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="csv" 
                url="data/villes.csv" 
                x="ville" 
                y="population/superficie" 
                series="densité de population (hab/km²)" 
                chart="bar" />
        </div>

## Exemple 3: tri sur les abscisses (x)

Sur la base de l'exemple 2, on ajoute cette fois un tri sur les abscisses via la propriété `orderby=""`.

!!! example "Exemple 3"

    === "HTML"

        ``` html
        <dge-chart
            id="dge-chart-3" 
            title="Classement des villes par nom (sens inverse)"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            x="ville" 
            y="population/superficie" 
            orderby="ville,DESC"
            series="densité de population" 
            chart="bar" /> 
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        ``` csv
        id;district;ville;population;superficie
        1;D1;Ville A;10000;1000
        2;D1;Ville B;11000;800
        3;D2;Ville C;8500;750
        4;D2;Ville D;6800;680
        5;D2;Ville E;9200;870
        6;D3;Ville F;16000;1100
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart
                id="dge-chart-3" 
                title="Classement des villes par nom (sens inverse)"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="csv" 
                url="data/villes.csv" 
                x="ville" 
                y="population/superficie" 
                orderby="ville,DESC"
                series="densité de population" 
                chart="bar" /> 
        </div>


## Exemple 4: tri sur les ordonnées (y)

Sur la base de l'exemple 2, on ajoute cette fois un tri (propriété `orderby=""`) sur la colonne des ordonnées (y).
La colonne y étant caculé on doit utiliser un alias ("densite") afin de nommer la colonne résultante. 

!!! example "Exemple 4"

    === "HTML"

        ``` html
        <dge-chart
            id="dge-chart-4" 
            title="Classement des villes par densité"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            x="ville" 
            y="population/superficie,densite" 
            orderby="densite"
            series="densité de population" 
            chart="bar" /> 
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        ``` csv
        id;district;ville;population;superficie
        1;D1;Ville A;10000;1000
        2;D1;Ville B;11000;800
        3;D2;Ville C;8500;750
        4;D2;Ville D;6800;680
        5;D2;Ville E;9200;870
        6;D3;Ville F;16000;1100
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart
                id="dge-chart-4" 
                title="Classement des villes par densité"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="csv" 
                url="data/villes.csv" 
                x="ville" 
                y="population/superficie,densite" 
                orderby="densite"
                series="densité de population" 
                chart="bar" /> 
        </div>

## Exemple 5: ajout d'un filtre (select)

Sur la base de l'exemple 2, on ajoute cette fois, en plus du tri sur les ordonnées, une liste de choix (propriété `filter=""`) pour filter par district.

La propriété `filter=""` utilise 2 valeurs séparées par "|":

- Le nom du select
- la colonne utilisée pour filtrer les valeurs

!!! example "Exemple 5"

    === "HTML"

        ``` html
        <dge-chart
            id="dge-chart-5" 
            title="Utilisation d'un filtre (liste)"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            x="ville" 
            y="population/superficie,densite" 
            orderby="densite"
            series="densité de population"
            filter="Sélectionner un district|district"
            chart="bar" /> 
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        ``` csv
        id;district;ville;population;superficie
        1;D1;Ville A;10000;1000
        2;D1;Ville B;11000;800
        3;D2;Ville C;8500;750
        4;D2;Ville D;6800;680
        5;D2;Ville E;9200;870
        6;D3;Ville F;16000;1100
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart
                id="dge-chart-5" 
                title="Utilisation d'un filtre (liste)"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="csv" 
                url="data/villes.csv" 
                x="ville" 
                y="population/superficie,densite" 
                orderby="densite"
                series="densité de population"
                filter="Sélectionner un district|district"
                chart="bar" /> 
        </div>

## Exemple 6: ajout d'un champ de recherche

Sur la base de l'exemple 2, on ajoute cette fois, en plus du tri sur les ordonnées, un champ de recherche (propriété `search=""`) de choix pour filter par district ou ville.

!!! example "Exemple 6"

    === "HTML"

        ``` html
        <dge-chart
            id="dge-chart-6" 
            title="Utilisation d'un champ de recherche"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            x="ville" 
            y="population/superficie,densite" 
            orderby="densite"
            series="densité de population"
            search="Filtrer par district ou ville|district,ville|D1"
            chart="bar" /> 
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        ``` csv
        id;district;ville;population;superficie
        1;D1;Ville A;10000;1000
        2;D1;Ville B;11000;800
        3;D2;Ville C;8500;750
        4;D2;Ville D;6800;680
        5;D2;Ville E;9200;870
        6;D3;Ville F;16000;1100
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart
                id="dge-chart-6" 
                title="Utilisation d'un champ de recherche"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="csv" 
                url="data/villes.csv" 
                x="ville" 
                y="population/superficie,densite" 
                orderby="densite"
                series="densité de population"
                search="Filtrer par district ou ville|district,ville|D1"
                chart="bar" /> 
        </div>

## Exemple 7: plusieurs séries de données

Sur la base de l'exemple 5, on ajoute ici deux séries de données: le nombre d'habitants et la superficie. 
A noter qu'il faut aussi adapter les propriétés `séries=""` et `chart=""`.

!!! example "Exemple 7"

    === "HTML"

        ``` html
        <dge-chart
            id="dge-chart-7" 
            title="Graphique avec plusieurs séries de données"
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
            api="csv" 
            url="data/villes.csv" 
            x="ville" 
            y="population|superficie" 
            orderby="densite"
            series="nombre d'habitants|superficie (km²)"
            filter="Sélectionnez un district|district|D2"
            chart="bar|line" /> 
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        ``` csv
        id;district;ville;population;superficie
        1;D1;Ville A;10000;1000
        2;D1;Ville B;11000;800
        3;D2;Ville C;8500;750
        4;D2;Ville D;6800;680
        5;D2;Ville E;9200;870
        6;D3;Ville F;16000;1100
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart
                id="dge-chart-7" 
                title="Graphique avec plusieurs séries de données"
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr"
                api="csv" 
                url="data/villes.csv" 
                x="ville" 
                y="population|superficie" 
                orderby="densite"
                series="nombre d'habitants|superficie (km²)"
                filter="Sélectionnez un district|district|D2"
                chart="bar|line" />
        </div>

## Exemple 8: jointures entre table

Dans cet exemple, on utilise une jointure entre plusieurs jeux de données pour calculer la valeur représentée en ordonnée (y). 

A noter: l'ensemble des jeux de données (propriété `datasets=""`) doivent provenir de la même source (propriété `url=""`)

*Evolution: pouvoir utiliser des données de sources différentes (`url="https://...;url:https://..."`). Comment traiter le cas si 2 URL pour 3 jeux de données ?*

!!! example "Exemple 8"

    === "HTML"

        ``` html
        <dge-chart 
            id="dge-chart-8" 
            api="csv" 
            url="data/" 
            datasets="commandes.csv|objets.csv|contacts.csv" 
            from="? AS commandes JOIN ? AS objets ON commandes.objet=objets.id JOIN ? AS contacts on commandes.contact=contacts.id"
            x="commandes.objet" 
            y="objets.prix*commandes.quantite,cout" 
            orderby="cout,DESC" 
            series="Cout (qte x prix)" 
            chart="bar" 
            title="Utilisation de jointures: coût par objet en cts (prix x qte)" 
            filter="Couleur|objets.couleur" /> 
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        comandes.csv
        ``` csv
        id;commande;quantite;objet;contact
        1;3;256;1;1
        2;1;212;2;2
        3;3;125;2;3
        4;1;287;3;2
        5;2;236;3;3
        6;3;175;3;1
        7;1;198;4;2
        8;2;168;4;3
        9;2;112;4;2
        10;2;452;3;2
        ```

        objet.csv
        ``` csv
        id;objet;prix;couleur
        1;stylo;4.1;rouge
        2;cahier;7.2;vert
        3;gomme;5.8;blanc
        4;crayon;6.4;rouge
        ```

        contacts.csv
        ``` csv
        id;nom
        1;Contact 1
        2;Contact 2
        3;Contact 3
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart 
                id="dge-chart-8" 
                api="csv" 
                url="data/" 
                datasets="commandes.csv|objets.csv|contacts.csv" 
                from="? AS commandes JOIN ? AS objets ON commandes.objet=objets.id JOIN ? AS contacts on commandes.contact=contacts.id"
                x="commandes.objet" 
                y="objets.prix*commandes.quantite,cout" 
                orderby="cout,DESC" 
                series="Cout (qte x prix)" 
                chart="bar" 
                title="Utilisation de jointures: coût par objet en cts (prix x qte)" 
                filter="Couleur|objets.couleur" />
        </div>

<!-- <div class="row mt-1 mb-5">
    <div class="col">
        <dge-chart id="dge-chart-5" api="csv" url="data/" datasets="commandes.csv|objets.csv|contacts.csv" 
        from="? AS commandes JOIN ? AS objets ON commandes.objet=objets.id JOIN ? AS contacts on commandes.contact=contacts.id"
        x="commandes.objet" y="objets.prix*commandes.quantite,cout" orderby="cout,DESC" series="Cout (qte x prix)" chart="bar" title="Coût par objet en cts (prix x qte)" filter="Couleur|objets.couleur" />
    </div>
</div> -->

## Exemple 9: regroupement (groupby)

Dans cet exemple, on utilise la propriété de regroupement `groupby=""` pour calculer la somme des valeurs de la colonne val par type d'objet.

!!! example "Exemple 9"

    === "HTML"

        ``` html
        <dge-chart 
            id="dge-chart-5"
            api="csv" 
            url="data/test2.csv" 
            fields="val" 
            x="type" 
            y="SUM(val),somme" 
            orderby="type,DESC" 
            groupby="type" 
            series="Somme par type" 
            chart="bar" 
            title="Regroupement de valeurs par 'group by'"
        />
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        test2.csv
        ``` csv
        id;type;val;form
        1;A;5;R
        2;B;4;C
        3;B;2;R
        4;A;5;C
        5;C;8;C
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart 
                id="dge-chart-9"
                api="csv" 
                url="data/test2.csv" 
                fields="val" 
                x="type" 
                y="SUM(val),somme" 
                orderby="type,DESC" 
                groupby="type" 
                series="Somme par type" 
                chart="bar" 
                title="Regroupement de valeurs par 'group by'"
            />
        </div>


<!-- <div class="row mt-1 mb-5">
    <div class="col">
        <dge-chart id="dge-chart-5" api="csv" url="data/test2.csv" fields="val" x="type" y="SUM(val),somme" orderby="type,DESC" groupby="type" series="Somme par type" chart="bar" title="Coût par objet en cts (prix x qte)" />
    </div>
</div> -->

## Exemple 10: filtre avec regroupement

Sur la base de l'exemple 9, on ajoute ici un filtre sur le champ "form".

!!! example "Exemple 10"

    === "HTML"

        ``` html
        <dge-chart 
            id="dge-chart-10" 
            api="csv" 
            url="data/test2.csv" 
            fields="val" 
            x="type" 
            y="SUM(val),somme" 
            orderby="type,DESC" 
            groupby="type" 
            series="Somme par type" 
            chart="bar" 
            title="Utilisation d'un filtre (liste) avec un regroupement" 
            filter="Form|form" 
        />
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        test2.csv
        ``` csv
        id;type;val;form
        1;A;5;R
        2;B;4;C
        3;B;2;R
        4;A;5;C
        5;C;8;C
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-chart 
                id="dge-chart-10" 
                api="csv" 
                url="data/test2.csv" 
                fields="val" 
                x="type" 
                y="SUM(val),somme" 
                orderby="type,DESC" 
                groupby="type" 
                series="Somme par type" 
                chart="bar" 
                title="Utilisation d'un filtre (liste) avec un regroupement" 
                filter="Form|form" 
            />
        </div>


## Exemple 11: graphique de type jauge avec étiquettes et texte central

On s'intéresse ici à la présentation d'un graphique de type "jauge" avec étiquettes et texte central de mise en avant.

!!! example "Exemple 11"

    === "HTML"

        ``` html
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
            dldisplay="true" dldisplaylimit="0" dlcolor="#eee" dlalign="center" dlanchor="center" dlformat="percent,2" dlunit="%" />
        />
        ```

    === "Data"

        Seules les données utiles du fichier sont représentées ici.

        gauge.csv
        ``` csv
        id;a;b
        1;OUI;127
        2;NON;52
        ```

    === "Résultat"

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
                dldisplay="true" dldisplaylimit="0" dlcolor="#eee" dlalign="center" dlanchor="center" dlformat="percent,2" dlunit="%" />
        </div>
