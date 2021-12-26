import * as alasql from "alasql";

function calculFigure(items, operation, field) {
    items = items.map((item) => {
        item[field] = parseFloat(item[field]);
        return item;
    });
    if (operation == "sum") {
        var sql = "SELECT SUM(" + field + ") AS result FROM ?";
    }
    if (operation == "average") {
        var sql = "SELECT AVG(" + field + ") AS result FROM ?";
    }
    if (operation == "min") {
        var sql = "SELECT MIN(" + field + ") AS result FROM ?";
    }
    if (operation == "max") {
        var sql = "SELECT MAX(" + field + ") AS result FROM ?";
    }
    if (operation == "count") {
        var sql = "SELECT COUNT(" + field + ") AS result FROM ?";
    }
    if (operation == "value") {
        var sql = "SELECT " + field + " AS result FROM ?";
    }
    const result = alasql.exec(sql, [items])[0].result;
    return result;
}

function getTextReplaced(text, filterValue, filterLabel, searchValue) {
    return text.replace('%filter%', filterValue ? filterValue : filterLabel).replace('%search%', searchValue);
}

export default {
    calculFigure: calculFigure,
    getTextReplaced: getTextReplaced
}