# DGE Table - Exemples

Les exemples présentés ci-dessous vous permettent de mieux appréhender l'usage du composant DGE Table.  

## Exemple 1: Afficher un tableau de données

Affichage sous forme de tableau des données d'un fichier CSV.

!!! example "Exemple 1"

    === "HTML"

        ``` html
        <dge-table 
            id="dge-table-1" 
            api="csv" 
            url="data/villes.csv" 
            fields="id,district,ville,population,superficie" 
            labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)" 
            filter=""
            title="Liste des villes du fichier data/ville.csv" />
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

        <div style="width:100%">
            <dge-table 
                id="dge-table-1" 
                api="csv" 
                url="data/villes.csv" 
                fields="id,district,ville,population,superficie" 
                labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)" 
                filter=""
                title="Liste des villes du fichier data/ville.csv" />
        </div>


## Exemple 2: Calcul d'une valeur de colonne à partir des données existantes

Calcul de la densité de population à partir du nombre d'habitants et de la superficie.

!!! example "Exemple 2"

    === "HTML"

        ``` html
        <dge-table 
            id="dge-table-2" 
            api="csv" 
            url="data/villes.csv" 
            fields="id,district,ville,population,superficie"
            columns="id|district|ville|population|superficie|population/superficie,densite"
            labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)|DENSITE" 
            title="Cacul de la dentsité des villes" />
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

        <div style="width:100%">
            <dge-table 
                id="dge-table-2" 
                api="csv" 
                url="data/villes.csv" 
                fields="id,district,ville,population,superficie"
                columns="id|district|ville|population|superficie|population/superficie,densite"
                labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)|DENSITE" 
                title="Cacul de la dentsité des villes" />
        </div>


## Exemple 3: Filtrer les données à afficher

Affichage sous forme de tableau des données d'un fichier CSV.
La liste des villes est ici filtrée sur le District "D2".

!!! example "Exemple 3"

    === "HTML"

        ``` html
        <dge-table 
            id="dge-table-3" 
            api="csv" 
            url="data/villes.csv" 
            fields="id,district,ville,population,superficie" 
            labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)" 
            where="district='D2'"
            title="Liste des villes du district D2" />
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

        <div style="width:100%">
            <dge-table 
                id="dge-table-3" 
                api="csv" 
                url="data/villes.csv" 
                fields="id,district,ville,population,superficie" 
                labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)" 
                where="district='D2'"
                title="Liste des villes du district D2" />
        </div>

## Exemple 4: Utiliser la pagination

Affichage d'un tableau de données paginées à partir d'un fichier CSV.

!!! example "Exemple 4"

    === "HTML"

        ``` html
        <dge-table 
            id="dge-table-4" 
            api="csv" 
            url="data/villes.csv" 
            fields="id,district,ville,population,superficie" 
            labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)"
            displaytotal="1" 
            displaypagination="1" 
            perpage="4"
            page="2"
            title="Liste des villes (pagination)" />
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

        <div style="width:100%">
            <dge-table 
                id="dge-table-4" 
                api="csv" 
                url="data/villes.csv" 
                fields="id,district,ville,population,superficie" 
                labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)"
                displaytotal="1" 
                displaypagination="1" 
                perpage="4"
                page="2"
                title="Liste des villes (pagination)" />
        </div>



## Exemple 5: Ajout d'un champ de recherche (full-text)

Ajout d'un champ de recherche. Ici on précise les champs sur lesquels on limite le filtre (nom de la ville et district).
Pour tester le filtre, remplcez "D1" par "D2" ou par "ville C" par exemple dans le champ de recherche.

!!! example "Exemple 5"

    === "HTML"

        ``` html
        <dge-table 
            id="dge-table-5" 
            api="csv" 
            url="data/villes.csv" 
            fields="id,district,ville,population,superficie" 
            labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)"
            displaytotal="1"
            search="Filtrer par district ou ville|district,ville|D1"
            title="Liste des villes" />
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

        <div style="width:100%">
            <dge-table 
                id="dge-table-5" 
                api="csv" 
                url="data/villes.csv" 
                fields="id,district,ville,population,superficie" 
                labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)"
                displaytotal="1" 
                search="Filtrer par district ou ville|district,ville|D1"
                title="Liste des villes" />
        </div>

## Exemple 6: Filtrer dynamiquement les données d'un tableau (liste de sélection)

Ajout d'une liste de sélection pour filtrer les données du tableau.

!!! example "Exemple 6"

    === "HTML"

        ``` html
        <dge-table 
            id="dge-table-6" 
            api="csv" 
            url="data/villes.csv" 
            fields="id,district,ville,population,superficie" 
            labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)"
            displaytotal="1"
            select="Filtrer par district|district|D1"
            title="Liste des villes" />
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

        <div style="width:100%">
            <dge-table 
                id="dge-table-6" 
                api="csv" 
                url="data/villes.csv" 
                fields="id,district,ville,population,superficie" 
                labels="ID|DISTRICT|VILLE|POPULATION (HAB)|SUPERFICIE (KM²)"
                displaytotal="1" 
                filter="Sélectionner un district|district"
                title="Liste des villes" />
        </div>
## Exemple 7: Afficher des données provenant de plusieurs sources (tables liées)

Le tableau ci-dessous combine des données provenant de plusieurs fichiers CSV.
La colonne "COUT" est calculé à partir des données du fichier commandes.csv et objets.csv.
Les résultats sont triés selon le coût décroissant des commandes.

!!! example "Exemple "

    === "HTML"

        ``` html
        <dge-table 
            id="dge-table-7" 
            api="csv" 
            url="data/" 
            datasets="commandes.csv|objets.csv|contacts.csv" 
            fields="commandes.id,commandes.objet,commandes.quantite|objets.prix,objets.objet,objets.couleur,objets.id|contacts.nom" 
            from="? AS commandes JOIN ? AS objets ON commandes.objet=objets.id JOIN ? AS contacts on commandes.contact=contacts.id"
            orderby="cout,DESC" 
            columns="commandes.id|objets.objet|objets.couleur|commandes.quantite|objets.prix|commandes.quantite*objets.prix,cout|contacts.nom"
            labels="ID|OBJET|COULEUR|QUANTITE|PRIX|COUT|CONTACT"
            displaytotal="1"
            filter="Couleur|objets.couleur"
            title="Liste des commandes" />
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

        <div style="width:100%">
            <dge-table 
                id="dge-table-7" 
                api="csv" 
                url="data/" 
                datasets="commandes.csv|objets.csv|contacts.csv" 
                fields="commandes.id,commandes.objet,commandes.quantite|objets.prix,objets.objet,objets.couleur,objets.id|contacts.nom" 
                from="? AS commandes JOIN ? AS objets ON commandes.objet=objets.id JOIN ? AS contacts on commandes.contact=contacts.id"
                orderby="cout,DESC" 
                columns="commandes.id|objets.objet|objets.couleur|commandes.quantite|objets.prix|commandes.quantite*objets.prix,cout|contacts.nom"
                labels="ID|OBJET|COULEUR|QUANTITE|PRIX|COUT|CONTACT"
                displaytotal="1"
                filter="Couleur|objets.couleur"
                title="Liste des commandes" />
        </div>