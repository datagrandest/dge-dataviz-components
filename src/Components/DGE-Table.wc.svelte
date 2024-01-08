<svelte:options
    customElement={{
        tag: 'dge-table',
        shadow: 'open',
        _props: {
            attribution: { reflect: false, type: 'String', attribute: 'attribution' }
        },
    }}
/>


<script>
    import dgeHelpers from "./libs/dge-helpers.js";
    import dgeData from "./libs/dge-data.js";
    import dgeTable from "./libs/dge-table.js";
    import * as alasql from "alasql";
    import { onMount } from "svelte";

    // PROPERTIES
    export let id = "dge-table";
    export let klass = "";
    export let title = "";
    export let localcss = false;
    $: localcss = dgeHelpers.checkValueFormat(localcss);
    export let url = '';
    export let api = "d4c";
    export let datasets = '';
    export let properties = "";
    $: properties = properties ? properties.split("|") : false;
    export let fields = "";
    export let from = '';
    export let where = '';
    export let groupby = '';
    export let having = '';
    export let orderby = '';
    export let search = "";
    export let filter = "";
    export let max = 50; // For 'wfs' and 'd4c'
    export let columns = "";
    export let labels = "";
    export let smalltable = false;
    $: smalltable = dgeHelpers.checkValueFormat(smalltable);
    export let displaytotal = false;
    $: displaytotal = dgeHelpers.checkValueFormat(displaytotal);
    export let sortcolumns = '';
    $: sortcolumns = sortcolumns ? sortcolumns.split(",") : [];
    export let parsehtml = false;
    $: parsehtml = dgeHelpers.checkValueFormat(parsehtml);

    // pagination properties
    export let pagination = false;
    export let displaypagination = false;
    export let perpage = "10";
    export let page = 1;
    export let selectpages = "5,10,25,50,100";
    let selectpages_array = [];
    $: {
        pagination = dgeHelpers.getJsonFromString(pagination, false);
        displaypagination = pagination.display || dgeHelpers.checkValueFormat(displaypagination);
        page = pagination.page || dgeHelpers.checkValueFormat(page);
        selectpages = pagination.selectpages || selectpages;
        selectpages_array = selectpages.split(",").map((value) => {
            return parseFloat(value);
        });
        perpage = pagination.perpage || dgeHelpers.checkValueFormat(perpage) || selectpages_array[0];
    }

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

    export let refresh = 0;
    $: refresh = dgeHelpers.checkValueFormat(refresh);

    let loading = 0;
    let data = false;
    let items = false;
    let filteredItems = [];
    let displayedItems = [];
    let filterValues = [];
    let filterValue;
    let filterField;
    let filterFieldId;
    let filterLabel;
    let searchPlaceholder = "";
    let searchValue = "";
    let searchFields = [];
    let searchField = "_search";
    let pages = 1;
    let columns_list = [];
    let labels_array = "";

    $: sort_columns_array = labels_array.length ? Array(labels_array.length).fill("DESC") : [];

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

    function getFilterValues(filterFieldId, items, where) {
        if (items.length && items[0].length && filterFieldId) {
            const sql_select = "SELECT DISTINCT " + filterFieldId + " FROM ? ORDER BY " + filterFieldId + " ASC;";
            let result = alasql
                .exec(sql_select, items)
                .filter((item) => (item[filterFieldId] = item[filterFieldId] ? item[filterFieldId] : ""));
            return result;
        }
        return [];
    }

    $: filterValues = getFilterValues(filterFieldId, [items], where);

    function getField(field, id, table) {
        if (field) {
            const field_parts = field.split(",");
            let field_object = {};
            const field_name =
                table && !field_parts[0].includes(".") ? [table, field_parts[0]].join(".") : field_parts[0];
            field_object.name = field_name;
            id = id || field_object.name.replace(".", "_");
            field_object.id = field_parts[1] ? field_parts[1] : id;
            return field_object;
        }
        return false;
    }

    function addField(fields, field) {
        const index = fields.findIndex((f) => {
            return f.id == field.id;
        });
        fields.push(index == -1 ? field : false);
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

    function getItems(data, datasets, fields, from, where, groupby, filter, search, columns) {
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
                    const dataset = datasets_list.length > 1 ? datasets_list[i].id : "";
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
            // Add search fields to fields_list
            for (let i = 0, n = searchFields.length; i < n; i++) {
                const field = getField(searchFields[i]);
                fields_list = addField(fields_list, field);
            }

            // Get columns array
            let columns_array = columns ? columns.split("|") : fields_array[0].slice().split(",");
            columns_list = [];
            for (let i = 0, n = columns_array.length; i < n; i++) {
                const column_field = getField(columns_array[i]);
                columns_list.push(column_field.id);
                if (!groupby) {
                    fields_list = addField(fields_list, column_field);
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
            let sql_from = [];
            if (from) {
                sql_from.push(from);
            } else {
                if (datasets_list.length) {
                    for (let i = 0, n = datasets_list.length; i < n; i++) {
                        sql_from.push("? AS `" + datasets_list[i].id + "`");
                    }
                } else {
                    sql_from.push("?");
                }
            }
            sql_from = " FROM " + sql_from.join(", ");

            // Get where SQL request part
            const sql_where = where ? " WHERE " + where : " WHERE 1";

            // Get orderby SQL request part
            // Orderby property format: orderby="field1" (defaut = ASC) or orderby="field1|field2" (defaut = ASC) or orderby="field1,DESC|field2" (defaut = ASC for field2)
            // const sql_orderby = getOrderby(orderby);

            // Get final SQL request
            // const sql_request = sql_select + sql_from + sql_where + sql_orderby;
            const sql_request = sql_select + sql_from + sql_where;

            // Get result of sql_request request from data
            let result = alasql.exec(sql_request, data);
            // Add fulltext search column
            result = search ? dgeData.addFulltextField(result, searchFields, searchField) : result;
            return result;
        }
        return [];
    }

    function getFilteredItems(items, groupby, having, orderby, filterValue, searchValue, columns) {
        if (items.length && items[0].length) {
            // Get select SQL request part
            let sql_select = "SELECT *";
            // If groupby, add columns field to fields list for select SQL request part
            if (groupby) {
                let sql_columns = [];
                const columns_array = columns.split("|");
                for (let i = 0, n = columns_array.length; i < n; i++) {
                    const columns_field = getField(columns_array[i]);
                    sql_columns.push(
                        columns_field.id ? columns_field.name + " AS " + columns_field.id : columns_field.name
                    );
                }
                sql_select += ", " + sql_columns.join(", ");
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

    $: items = getItems(data, datasets, fields, from, where, groupby, filter, search, columns);
    $: filteredItems = getFilteredItems([items], groupby, having, orderby, filterValue, searchValue, columns);

    $: titleReplaced = dgeTable.getTextReplaced(title, filterValue, filterLabel, searchValue, filteredItems);

    function updatePages() {
        if (filteredItems.length) {
            pages = filteredItems.length ? Math.ceil(filteredItems.length / perpage) : 1;
            page = page > pages ? pages : page;
        }
    }

    $: {
        displayedItems = filteredItems ? filteredItems.slice((page - 1) * perpage, page * perpage) : filteredItems;
        updatePages();
    }

    $: labels_array = labels.includes("|") ? labels.split("|") : labels.split(",");

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
    });

    function sortColumn(event, colId) {
        event.preventDefault();
        const sort = sort_columns_array[colId] == "ASC" ? "DESC" : "ASC";
        sort_columns_array[colId] = sort;
        orderby = columns_list[colId] + "," + sort;
    }
</script>

<div {id} class="mt-3 card table-responsive {klass}">
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
                <select class="form-select form-select-sm" bind:value={filterValue} id="filterValue" name="filterValue">
                    {#if filterLabel}<option value="">{filterLabel}</option>{/if}
                    {#each filterValues as fValue}
                        <option value={fValue[filterFieldId]} selected={fValue[filterFieldId] === filterValue}
                            >{fValue[filterFieldId]}</option
                        >
                    {/each}
                </select>
            </div>
        {/if}

        <table class="table table-hover m-0 {smalltable ? 'table-sm' : ''}">
            {#if displayedItems.length}
                <thead>
                    <tr>
                        {#each labels_array as label, labelId}
                            <th scope="col">
                                {label}
                                {#if sortcolumns.includes("true") || sortcolumns.includes(columns_list[labelId])}
                                    <a
                                        class="text-dark"
                                        href="/"
                                        on:click={(event) => {
                                            sortColumn(event, labelId);
                                        }}
                                        ><i class="bi-arrow-down-up" />
                                    </a>
                                {/if}
                            </th>
                        {/each}
                    </tr>
                </thead>
            {/if}
            <tbody>
                {#each displayedItems as item}
                    <tr>
                        {#each columns_list as col}
                            {#if parsehtml && typeof item[col] == "string" && item[col]
                                    .toLowerCase()
                                    .startsWith("http")}
                                <td><a href={item[col]}>{item[col]}</a></td>
                            {:else if parsehtml}
                                <td>{@html item[col]}</td>
                            {:else}
                                <td>{item[col]}</td>
                            {/if}
                        {/each}
                    </tr>
                {:else}
                    <tr>
                        <td class="text-center">Aucune donnée à afficher</td>
                    </tr>
                {/each}
            </tbody>
        </table>

        {#if displaytotal}
            <div class="text-end m-2">
                <small class="text-muted">
                    Items {filteredItems.length}/{items.length} - page {page}/{pages}
                </small>
            </div>
        {/if}

        {#if displaypagination}
            <div class="d-flex justify-content-between mt-2 mb-3 mx-3">
                <button
                    type="button"
                    class="btn btn-sm btn-outline-dark"
                    disabled={page == 1}
                    on:click={() => {
                        page--;
                    }}>&lt;&lt;</button
                >
                <div class="form-group m-0">
                    <select class="form-select form-select-sm d-inline" bind:value={perpage}>
                        {#each selectpages_array as spage}
                            <option value={spage}>{spage}</option>
                        {/each}
                    </select>
                </div>
                <button
                    type="button"
                    class="btn btn-sm btn-outline-dark"
                    disabled={page == pages}
                    on:click={() => {
                        page++;
                    }}>&gt;&gt;</button
                >
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
