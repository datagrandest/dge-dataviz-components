import * as alasql from "alasql";
import * as Papa from "papaparse"

function escapeSql(fieldValue) {
    if(fieldValue.indexOf('\\') > -1)
        fieldValue = fieldValue.replace(/(\\)/g, '\\\\');
    if(fieldValue.indexOf("'") > -1)
        fieldValue = fieldValue.replace(/(\')/g, "\\'");
    if(fieldValue.indexOf('"') > -1)
        fieldValue = fieldValue.replace(/(\")/g, '\\"');
    return fieldValue;
}

function replaceText(text, data, type) {
    if (data.length) {
        var regexp = new RegExp(".*(%(sum|min|max|average|percent|value),?([0-9]{0,2}),?([0-9\.\-]*),?(\\w*)%).*", "g");
        var match = regexp.exec(text);
        
        if (match) {
            const replaceString = match[1] || '';
            const operation =  match[2] || 'value';
            const decimal = parseInt(match[3]) || 0;
            const indexes = match[4].split(/\-|\./).filter(val => val != '');
            const field = match[5] || '';

            if (type == 'table') {
                let values = [];
                for (let i = 0, n = data.length; i < n; i++) {
                    values.push(data[i][field]);
                }
                data = values;
            }
            
            let result = 0;
            if (['sum', 'percent', 'average'].includes(operation)) {
                const sum = data.reduce((sum, value) => sum + value, 0);
                if (indexes.length == 0 || parseInt(indexes[0]) == -1) {
                    result = sum;
                } else {
                    for (var i=0, n=indexes.length; i<n; i++) {
                        result += data[indexes[i]];
                    }
                }
                if (operation == 'percent') {
                    result = result * 100 / sum;
                }
                if (operation == 'average') {
                    const len = indexes.length ? indexes.length : data.length;
                    result = result / len;
                }
            }
            if (operation == 'min') {
                result = Math.min(...data);
            }
            if (operation == 'max') {
                result = Math.max(...data);
            }
            if (operation == 'value') {
                const index = indexes[0] || 0;
                result = data[index];
            }
            result = String(result.toFixed(decimal).toLocaleString());
            return text.replace(replaceString, result);
        }
    }
    return text;
}

function getItems(api, json) {
    var items = [];
    if (api == "d4c") {
        items = json.records.map((record) => {
            return record.fields;
        });
    }
    if (api == "wfs") {
        items = json.features.map((feature) => {
            return feature.properties;
        });
    }
    if (api == "json" || api == "csv") {
        items = json;
    }
    return items;
}

function filterItems(items, filter) {
    if (filter) {
        const sql = "SELECT * FROM ? WHERE 1 AND " + filter;
        items = alasql.exec(sql, [items]);
    }
    return items;
}

function parseData(x){
    return x==x*1?x*1:x;
}

function getDataUrl(url, dataset, max, fields, api) {
    api = api || "d4c";
    if (api == "d4c") {
        url = url || "https://www.datagrandest.fr/data4citizen/d4c/api/records/1.0/search/";
        url = url + "?dataset=" + dataset;
        url = max ? url + '&rows=' + max : url;
        return url;
    }
    if (api == "wfs") {
        url = url || "https://www.datagrandest.fr/geoserver";
        var url = url + "/wfs?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson";
        var properties = [url, "typeName=" + dataset, "maxFeatures=" + max];
        if (fields) properties.push("propertyName=" + fields);
        return properties.join("&");
    }
    if (api == "json" || api == "csv") {
        return dataset ? url + dataset : url;
    }
    return false;
}

function getData(apiUrl, api) {
        return fetch(apiUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("HTTP error " + response.status);
                }
                return api == "csv" ? response.text() : response.json();
            })
            .then(function (data) {
                var json =
                    api == "csv" ? Papa.parse(data, {header: true, dynamicTyping: true}).data : data;
                return getItems(api, json);
            });
    }

    function addFulltextField(items, itemFields, fieldName) {
        fieldName = fieldName || '_search';
        return items.map((item) => {
            var _search = [];
            for (let i = 0, n = itemFields.length; i < n; i++) {
                _search.push(item[itemFields[i]]);
            }
            item[fieldName] = _search.join(" ");
            return item;
        });
    }
    
export default {
    getData: getData,
    getDataUrl: getDataUrl,
    getItems: getItems,
    filterItems: filterItems,
    addFulltextField: addFulltextField,
    escapeSql: escapeSql,
    replaceText: replaceText,
    parseData: parseData,
}