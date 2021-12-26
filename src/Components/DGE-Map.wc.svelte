<svelte:options tag="dge-map" immutable={true} />

<script>
    import * as L from "leaflet";
    import { GestureHandling } from "leaflet-gesture-handling";
    import betterWms from "./libs/L.TileLayer.BetterWMS.js";
    import dgeHelpers from "./libs/dge-helpers.js";
    import dgeMap from "./libs/dge-map.js";
    import { onMount } from "svelte";

    export let id = "dge-map";
    export let title = "";
    export let height = "50vh";
    export let localcss = false;
    $: localcss = dgeHelpers.checkValueFormat(localcss);
    export let center = "7.52|47.5";
    export let zoom = 10;
    export let url = ""; // Deprecated in future version
    export let api = "wms"; // Deprecated in future version
    export let layers = ""; // Deprecated in future version
    export let layersname = ""; // Deprecated in future version
    export let fields = ""; // Deprecated in future version
    export let labels = ""; // Deprecated in future version
    export let styles = ""; // Deprecated in future version
    export let version = "1.1.0"; // Deprecated in future version
    export let formats = "image/png"; // Deprecated in future version
    export let transparent = "true"; // Deprecated in future version
    export let filters = ""; // Deprecated in future version
    export let queryable = ""; // Deprecated in future version
    export let baselayer = false; // Deprecated in future version

    // use Ctrl to zoom on the map
    export let gesturehandling = false;

    // data property
    export let data = false;
    let data_array = [];
    $: {
        const defaultDataOptions = {
            url: false,
            api: "wms",
            layers: "",
            layersname: "",
            formats: "image/png",
            styles: "",
            transparent: "true",
            versions: "1.1.0",
            attribution: "",
            fields: "",
            labels: "",
            filters: "",
            queryable: "",
        };
        data_array = data ? data.split("|") : [];
        data_array = data_array.map((value) => {
            const dataOptions = dgeHelpers.getJsonFromString(value, false);
            return { ...defaultDataOptions, ...dataOptions };
        });
    }

    //  baselayers property
    export let baselayers = false;
    let baselayers_array = [];
    $: {
        const defaultBaselayersOptions = {
            url: false,
            layers: "",
            layersname: "",
            formats: "image/jpeg",
            styles: "",
            transparent: false,
            versions: "1.1.0",
            // attributions: "",
        };
        baselayers_array = baselayers ? baselayers.split("|") : [];
        baselayers_array = baselayers_array.map((value) => {
            const baselayersOptions = dgeHelpers.getJsonFromString(value, false);
            return { ...defaultBaselayersOptions, ...baselayersOptions };
        });
    }

    // osm property
    export let osm = false;
    $: osm = dgeHelpers.checkValueFormat(osm);

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

    let div = null;

    function addLayersToMap(map, layerControl, data) {
        for (var d = 0, n = data.length; d < n; d++) {
            if (data[d].api == "wms") {
                addWmsLayer(map, layerControl, data[d]);
            }
            if (data[d].api == "geojson") {
                addGeojsonLayer(map, layerControl, data[d]);
            }
        }
    }

    function addWmsLayer(map, layerControl, data) {
        const layers = data.layers.split(",");
        const formats = data.formats.split(",");
        let transparent = dgeHelpers.checkValueFormat(data.transparent);
        if (typeof transparent == "string") {
            transparent = data.transparent.split(",").map((value) => {
                return dgeHelpers.checkValueFormat(value);
            });
        }
        const styles = data.styles.split(",");
        const versions = data.versions.split(",");
        const filters = data.filters ? data.filters.split(",") : false;
        const layersname = data.layersname.split(",");
        const fields = data.fields.split(",") || false;
        const labels = data.labels.split(",") || false;
        const queryable = data.queryable.split(",") || [];
        for (var l = 0, m = layers.length; l < m; l++) {
            if (layers[l]) {
                const layername = layersname[l];
                let layerOptions = {
                    layers: layers[l],
                    format: formats[l] || "image/png",
                    transparent: transparent,
                    version: versions[l] || "1.1.0",
                    styles: styles[l] || "",
                    fields: fields,
                    labels: labels,
                };
                if (filters[l]) layerOptions.cql_filter = filters[l];
                const layer = queryable.includes(layers[l])
                    ? betterWms.wms(data.url, layerOptions).addTo(map)
                    : L.tileLayer.wms(data.url, layerOptions).addTo(map);
                layerControl.addOverlay(layer, layername);
            }
        }
    }

    function addGeojsonLayer(map, layerControl, data) {
        const style = {
            color: "#ff7800",
            weight: 5,
            opacity: 0.65,
        };
        let url = data.url;
        const layers = data.layers.split(",");
        const styles = data.styles.split(",");
        const layersname = data.layersname.split(",");
        const fields = data.fields.split(",") || false;
        const labels = data.labels.split(",") || false;
        const queryable = data.queryable.split(",") || [];
        for (var l = 0, m = layers.length; l < m; l++) {
            const layername = layersname[l];
            if (layers[l]) {
                url = data.url.endsWith("/") ? data.url : data.url + "/";
                url += layers[l];
            }
            if (url != "/") {
                fetch(url + layers[l])
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error("HTTP error " + response.status);
                        }
                        return response.json();
                    })
                    .then(function (json) {
                        const layer = L.geoJSON(json, {
                            style: styles[l] || style,
                            onEachFeature: function (feature, layer) {
                                if (queryable.includes(url.split("/").at(-1))) {
                                    const properties = feature.properties;
                                    const html = dgeMap.getPopup(properties, fields, labels);
                                    layer.bindPopup(html);
                                }
                            },
                        }).addTo(map);
                        layerControl.addOverlay(layer, layername);
                    });
            }
        }
    }

    onMount(() => {
        L.Map.addInitHook("addHandler", "gestureHandling", GestureHandling);
        center = center.split("|");
        const map = L.map(div, {
            center: center,
            zoom: zoom,
            gestureHandling: gesturehandling,
        });
        const layerControl = L.control.layers().addTo(map);

        let attribution_array = baselayers
            ? []
            : ['&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'];
        if (attribution.length) {
            for (var i = 0, n = attribution.length; i < n; i++) {
                attribution_array.push('<a href="' + attribution[i].url + '">' + attribution[i].text + "</a>");
            }
        }
        const attribution_string = attribution_array.join(" | ");

        if (osm) {
            const layer = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: attribution_string,
            }).addTo(map);
            if (baselayer || baselayers) layerControl.addBaseLayer(layer, "OpenStreetMap");
        }
        if (baselayer) {
            const baselayer_array = baselayer.split(",");
            let blOptions = {
                layers: baselayer_array[1],
                format: formats || "image/jpeg",
                transparent: false,
                version: baselayer_array[2] || "1.1.1",
                styles: baselayer_array[3] || "",
                attribution: attribution_string,
            };
            const layer = L.tileLayer.wms(baselayer_array[0], blOptions).addTo(map);
            if (osm || baselayers.length) layerControl.addBaseLayer(layer, baselayer_array[1]);
        }
        if (baselayers) {
            for (var i = 0, n = baselayers_array.length; i < n; i++) {
                const layers = baselayers_array[i].layers.split(",");
                const formats = baselayers_array[i].formats.split(",");
                let transparent = dgeHelpers.checkValueFormat(baselayers_array[i].transparent);
                if (typeof transparent == "string") {
                    transparent = data.transparent.split(",").map((value) => {
                        return dgeHelpers.checkValueFormat(value);
                    });
                }
                const styles = baselayers_array[i].styles.split(",");
                const versions = baselayers_array[i].versions.split(",");
                const layersname = baselayers_array[i].layersname.split(",");
                // const attributions = baselayers_array[i].attributions.split(",");
                for (var l = 0, m = layers.length; l < m; l++) {
                    if (layers[l]) {
                        let baselayerOptions = {
                            layers: layers[l],
                            format: formats[l] || "image/jpeg",
                            transparent: transparent,
                            version: versions[l] || "1.1.0",
                            styles: styles[l] || "",
                            // attribution: attributions[l],
                        };
                        const layer = L.tileLayer.wms(baselayers_array[i].url, baselayerOptions).addTo(map);
                        if (osm || baselayer || baselayers.length > 1) layerControl.addBaseLayer(layer, layersname[l]);
                    }
                }
            }
        }

        if (api == "wms") {
            // Add WMS layers from `url` and `layers` properties
            const wms = {
                api: api,
                url: url,
                fields: fields,
                labels: labels,
                layersname: layersname,
                layers: layers,
                formats: formats,
                transparent: transparent,
                styles: styles,
                filters: filters,
                queryable: queryable,
                versions: version,
            };
            addWmsLayer(map, layerControl, wms);
        }

        if (api == "geojson") {
            // Add GeoJSON layers from `url` and `layers` properties
            const geojson = {
                api: api,
                url: url,
                layers: layers,
                fields: fields,
                labels: labels,
                queryable: queryable,
                layersname: layersname,
                styles: styles,
            };
            addGeojsonLayer(map, layerControl, geojson);
        }

        if (data_array.length) {
            // Add layers from `data` property
            addLayersToMap(map, layerControl, data_array);
        }
    });
</script>

<div {id} class="card" class:px-2={title} class:py-1={title}>
    {#if title}
        <div class="title text-center">
            <h6>{title}</h6>
        </div>
    {/if}
    <div id="map" bind:this={div} class="rounded mx-auto d-block" style="height: {height}; width: 100%;" />
</div>

{#if localcss}
    <style>
        @import "./dist/bootstrap/css/bootstrap.min.css";
        @import "./dist/bootstrap-icons/bootstrap-icons.css";
        @import "./dist/leaflet/leaflet.css";
        @import "./dist/leaflet-gesture-handling/leaflet-gesture-handling.css";
        @import "./dist/global.css";
    </style>
{:else}
    <style>
        @import url("https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css");
        @import url("https://unpkg.com/leaflet@1.7.1/dist/leaflet.css");
        @import url("https://unpkg.com/leaflet-gesture-handling@1.1.8/dist/leaflet-gesture-handling.min.css");
    </style>
{/if}
