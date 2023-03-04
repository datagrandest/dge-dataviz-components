function getJsonFromString(text, defaultValue) {
    if (text && (typeof text === 'string' || text instanceof String)) {
        let jsonProperties = text.split(";").map(property => {
            const attribute = property.split(':')[0].trim();
            let value = property.split(':').slice(1).join(':').trim();
            value = checkValueFormat(value);
            value = typeof value === "string" ? '"' + value + '"' : value;
            return '"' + attribute + '":' + value;
        });
        return JSON.parse('{' + jsonProperties.join(',') + '}');
    }
    return defaultValue || false;
}

function checkValueFormat(value) {
    if (value == "true") {
        return true
    } else if (value == "false" || !value) {
        return false
    // } else if (!isNaN(parseFloat(value))  !value.includes(',')) {
    } else if (/^[0-9\.]+$/.test(value)) {
        return parseFloat(value)
    } else {
        return value;
    };
}

function getBooleanValue(value, defaultValue) {
    if (value == undefined) {
        return defaultValue;
    }
    return [0, false, 'off'].includes(value) ? false : true;
}

export default {
    getJsonFromString: getJsonFromString,
    checkValueFormat: checkValueFormat,
    getBooleanValue: getBooleanValue
}