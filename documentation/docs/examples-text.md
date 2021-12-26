# DGE Text - Exemples

Les exemples présentés ci-dessous vous permettent de mieux appréhender l'usage du composant DGE Text.  

## Exemple 1: texte simple

Affichage d'un texte simple avec titre et source.

!!! example "Exemple 1"

    === "HTML"

        ``` html
        <dge-text 
            id="dge-text-1" 
            text="Mon texte descriptif ici..." 
            title="Exemple de texte" 
            attribution="text:DataGrandEst;url:https://www.datagrandest.fr" />
        ```

    === "Résultat"

        <div style="width:50%">
            <dge-text 
                id="dge-text-1" 
                text="Mon texte descriptif ici..." 
                title="Exemple de texte" 
                attribution="text:DataGrandEst;url:https://www.datagrandest.fr" />
        </div>


## Exemple 2: texte HTML 

Affichage d'un texte mis en forme (HTML).
Dans cet exemple, les attributs *titre* et *source* ne sont pas utilisés. Nous utilisons ici un *slot* pour afficher le contenu du composant au format HTML.

!!! example "Exemple 2"

    === "HTML"

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

    === "Résultat"

        <div style="width:50%">
            <dge-text id="dge-text-2">
                <div slot="text">
                    <h5>Le titre de mon texte dans le <em>slot</em></h5>
                    <p class="m-0 p-0">Le texte avec un <em>slot</em> de mise en forme...<br />
                        et la possibilité d'utiliser du <em>HTML</em>, par exemple ajouter un bouton.
                    </p>
                    <button type="button" class="btn btn-primary mt-3 float-right">Action</button>
                </div>
            </dge-text>
        </div>
            
            


                
