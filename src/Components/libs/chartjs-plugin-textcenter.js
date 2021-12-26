import Chart from "chart.js/auto";

const defaults = [{
    label: '',
    color: 'rgba(0,0,0,1)',
    baseLine: 'middle',
    align: 'center',
    fontSize: 12,
    lineHeight: null,
    unit: '',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    formatter: (value) => { return value; }
}];

Chart.defaults.plugins.textcenter = defaults;

const utils = {

	parseFont: function(value) {
		var global = Chart.defaults;
		var size = value.size || global.defaultFontSize;
		var font = {
			family: value.family || global.defaultFontFamily,
			lineHeight: value.lineHeight || size,
			size: size,
			style: value.style || global.defaultFontStyle,
			weight: value.weight || null,
			string: ''
		};

		font.string = utils.toFontString(font);
		return font;
	},

	toFontString: function(font) {
		if (!font) {
			return null;
		}

		return (font.style ? font.style + ' ' : '')
			+ (font.weight ? font.weight + ' ' : '')
			+ font.size + 'px '
			+ font.family;
	},

	textSize: function(ctx, labels) {
		var items = [].concat(labels);
		var ilen = items.length;
		var prev = ctx.font;
		var width = 0;
		var height = 0;
		var i;

		for (i = 0; i < ilen; ++i) {
			ctx.font = items[i].font.string;
			width = Math.max(ctx.measureText(items[i].text).width, width);
			height += items[i].font.lineHeight;
		}

		ctx.font = prev;

		var result = {
			height: height,
			width: width
		};
		return result;
	}

};

function drawLabels(chart, args, options) {
    if (options && options.labels && options.labels.length > 0) {
		const ctx = chart.ctx;
		const data = chart.data;

        const allOptions = {...defaults, ...options};

        const height = chart.height;

        const labels = allOptions.labels;
        let innerLabels = [];
		labels.forEach(function(label) {
            const fontSize = (height / 114).toFixed(2) * label.fontSize;
            const font = {
                family: label.fontFamily || 'Arial, sans-serif',
                lineHeight: label.lineHeight || null,
                size: fontSize || 30,
                style: label.fontStyle || '',
                weight: label.fontWeight || 'normal'
            }

			var innerLabel = {
                text: allOptions.formatter(label.label, ctx, data),
                font: utils.parseFont(font),
                color: label.color || 'rgba(0,0,0,1)',
                align: label.align || 'center',
                baseLine: label.baseLine || 'middle',
                x: parseInt(label.x) || 0,
                y: parseInt(label.y) || 0

			};
			innerLabels.push(innerLabel);
		});

		var textAreaSize = utils.textSize(ctx, innerLabels);

		// Calculate the adjustment ratio to fit the text area into the doughnut inner circle
        const innerRadius = args.meta.controller.innerRadius;
		var hypotenuse = Math.sqrt(Math.pow(textAreaSize.width, 2) + Math.pow(textAreaSize.height, 2));
		var innerDiameter = innerRadius * 2;
		var fitRatio = innerDiameter / hypotenuse;

		// Adjust the font if necessary and recalculate the text area after applying the fit ratio
		if (fitRatio < 1) {
			innerLabels.forEach(function(innerLabel) {
				innerLabel.font.size = Math.floor(innerLabel.font.size * fitRatio);
				innerLabel.font.lineHeight = undefined;
				innerLabel.font = utils.parseFont(innerLabel.font);
			});

			textAreaSize = utils.textSize(ctx, innerLabels);
		}

        // The center of the inner circle
		var centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
		var centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);

		// The top Y coordinate of the text area
		var topY = centerY - textAreaSize.height / 2;

		var i;
		var ilen = innerLabels.length;
		var currentHeight = 0;
		for (i = 0; i < ilen; ++i) {
			ctx.fillStyle = innerLabels[i].color;
			ctx.font = innerLabels[i].font.string;
            
			// The Y center of each line
			var lineCenterX = centerX + innerLabels[i].x;
			var lineCenterY = topY + innerLabels[i].font.lineHeight / 2 + currentHeight + innerLabels[i].y;
			currentHeight += innerLabels[i].font.lineHeight;

            ctx.textAlign = innerLabels[i].align;
            ctx.textBaseline = innerLabels[i].baseLine;

			// Draw each line of text
			ctx.fillText(innerLabels[i].text, lineCenterX, lineCenterY);
		}
	}
}

const plugin = {
	id: 'textcenter',
	beforeDatasetDraw: function(chart, args, options) {
		drawLabels(chart, args, options);
	}
};

export default {
    plugin: plugin
}