function getPopup(data, fields, labels) {
    var html = "";
    html += "<table>";
    for (let i in data) {
        const label = fields && fields.includes(i) ? labels[fields.indexOf(i)] : i;
        if (!fields || (fields && fields.includes(i))) {
            let value = data[i] ? data[i].toString() : '';
            // Check if value is an URL
            if (value.startsWith("http")) {
                const ext = data[i].substring(data[i].lastIndexOf('.') + 1);
                // Check if value is an image
                if (['jpg', 'png'].includes(ext)) {
                    value = '<a target="_blank" href="' + data[i] + '"><img src="' + data[i] + '" width="120" /></a>';
                } else {
                    value = '<a target="_blank" href="' + data[i] + '">' + label + '</a>';
                }
            }
            html += "<tr>";
            html += "<th>" + label + ":</th>";
            html += "<td>" + value + "</td>";
            html += "</tr>";
        }
    }
    html += "</table>";
    return html
}


export default {
    getPopup: getPopup
}