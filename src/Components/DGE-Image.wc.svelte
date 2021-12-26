<svelte:options tag="dge-image" immutable={true} />

<script>
    import { onMount } from "svelte";
    import dgeHelpers from "./libs/dge-helpers.js";

    // PROPERTIES
    export let id = "dge-image";
    export let title = "";
    export let localcss = false;
    $: localcss = dgeHelpers.checkValueFormat(localcss);
    export let src = null;
    export let legend = "";

    // attribution properties
    export let attribution = false;
    export let attribtionicon = false;
    export let attribtiontext = false;
    export let attribtionprefix = "";
    export let attribtionurl = false;
    export let attribtionsize = "1rem";
    export let attribtioncolor = null;
    export let attribtiontitle = false;
    $: {
        const defaultAttributionOptions = {
            icon: attribtionicon,
            text: attribtiontext || attribtionurl,
            prefix: attribtionprefix,
            url: attribtionurl,
            size: attribtionsize,
            color: attribtioncolor,
            title: attribtiontitle || attribtiontext,
        };
        const attributions = attribution ? attribution.split("|") : [];
        attribution = attributions.map((attributionValue) => {
            const attributionOptions = dgeHelpers.getJsonFromString(attributionValue, false);
            return { ...defaultAttributionOptions, ...attributionOptions };
        });
    }

    onMount(() => {});
</script>

<div {id} class="card">
    <div class="card-body p-2">
        {#if title}
            <div class="title text-center">
                <h5>{title}</h5>
            </div>
        {/if}

        {#if src !== null}
            <div class="img">
                <img {src} class="figure-img img-fluid rounded" alt={legend ? legend : Error} />
            </div>
        {/if}
        {#if legend || attribution.length}
            <div class="text-muted d-flex justify-content-between">
                <small class="text-start">{legend}</small>
                <small class="attribution text-end">
                    {#each attribution as att}
                        {#if att.icon || att.text}
                            {att.prefix}
                            <a href={att.url} title={att.title || att.url || "Attribution"} target="_blank"
                                >{#if att.icon}<i
                                        class="bi-{att.icon}"
                                        style={"font-size: " + att.size + "; color: " + att.color + ";"}
                                    />{/if}{#if att.text}{att.text}{/if}
                            </a>
                        {/if}
                    {/each}
                </small>
            </div>
        {/if}
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
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css");
    </style>
{/if}
