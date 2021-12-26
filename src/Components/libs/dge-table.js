import dgeData from "./dge-data.js";

function getTextReplaced(text, filterValue, filterLabel, searchValue, data) {
    if (data) {
        text = dgeData.replaceText(text, data, 'table');
    }
    return text.replace('%filter%', filterValue ? filterValue : filterLabel).replace('%search%', searchValue);
}

export default {
    getTextReplaced: getTextReplaced
}