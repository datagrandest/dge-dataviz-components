<svelte:options tag="dge-text" immutable={true} />

<script>
    import { onMount } from "svelte";
    import dgeHelpers from "./libs/dge-helpers.js";

    // PARAMETRES DU COMPOSANT
    export let id = "dge-text";
    export let klass = "";
    export let title = "";
    export let text = null;
    export let localcss = false;
    $: localcss = dgeHelpers.checkValueFormat(localcss);

    // attribution properties
    export let attribution = false;
    export let attributionicon = false;
    export let attributiontext = false;
    export let attributionprefix = "";
    export let attributionurl = false;
    export let attributionsize = "1rem";
    export let attributioncolor = null;
    export let attributiontitle = false;
    $: {
        const defaultAttributionOptions = {
            icon: attributionicon,
            text: attributiontext || attributiontitle || attributionurl,
            prefix: attributionprefix,
            url: attributionurl,
            size: attributionsize,
            color: attributioncolor,
            title: attributiontitle || attributiontext,
        };
        const attributions = attribution ? attribution.split("|") : [];
        attribution = attributions.map((attributionValue) => {
            const attributionOptions = dgeHelpers.getJsonFromString(attributionValue, false);
            return { ...defaultAttributionOptions, ...attributionOptions };
        });
    }

    onMount(() => {});
</script>

<div {id} class="card {klass}">
    <div class="card-body">
        {#if title}
            <div class="title text-center">
                <h5>{title}</h5>
            </div>
        {/if}

        {#if text}
            <div class="text mt-3 mb-1">
                {text}
            </div>
        {/if}
        {#if $$slots.text}
            <div class="text mt-3 mb-1">
                <slot name="text" />
            </div>
        {/if}

        <div class="text-end mt-2">
            <small class="text-muted">
                {#each attribution as att}
                    {#if att.icon || att.text}
                        <span class="attribution me-1">
                            {att.prefix}
                            <a href={att.url} title={att.title || att.url || "Attribution"} target="_blank" rel="noreferrer"
                                >{#if att.icon}<i
                                        class="bi-{att.icon}"
                                        style={"font-size: " + att.size + "; color: " + att.color + ";"}
                                    />{/if}{#if att.text}{att.text}{/if}
                            </a>
                        </span>
                    {/if}
                {/each}
            </small>
        </div>
    </div>
</div>

{#if localcss}
    <style>
        @import "./dist/bootstrap/css/bootstrap.min.css";
        @import "./dist/bootstrap-icons/bootstrap-icons.css";
        @import "./dist/global.css";
    </style>
{:else}
    <style>
        @import url("https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css");
    </style>
{/if}
