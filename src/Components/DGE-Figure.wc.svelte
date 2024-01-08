<svelte:options
    customElement={{
        tag: 'dge-figure',
        shadow: 'open',
        _props: {
            attribution: { reflect: false, type: 'String', attribute: 'attribution' }
        },
    }}
/>

<script>
    import dgeHelpers from "./libs/dge-helpers.js";
    import dgeData from "./libs/dge-data.js";
    import dgeFigure from "./libs/dge-figure.js";
    import * as alasql from "alasql";
    import { onMount } from "svelte";

    // PROPERTIES
    export let id = "dge-figure";
    export let klass = "";
    export let text = "";
    export let localcss = false;
    $: localcss = dgeHelpers.checkValueFormat(localcss);

    export let value = '';
    $: value = dgeHelpers.checkValueFormat(value);

    // image properties
    export let image = '';
    export let imageurl = false;
    export let imageposition = "top";
    export let imagerounded = false;
    export let imagealt = "";
    $: {
        const defaultImageOptions = {
            url: imageurl,
            position: imageposition,
            rounded: imagerounded,
            alt: imagealt,
        };
        const imageOptions = image ? dgeHelpers.getJsonFromString(image) : {};
        image = { ...defaultImageOptions, ...imageOptions };
    }

    // icon properties
    export let icon = '';
    export let iconname = false;
    export let iconsize = "48px";
    export let iconcolor = "#000";
    export let iconposition = "top";
    $: {
        const defaultIconOptions = {
            name: iconname,
            size: iconsize,
            color: iconcolor,
            position: iconposition,
        };
        const iconOptions = icon ? dgeHelpers.getJsonFromString(icon) : {};
        icon = { ...defaultIconOptions, ...iconOptions };
    }
    $: position = image.position || icon.position || "top";

    // attribution properties
    export let attribution = '';
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
    export let datalink = '';
    export let datalinkicon = '';
    export let datalinktext = '';
    export let datalinkprefix = "";
    export let datalinkurl = '';
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

    export let url = '';
    export let api = "json";
    export let datasets = '';
    export let properties = "";
    $: properties = properties ? properties.split("|") : false;
    export let fields = "";
    export let from = '';
    export let where = '';
    export let search = "";
    export let filter = "";
    export let max = 50; // For 'wfs' and 'd4c'

    export let operation = "";
    export let unit = "";
    export let decimal = "0";

    export let refresh = 0;

    let loading = 0;
    let data = false;
    let items = [];

    let filterValues = [];
    let filterValue = null;
    let filterField;
    let filterFieldId;
    let filterLabel;

    let searchPlaceholder = "";
    let searchValue = "";
    let searchFields = [];
    let searchField = "_search";

    $: textReplaced = dgeFigure.getTextReplaced(text, filterValue, filterLabel, searchValue);

    function getPromiseData(url, datasets, properties, fields_array, max, api) {
        const datasets_list = datasets ? getDatasets(datasets) : [{ name: url.substring(url.lastIndexOf("/") + 1) }];
        const url_base = datasets ? url : url.substring(0, url.lastIndexOf("/")) + "/";

        let dataRequests = [];
        for (let i = 0, n = datasets_list.length; i < n; i++) {
            const apiFields = fields_array[i] ? fields_array[i] : false;
            const apiUrl = dgeData.getDataUrl(url_base, datasets_list[i].name, max, apiFields, api);
            const property = properties[i] ? properties[i] : false;
            dataRequests.push(dgeData.getData(apiUrl, api, property));
        }
        loading++;
        Promise.all(dataRequests).then((response) => {
            data = response;
            loading--;
        });
    }

    function getField(field, id, table) {
        if (field) {
            const field_parts = field.split(",");
            let field_object = {};
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

    function getItems(data, datasets, fields, from, where, filter, filterValue, search, searchValue, operation) {
        if (value) {
            return [];
        }

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

            // Add filter field to fields_list
            const filter_field = getField(filterField);
            fields_list = addField(fields_list, filter_field);
            filterFieldId = filter_field.id;
            filterFieldId = filterFieldId;

            // Add search fields to fields_list
            for (let i = 0, n = searchFields.length; i < n; i++) {
                const field = getField(searchFields[i]);
                fields_list = addField(fields_list, field);
            }

            // Add operation field to fields_list
            let operation_array = operation.split("|") || [];
            const operation_field = getField(operation_array[1], "figure");
            fields_list = addField(fields_list, operation_field);

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
            let sql_where = where ? " WHERE " + where : " WHERE 1";

            if (filterValue) {
                filterValue = isNaN(filterValue) ? "'" + dgeData.escapeSql(filterValue) + "'" : filterValue;
                sql_where += " AND " + filterFieldId + "=" + filterValue;
            }

            if (searchValue) {
                sql_where += " AND " + searchField + " LIKE " + "'%" + dgeData.escapeSql(searchValue) + "%'";
            }

            // Get final SQL request
            const sql_request = sql_select + sql_from + sql_where;

            // Parse data to convert string to float if possible
            for (let i = 0, n = data.length; i < n; i++) {
                data[i].map((item) => {
                    for (const key in item) {
                        item[key] = dgeData.parseData(item[key]);
                    }
                    return item;
                });
            }

            // Get result of sql_request request from data
            let result = alasql.exec(sql_request, data);
            // Add fulltext search column
            result = search ? dgeData.addFulltextField(result, searchFields, searchField) : result;
            return result;
        }
        return [];
    }

    $: items = getItems(data, datasets, fields, from, where, filter, filterValue, search, searchValue, operation);

    function getResult(items, operation) {
        const operations = {
            average: "AVG",
            sum: "SUM",
            min: "MIN",
            max: "MAX",
            count: "COUNT",
            value: "",
        };

        if (value) {
            return value;
        }

        if (items.length) {
            let operation_array = operation.split("|") || [];
            const operation_field = getField(operation_array[1], "figure");

            // Convert value of figure to float
            items = items.map((item) => {
                item[operation_field.id] = parseFloat(item[operation_field.id]);
                return item;
            });

            let sql_select =
                "SELECT " + operations[operation_array[0].toLowerCase()] + "(" + operation_field.id + ") AS result";

            // Get from SQL request part
            const sql_from = " FROM ?";

            // Get where SQL request part
            let sql_where = " WHERE 1";

            // Get final SQL request
            const sql_request = sql_select + sql_from + sql_where;

            let result = alasql.exec(sql_request, [items])[0].result;
            result = result.toLocaleString("fr-FR", {
                minimumFractionDigits: decimal,
                maximumFractionDigits: decimal,
            });
            return result;
        }
        return 0;
    }

    $: result = value ? value : getResult(items, operation);

    function getFilterValues(filterFieldId, items_list) {
        if (items_list.length && items_list[0].length && filterFieldId) {
            const sql_select = "SELECT DISTINCT " + filterFieldId + " FROM ? ORDER BY " + filterFieldId + " ASC;";
            let result = alasql
                .exec(sql_select, items_list)
                .filter((item) => (item[filterFieldId] = item[filterFieldId] ? item[filterFieldId] : ""));
            return result;
        }
        return [];
    }

    $: filterValues = getFilterValues(filterFieldId, data);

    onMount(() => {
        searchValue = search.split("|")[2];
        filterValue = filter.split("|")[2];
        let fields_array = fields.split("|");
        // Get data
        if (!value) {
            if (refresh) {
                setInterval(getPromiseData, refresh * 1000, url, datasets, properties, fields_array, max, api);
            } else {
                getPromiseData(url, datasets, properties, fields_array, max, api);
            }
        }
    });
</script>

<div {id} class="mt-3 card {klass}">
    <div class="card-body">
        <div hidden={!loading || result}>
            <div class="d-flex justify-content-center">
                <div class="m-5 text-center">
                    <div class="spinner-grow" role="status" />
                    <div><small class="text-muted">Loading...</small></div>
                </div>
            </div>
        </div>
        <div hidden={loading && !result}>
            {#if (icon.name || image.url) && position == "top"}
                <div class="row">
                    <div class="col">
                        {#if icon.name}
                            <div class="icon text-center my-3">
                                <i
                                    class="bi-{icon.name}"
                                    style={"font-size: " + icon.size + "; color: " + icon.color + ";"}
                                />
                            </div>
                        {/if}
                        {#if image.url}
                            <img src={image.url} class="img-fluid {image.rounded ? 'rounded' : ''}" alt={image.alt} />
                        {/if}
                    </div>
                </div>
            {/if}
            <div class="row">
                <div class="col">
                    <div class="d-flex justify-content-center">
                        {#if (icon.name || image.url) && position == "left"}
                            {#if icon.name}
                                <div class="icon text-end my-0 me-3">
                                    <i
                                        class="bi-{icon.name}"
                                        style={"font-size: " + icon.size + "; color: " + icon.color + ";"}
                                    />
                                </div>
                            {/if}
                            {#if image.url}
                                <div class="image my-0 me-3">
                                    <img
                                        src={image.url}
                                        class="img-fluid {image.rounded ? 'rounded' : ''}"
                                        alt={image.alt}
                                    />
                                </div>
                            {/if}
                        {/if}
                        <div class="">
                            <div class="result text-center">
                                <h2>{result} {unit}</h2>
                            </div>

                            {#if textReplaced}
                                <div class="text text-center">
                                    <h5>{@html textReplaced}</h5>
                                </div>
                            {/if}
                        </div>
                        {#if (icon.name || image.url) && position == "right"}
                            {#if icon.name}
                                <div class="icon text-start my-0 ms-3">
                                    <i
                                        class="bi-{icon.name}"
                                        style={"font-size: " + icon.size + "; color: " + icon.color + ";"}
                                    />
                                </div>
                            {/if}
                            {#if image.url}
                                <div class="image my-0 ms-3">
                                    <img
                                        src={image.url}
                                        class="img-fluid {image.rounded ? 'rounded' : ''}"
                                        alt={image.alt}
                                    />
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
            </div>
            {#if (icon.name || image.url) && position == "bottom"}
                <div class="row">
                    <div class="col">
                        {#if icon.name}
                            <div class="icon text-center my-3">
                                <i
                                    class="bi-{icon.name}"
                                    style={"font-size: " + icon.size + "; color: " + icon.color + ";"}
                                />
                            </div>
                        {/if}
                        {#if image.url}
                            <img src={image.url} class="img-fluid {image.rounded ? 'rounded' : ''}" alt={image.alt} />
                        {/if}
                    </div>
                </div>
            {/if}

            {#if search}
                <div class="search px-2 py-3">
                    <input
                        class="form-control form-control-sm"
                        type="search"
                        bind:value={searchValue}
                        placeholder={searchPlaceholder}
                    />
                </div>
            {/if}

            {#if filter}
                <div class="select px-2 py-3">
                    <select
                        class="form-select form-select-sm"
                        bind:value={filterValue}
                        id="filterValue"
                        name="filterValue"
                    >
                        {#if filterLabel}<option value="">{filterLabel}</option>{/if}
                        {#each filterValues as fValue}
                            <option value={fValue[filterFieldId]} selected={fValue[filterFieldId] === filterValue}>
                                {fValue[filterFieldId]}
                            </option>
                        {/each}
                    </select>
                </div>
            {/if}

            <div class="text-end mt-2">
                <small class="text-muted">
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
