<svelte:options
    customElement={{
        tag: 'dge-chart',
        shadow: 'open',
        _props: {
            attribution: { reflect: false, type: 'String', attribute: 'attribution' }
        },
    }}
/>


<script>
    import ChartDataLabels from "chartjs-plugin-datalabels";
    import ChartjsPluginTextcenter from "./libs/chartjs-plugin-textcenter.js";
    import dgeHelpers from "./libs/dge-helpers.js";
    import dgeData from "./libs/dge-data.js";
    import dgeChart from "./libs/dge-chart.js";
    import * as alasql from "alasql";
    import { onMount } from "svelte";

    // PROPERTIES
    export let id = "dge-chart";
    export let klass = "";
    export let height = 2;
    $: height = dgeHelpers.checkValueFormat(height);
    export let width = 3;
    $: width = dgeHelpers.checkValueFormat(width);
    export let title = "";
    export let localcss = false;
    $: localcss = dgeHelpers.checkValueFormat(localcss);
    export let url = "";
    export let api = "json";
    export let datasets = "";
    export let properties = "";
    $: properties = properties ? properties.split("|") : false;
    export let cql_filter = '';
    export let wfs_filter = '';
    export let fields = "";
    export let from = "";
    export let where = "";
    export let groupby = "";
    export let having = "";
    export let orderby = "";
    export let search = "";
    export let filter = "";
    export let max = 50; // For 'wfs' and 'd4c'
    export let x = "";
    export let y = "";
    export let chart = "bar";
    export let series = "";
    export let colors = "";
    export let xaxis = "";
    export let yaxis = "";

    // attribution properties
    export let attribution = "";
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
            title: attribtiontitle || attribtiontext || attribtionurl,
        };
        const attributions = attribution ? attribution.split("|") : [];
        attribution = attributions.map((attributionValue) => {
            const attributionOptions = dgeHelpers.getJsonFromString(attributionValue, false);
            return { ...defaultAttributionOptions, ...attributionOptions };
        });
    }

    // datalink properties
    export let datalink = "";
    export let datalinkicon = false;
    export let datalinktext = false;
    export let datalinkprefix = "";
    export let datalinkurl = false;
    export let datalinksize = "1rem";
    export let datalinkcolor = null;
    export let datalinktitle = null;
    $: {
        const defaultDatalinkOptions = {
            icon: datalinkicon,
            text: datalinktext || datalinkurl,
            prefix: datalinkprefix,
            url: datalinkurl,
            size: datalinksize,
            color: datalinkcolor,
            title: datalinktitle || datalinktext || datalinkurl,
        };
        const datalinkOptions = dgeHelpers.getJsonFromString(datalink, false);
        datalink = { ...defaultDatalinkOptions, ...datalinkOptions };
    }

    function getPadding(padding, top, right, bottom, left) {
        padding = padding ? padding.split(",") : [top, right, bottom, left];
        return {
            top: parseInt(padding[0]),
            right: padding.length == 1 ? parseInt(padding[0]) : parseInt(padding[1]),
            bottom: padding.length == 1 ? parseInt(padding[0]) : parseInt(padding[2]),
            left: padding.length == 1 ? parseInt(padding[0]) : parseInt(padding[3]),
        };
    }

    function getFont(font, family, size, style, weight, height) {
        return font
            ? dgeHelpers.getJsonFromString(font)
            : {
                  family: family,
                  size: parseFloat(size),
                  style: style,
                  weight: weight,
                  lineheight: parseFloat(height),
              };
    }

    let chartOptions = { plugins: {}, layout: {} };

    // animation properties
    export let animation = "";
    export let animaduration = 1000;
    export let animeasing = "easeOutQuart";
    export let animdelay = false;
    export let animloop = false;
    $: {
        const defaultAnimationOptions = {
            duration: animaduration,
            easing: animeasing,
            delay: animdelay,
            loop: animloop,
        };
        const animationOptions = dgeHelpers.getJsonFromString(animation, {});
        chartOptions.animation = { ...defaultAnimationOptions, ...animationOptions };
    }

    export let colorgradient = false;
    $: chartOptions.plugins.colorGradient = colorgradient ? true : false;

    export let treemap = "";
    $: {
        const defaultTreemapOptions = {
            labels: {
                align: "center",
                color: false,
                display: false,
                formatter: false,
                font: false,
                hoverColor: false,
                hoverFont: false,
                padding: 3,
                position: "middle",
                unit: "",
                decimal: 0,
            },
        };
        const treemapOptions = dgeHelpers.getJsonFromString(treemap);
        chartOptions.plugins.treemap = { ...defaultTreemapOptions, ...treemapOptions };
    }

    export let gauge = "";
    $: {
        const defaultGaugeOptions = {
            circumference: 270,
            rotation: -135,
            cutout: "75%",
            radius: "98%",
            borderRadius: 5,
            offset: 10,
        };
        const gaugeOptions = dgeHelpers.getJsonFromString(gauge);
        chartOptions.gauge = { ...defaultGaugeOptions, ...gaugeOptions };
    }

    export let padding = false;
    $: chartOptions.layout.padding = padding ? getPadding(padding) : false;

    export let legend = "display:1";
    $: chartOptions.plugins.legend = dgeHelpers.getJsonFromString(legend);

    // textcenter property
    export let textcenter = "";
    export let tclabel = "";
    export let tcfontsize = "";
    export let tcfontfamily = "";
    export let tclineheight = "";
    export let tcfontstyle = "";
    export let tcfontweight = "";
    export let tccolor = "";
    export let tcalign = "";
    export let tcbaseline = "";
    export let tcx = "";
    export let tcy = "";
    $: {
        const defaultTextcenterOptions = {
            label: tclabel || "",
            fontsize: tcfontsize,
            fontfamily: tcfontfamily,
            lineheight: tclineheight,
            fontstyle: tcfontstyle,
            fontweight: tcfontweight,
            color: tccolor,
            align: tcalign,
            baseline: tcbaseline,
            x: tcx,
            y: tcy,
        };
        textcenter = textcenter ? textcenter.split("|") : [];
        textcenter = textcenter.map((value) => {
            const textcenterOptions = dgeHelpers.getJsonFromString(value, false);
            return { ...defaultTextcenterOptions, ...textcenterOptions };
        });
        chartOptions.plugins.textcenter = textcenter.length ? { labels: textcenter } : { labels: [] };
    }

    // datalabels plugins properties (cf. )
    export let datalabels = "";
    export let dlalign = "center";
    export let dlanchor = "center";
    export let dlbackgroundcolor = "rgba(0, 0, 0, 0.1)";
    export let dlbordercolor = "rgba(0, 0, 0, 0.1)";
    export let dlborderradius = 0;
    export let dlborderwidth = 0;
    export let dlclamp = false;
    export let dlclip = false;
    export let dlcolor = "#666";
    export let dldisplay = false;
    export let dldisplaylimit = false;
    export let dlfont = false;
    export let dlfontfamily = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
    export let dlfontsize = 12;
    export let dlfontstyle = "normal";
    export let dlfontweight = undefined;
    export let dlfontlineheight = 1.2;
    export let dllabels = undefined;
    export let dlformat = "";
    export let dllistener = {};
    export let dloffset = 4;
    export let dlopacity = 1;
    export let dlpadding = false;
    export let dlpaddingtop = 4;
    export let dlpaddingright = 4;
    export let dlpaddingbottom = 4;
    export let dlpaddingleft = 4;
    export let dlrotation = 0;
    export let dltextalign = "start";
    export let dltextstrokecolor = null;
    export let dltextstrokewidth = 0;
    export let dltextshadowblur = 0;
    export let dltextshadowcolor = false;
    export let dlunit = "";
    $: {
        const defaultDatalabelsOptions = {
            align: dlalign,
            anchor: dlanchor,
            backgroundColor: dlbackgroundcolor,
            borderColor: dlbordercolor,
            borderRadius: parseInt(dlborderradius),
            borderwidth: parseInt(dlborderwidth),
            clamp: dlclamp,
            clip: dlclip,
            color: dlcolor,
            display: dldisplay,
            displayLimit: parseFloat(dldisplaylimit),
            font: getFont(dlfont, dlfontfamily, dlfontsize, dlfontstyle, dlfontweight, dlfontlineheight),
            labels: dllabels,
            format: dlformat,
            listeners: dllistener,
            offset: parseInt(dloffset),
            opacity: parseFloat(dlopacity),
            padding: getPadding(dlpadding, dlpaddingtop, dlpaddingright, dlpaddingbottom, dlpaddingleft),
            rotation: parseFloat(dlrotation),
            textalign: dltextalign,
            textstrokecolor: dltextstrokecolor,
            textstrokewidth: parseInt(dltextstrokewidth),
            textshadowblur: dltextshadowblur,
            textshadowcolor: dltextshadowcolor,
            unit: dlunit,
        };
        const datalabelsOptions = dgeHelpers.getJsonFromString(datalabels);
        chartOptions.plugins.datalabels = { ...defaultDatalabelsOptions, ...datalabelsOptions };
    }

    export let labels = "";
    export let reverse = false;
    $: {
        const defaultDgeOptions = {
            labels: labels ? labels.split("|") : false,
            reverse: dgeHelpers.checkValueFormat(reverse),
        };
        chartOptions.plugins.dge = defaultDgeOptions;
    }

    // download properties
    export let download = "";
    export let downloadicon = false;
    export let downloadtext = false;
    export let downloadprefix = "";
    export let downloadsize = "1rem";
    export let downloadcolor = null;
    export let downloadtitle = "Télécharger le graphique";
    $: {
        const defaultDownloadOptions = {
            icon: downloadicon,
            text: downloadtext,
            prefix: downloadprefix,
            size: downloadsize,
            color: downloadcolor,
            title: downloadtitle,
        };
        const downloadOptions = dgeHelpers.getJsonFromString(download, false);
        download = { ...defaultDownloadOptions, ...downloadOptions };
    }

    export let refresh = 0;

    let loading = 0;
    let data = false;
    let items = [];
    let filteredItems = [];
    let canvasElement;
    let graph;
    let filterValues = [];
    let filterValue;
    let filterField;
    let filterFieldId;
    let filterLabel;
    let searchPlaceholder = "";
    let searchValue = "";
    let searchFields = [];
    let searchField = "_search";
    let xField = "";
    let yFields = [];
    let titleReplaced = title;

    let image = false;

    function getPromiseData(url, datasets, properties, fields_array, max, api, cql_filter, wfs_filter) {
        const datasets_list = datasets ? getDatasets(datasets) : [{ name: url.substring(url.lastIndexOf("/") + 1) }];
        const url_base = datasets ? url : url.substring(0, url.lastIndexOf("/")) + "/";

        let dataRequests = [];
        for (let i = 0, n = datasets_list.length; i < n; i++) {
            const apiFields = fields_array[i] ? fields_array[i] : false;
            const apiUrl = dgeData.getDataUrl(url_base, datasets_list[i].name, max, apiFields, api, cql_filter, wfs_filter);
            const property = properties[i] ? properties[i] : false;
            dataRequests.push(dgeData.getData(apiUrl, api, property));
        }
        loading++;
        Promise.all(dataRequests).then((response) => {
            data = response;
            loading--;
        });
    }

    function getFilterValues(filterFieldId, items) {
        // Réccupère uniquement la liste à partir de la première série.
        // TODO: étudier la possibilité de récupérer la liste à partir d'une autre série si plusieurs filtres 'where' dans la requète (est-ce que cela a du sens => trouver cas d'usage).
        if (items.length && items[0].length && filterFieldId) {
            const sql_select = "SELECT DISTINCT " + filterFieldId + " FROM ? ORDER BY " + filterFieldId + " ASC;";
            let result = alasql
                .exec(sql_select, items[0])
                .filter((item) => (item[filterFieldId] = item[filterFieldId] ? item[filterFieldId] : ""));
            return result;
        }
        return [];
    }

    $: filterValues = getFilterValues(filterFieldId, [items]);

    function getField(field, id, table) {
        if (field) {
            const field_parts = field.split(",");
            let field_object = {};
            // const field_name = table && !field_parts[0].includes(".") ? [table, field_parts[0]].join(".") : field_parts[0];
            const field_name =
                table && !field_parts[0].includes(".") ? [table.id, field_parts[0]].join(".") : field_parts[0];
            field_object.name = field_name;
            id = id || field_object.name.replace(".", "_");
            field_object.id = field_parts[1] ? field_parts[1] : id;
            return field_object;
        }
        return false;
    }

    function addField(fields, field) {
        fields.push(field);
        return fields;
    }

    function getOrderby(orderby) {
        let sql_orderby = orderby ? " ORDER BY" : "";
        const orderby_array = orderby ? orderby.split("|") : [];
        for (let i = 0, n = orderby_array.length; i < n; i++) {
            let order = orderby_array[i].split(",");
            order[1] = order[1] || "ASC";
            sql_orderby += " " + order[0] + " " + order[1];
        }
        return sql_orderby;
    }

    function getDatasets(datasets) {
        const datasets_array = datasets ? datasets.split("|") : [];
        let datasets_list = [];
        for (let i = 0, n = datasets_array.length; i < n; i++) {
            const dataset_parts = datasets_array[i].split(",");
            let dataset_object = {};
            dataset_object.name = dataset_parts[0];
            dataset_object.id = dataset_parts[1] || dataset_parts[0].replace(/\.[^/.]+$/, "");
            datasets_list.push(dataset_object);
        }
        return datasets_list;
    }

    function getItems(data, datasets, fields, from, where, groupby, orderby, filter, search, x, y) {
        if (data.length) {
            const datasets_list = getDatasets(datasets);

            // Get fields for SQL select request part
            let sql_fields = [];
            // If fields property exists: use it to generate sql_fields base otherwise []
            // fields_list is the list of fields with format for each field: {name: field1} or {name: field1*field2, id: fieldx} or {name: field1, id: fieldx}
            let fields_array = fields ? fields.split("|") : [];
            let fields_list = [];
            for (let i = 0, n = fields_array.length; i < n; i++) {
                const fields = fields_array[i].split(",");
                for (let j = 0, m = fields.length; j < m; j++) {
                    const dataset = datasets_list.length > 1 ? datasets_list[i] : "";
                    const field = getField(fields[j], false, dataset);
                    fields_list = addField(fields_list, field);
                }
            }

            // Get searchField from search property
            let search_array;
            if (search) {
                search_array = search.split("|");
                searchPlaceholder = search_array[0];
                searchFields = search_array[1].split(",");
            }

            // Get filterField from filter property
            let filter_array;
            if (filter) {
                filter_array = filter.split("|");
                filterLabel = filter_array[0];
                filterField = filter_array[1];
            }

            // Add x field to fields_list
            const x_field = getField(x);
            fields_list = addField(fields_list, x_field);
            xField = x_field.id;
            // Add filter field to fields_list
            const filter_field = getField(filterField);
            fields_list = addField(fields_list, filter_field);
            filterFieldId = filter_field.id;
            // Add search fields to fields_list
            for (let i = 0, n = searchFields.length; i < n; i++) {
                const field = getField(searchFields[i]);
                fields_list = addField(fields_list, field);
            }

            // Add y field to yFields array for chart generation and to fields_list if not groupby
            let y_array = y.split("|");
            for (let i = 0, n = y_array.length; i < n; i++) {
                const y_field = getField(y_array[i], "y" + i);
                if (!yFields.includes(y_field.id)) {
                    yFields.push(y_field.id);
                }
                if (!groupby) {
                    fields_list = addField(fields_list, y_field);
                }
            }

            // Generate fields for select SQL request part from fields_list
            for (let i = 0, n = fields_list.length; i < n; i++) {
                if (fields_list[i]) {
                    const field_name = fields_list[i].table
                        ? fields_list[i].table + "." + fields_list[i].name
                        : fields_list[i].name;
                    const field_id = fields_list[i].id;
                    sql_fields.push(field_id ? field_name + " AS " + field_id : field_name);
                }
            }
            sql_fields = sql_fields.join(", ");

            // Get select SQL request part
            const sql_select = "SELECT " + sql_fields;

            // Get from SQL request part
            const sql_from = from ? " FROM " + from : " FROM ?";
            // Get where SQL request part
            const sql_where = where ? " WHERE " + where : " WHERE 1";

            // Get orderby SQL request part
            // Orderby property format: orderby="field1" (defaut = ASC) or orderby="field1|field2" (defaut = ASC) or orderby="field1,DESC|field2" (defaut = ASC for field2)
            const sql_orderby = getOrderby(orderby);

            // Get final SQL request
            const sql_request = sql_select + sql_from + sql_where + sql_orderby;

            // Get result of sql_request request from data
            let result = alasql.exec(sql_request, data);
            // Add fulltext search column
            result = search ? dgeData.addFulltextField(result, searchFields, searchField) : result;
            return result;
        }
        return [];
    }

    function getFilteredItems(items, groupby, having, orderby, filterValue, searchValue, y) {
        if (items.length && items[0].length) {
            // Get select SQL request part
            let sql_select = "SELECT *";
            // If groupby, add y field to fields list for select SQL request part
            if (groupby) {
                let sql_y = [];
                const y_array = y.split("|");
                for (let i = 0, n = y_array.length; i < n; i++) {
                    const y_field = getField(y_array[i]);
                    sql_y.push(y_field.id ? y_field.name + " AS " + y_field.id : y_field.name);
                }
                sql_select += ", " + sql_y.join(", ");
            }

            // Get from SQL request part
            const sql_from = " FROM ?";

            // Get where SQL request part
            let sql_where = " WHERE 1";
            if (filterValue) {
                filterValue = isNaN(filterValue) ? "'" + dgeData.escapeSql(filterValue) + "'" : filterValue;
                sql_where += " AND " + filterFieldId + "=" + filterValue;
            }
            if (searchValue) {
                sql_where += " AND " + searchField + " LIKE " + "'%" + dgeData.escapeSql(searchValue) + "%'";
            }

            // Get groupby SQL request part
            const sql_groupby = groupby ? " GROUP BY " + groupby.split("|").join(", ") : "";
            // Get having SQL request part
            const sql_having = having ? " HAVING " + having : "";

            // Get orderby SQL request
            // Orderby property format: orderby="field1" (defaut = ASC) or orderby="field1|field2" (defaut = ASC) or orderby="field1,DESC|field2" (defaut = ASC for field2)
            const sql_orderby = getOrderby(orderby);

            // Get final SQL request
            const sql_request = sql_select + sql_from + sql_where + sql_groupby + sql_having + sql_orderby;

            const result = alasql.exec(sql_request, items);
            return result;
        }
        return [];
    }

    $: {
        let where_array = where ? where.split("|") : ["1=1"];
        for (let i = 0, n = where_array.length; i < n; i++) {
            items[i] = getItems(data, datasets, fields, from, where_array[i], groupby, orderby, filter, search, x, y);
            filteredItems[i] = getFilteredItems([items[i]], groupby, having, orderby, filterValue, searchValue, y);
        }
        dgeChart.updateChart(graph, chart, series, xField, yFields, colors, filteredItems, xAxis, yAxis, chartOptions);
        titleReplaced = dgeChart.getTextReplaced(title, filterValue, filterLabel, searchValue, filteredItems, yFields);
    }

    $: xAxis = xaxis ? dgeHelpers.getJsonFromString(xaxis) : false;
    $: yAxis = yaxis ? getYAxis(yaxis) : false;

    function getYAxis(yaxis) {
        const result = [];
        if (yaxis) {
            const axis = yaxis.split("|");
            for (var i = 0, n = axis.length; i < n; i++) {
                result[i] = dgeHelpers.getJsonFromString(axis[i]);
            }
        }
        return result;
    }

    $: series = series ? series.split("|") : false;
    $: colors = colors ? colors.split("|") : false;
    $: chart = chart ? chart.split("|") : false;

    function downloadChart() {
        // image = graph ? canvasElement.toDataURL() : false;
        image = graph ? graph.toBase64Image() : false;
    }

    $: {
        let fields_array = fields.split("|");
        // Get data
        if (refresh) {
            setInterval(getPromiseData, refresh * 1000, url, datasets, properties, fields_array, max, api);
        } else {
            getPromiseData(url, datasets, properties, fields_array, max, api);
        }
    }

    onMount(() => {
        // Init parameters to default value 
        searchValue = search.split("|")[2];
        filterValue = filter.split("|")[2];
        // Init empty graphic
        let plugins = [ChartDataLabels, ChartjsPluginTextcenter.plugin];
        graph = dgeChart.createChart(canvasElement, { plugins: plugins });
    });
</script>

<div {id} class="mt-3 card table-responsive {klass}">
    <div class="card-body">
        <div hidden={!loading || refresh}>
            <div class="d-flex justify-content-center">
                <div class="m-5 text-center">
                    <div class="spinner-grow" role="status" />
                    <div><small class="text-muted">Loading...</small></div>
                </div>
            </div>
        </div>
        <div hidden={loading && !refresh}>
            {#if titleReplaced}
                <div class="text text-center p-2">
                    <h6>{titleReplaced}</h6>
                </div>
            {/if}

            {#if search}
                <div class="search px-2 pb-2">
                    <input
                        class="form-control form-control-sm"
                        type="search"
                        bind:value={searchValue}
                        placeholder={searchPlaceholder}
                    />
                </div>
            {/if}

            {#if filter}
                <div class="select px-2 pb-2">
                    <select
                        class="form-select form-select-sm"
                        bind:value={filterValue}
                        id="filterValue"
                        name="filterValue"
                    >
                        {#if filterLabel}<option value="">{filterLabel}</option>{/if}
                        {#each filterValues as fValue}
                            <option value={fValue[filterFieldId]} selected={fValue[filterFieldId] === filterValue}
                                >{fValue[filterFieldId]}</option
                            >
                        {/each}
                    </select>
                </div>
            {/if}

            <canvas bind:this={canvasElement} id="chart" {width} {height} />

            <div class="text-end mt-2">
                <small class="text-muted">
                    {#if download.icon || download.text}
                        <span class="download me-1">
                            {download.prefix}
                            <a
                                href={image}
                                download="chart.png"
                                on:click={() => {
                                    downloadChart();
                                }}
                                title={download.title}
                                >{#if download.icon}<i
                                        class="bi-{download.icon}"
                                        style={"font-size: " + download.size + "; color: " + download.color + ";"}
                                    />{/if}{#if download.text}{download.text}{/if}
                            </a>
                        </span>
                    {/if}

                    {#if datalink.icon || datalink.text}
                        <span class="datalink me-1">
                            {datalink.prefix}
                            <a href={datalink.url} title={datalink.title || "Lien vers les données"} target="_blank" rel="noreferrer"
                                >{#if datalink.icon}<i
                                        class="bi-{datalink.icon}"
                                        style={"font-size: " + datalink.size + "; color: " + datalink.color + ";"}
                                    />{/if}{#if datalink.text}{datalink.text}{/if}</a
                            >
                        </span>
                    {/if}

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
