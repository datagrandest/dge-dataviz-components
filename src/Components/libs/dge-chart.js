import Chart from "chart.js/auto";
import * as chartHelpers from 'chart.js/helpers';
import {TreemapController, TreemapElement} from 'chartjs-chart-treemap';
import {WordCloudController, WordElement} from 'chartjs-chart-wordcloud';
import dgeHelpers from "./dge-helpers.js";
import dgeData from "./dge-data.js";

function dynamicColors(a) {
    a = a || 0.5;
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    const rgba = [r, g, b, a].join(",");
    return "rgba(" + rgba + ")";
}

function poolColors(n) {
    var pool = [];
    for (let i = 0; i < n; i++) {
        pool.push(dynamicColors());
    }
    return pool;
}

function createChart(canvasElement, defaultOptions) {
    const initOptions = {
        type: "bar",
        data: {
            labels: [],
            datasets: [],
        },
        options: {
            responsive: true,
        },
    };
    const options = {...initOptions, ...defaultOptions};
    const ctx = canvasElement.getContext("2d");
    Chart.register(TreemapController, TreemapElement);
    Chart.register(WordCloudController, WordElement);
    const chart = new Chart(ctx, options);
    return chart;
}

function reverseData(yFields, values) {
    // let labels = yFields;
    let yValues = [];
    for (let i=0, n=yFields.length; i<n; i++) {
        yValues.push(values[0][yFields[i]]);
    }
    return yValues;
}

function updateChart(graph, chart, series, xField, yFields, colors, items, xAxis, yAxis, chartOptions) {

    //  Graph types:
    // start with 'bars': une couleur par barre
    // bar-h / bars-h: horizontal
    // bar-s: séries supperposé (stacked)
    // bar-hs: séries supperposé (stacked) en mode horizontal

    if (graph) {
        var xValues = [];
        var yValues = [];

        
        if (chartOptions.plugins.dge.reverse) {
            yValues[0] = reverseData(yFields, items[0]);
            xValues = chartOptions.plugins.dge.labels || yFields;
            yFields = [xField];
        } else {
            // TODO: à remplacer par la ligne suivante (à tester):
            if (chartOptions.plugins.dge.labels) {
                xValues = chartOptions.plugins.dge.labels;
            } else {
                xValues = items[0].filter((item) => {
                    return item[xField];
                }).map((item) => {
                    return item[xField];
                });
            }

            for (let f = 0, n = yFields.length; f < n; f++) {
                // TODO: Ligne suivante à tester
                const id = items[f] ? f : 0;
                yValues.push(
                    items[id].map((item) => {
                        return item[yFields[f]];
                    })
                );
            }
        }

        graph.config.data.labels = xValues;

        let type = chart[0].startsWith('bar') ? 'bar' : chart[0];
        type = chart[0] == 'gauge' ? 'doughnut' : type;
        if (['bar-h', 'bar-s', 'bar-hs', 'gauge', 'pie', 'doughnut', 'wordCloud'].includes(chart[0])) {
            graph.config.type = type;
        }
        if (["bar", "line"].includes(type)) {
            if (xAxis) {
                    graph.config.options.scales.x = {
                        beginAtZero: parseInt(xAxis.start) == 0 ? true : false,
                        position: xAxis.position || false,
                        grid: {
                            display: xAxis.drawGrid || false,
                            drawBorder: xAxis.drawBorder || false,
                            drawOnChartArea: xAxis.drawLines || false,
                            drawTicks: xAxis.drawTicks || false,
                        }
                    }
            }
            if (yAxis.length) {
                for (var i = 0, n = yAxis.length; i < n; i++) {
                    graph.config.options.scales['y' + i] = {
                        beginAtZero: parseInt(yAxis[i].start) == 0 ? true : false,
                        position: yAxis[i].position || false,
                        grid: {
                            display: yAxis[i].drawGrid || false,
                            drawBorder: yAxis[i].drawBorder || false,
                            drawOnChartArea: yAxis[i].drawLines || false,
                            drawTicks: yAxis[i].drawTicks || false,
                        }
                    }
                }
            }
            if (chart[0].endsWith("-h") || chart[0].endsWith("-hs")) {
                graph.config.options.indexAxis = 'y';
            }
            if (["bar-s", "bar-hs"].includes(chart[0])) {
                graph.config.options.scales = {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                    }
                };
            }
        }
        
        if (chart[0] == "gauge") {
            graph.config.options = {...graph.config.options, ...chartOptions.gauge};
            delete chartOptions.gauge;
        }

        if (chart[0] == "wordCloud") {
            graph.config.options.responsive = false;
        }

        chartOptions.plugins.textcenter.formatter = function(value, ctx, data) {
            if (data.datasets && data.datasets.length && data.datasets[0].data) {
                return dgeData.replaceText(value, data.datasets[0].data);
            }
            return value;
        }

        chartOptions.plugins.datalabels.formatter = function(value, ctx) {
            const format = chartOptions.plugins.datalabels.format ? chartOptions.plugins.datalabels.format.split(',') : ['label'];
            let result = ctx.dataset.data[ctx.dataIndex];
            if (format[0] == 'label') {
                result = ctx.chart.data.labels[ctx.dataIndex];
            }
            if (format[0] == 'percent') {
                let sum = 0;
                if (yFields.length == 1) {
                    sum = ctx.chart.data.datasets[0].data.reduce((sum, value) => sum + value, 0);
                } else {
                    for (let i=0, n=yFields.length; i<n; i++) {
                        sum += ctx.chart.data.datasets[i].data[0];
                    }
                }
                result = (value*100 / sum).toFixed(format[1] || 0);
            }
            return String(result.toLocaleString()) + chartOptions.plugins.datalabels.unit;
        };
        if (!isNaN(parseFloat(chartOptions.plugins.datalabels.displayLimit))) {
            chartOptions.plugins.datalabels.display = function(ctx) {
                return ctx.dataset.data[ctx.dataIndex] > parseFloat(chartOptions.plugins.datalabels.displayLimit);
            };
        };

        graph.config.options = {...graph.config.options, ...chartOptions};

        graph.config.data.datasets = [];
        for (let f = 0, n = yFields.length; f < n; f++) {
            const datasetChart = chart[f] ? chart[f] : chart[0];
            var color = colors[f];
            const multiColors = ["pie", "doughnut", "polarArea", "gauge"].includes(datasetChart) || datasetChart.startsWith("bars");
            if (color) {
                color = multiColors ? color.split(';') : color;
            }
            else {
                color = multiColors ? poolColors(xValues.length) : dynamicColors(0.5);
            }
            const datasetType = datasetChart.startsWith('bar') ? 'bar' : datasetChart;

            if (datasetType == "treemap") {
                graph.config.type = 'treemap';
                graph.config.data.datasets[f] = {
                    label: series[f] || "Série " + (f + 1),
                    tree: yValues[f].sort(function(a, b){return b-a}),
                    borderWidth: 1,
                    spacing: 0,
                    backgroundColor: (ctx) => colorFromRaw(ctx, color, Math.max(...yValues[f])),
                    borderColor: color,
                    labels: chartOptions.plugins.treemap.tmLabels
                };
                graph.config.options.plugins.tooltip = {
                    callbacks: {
                        label: (item) => treemapTooltip(item, items[0], xField, yFields[0], chartOptions.plugins.treemap),
                    }
                }
            } else {
                graph.config.data.datasets[f] = {
                    data: yValues[f],
                    label: series[f] || "Série " + (f + 1),
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1,
                    type: ['bar-h', 'bar-s', 'bar-hs', 'pie', 'doughnut', 'gauge'].includes(datasetChart) ? null : datasetType,
                    yAxisID: yAxis ? "y" + f : "y"
                };
            }           
        }
        graph.update();
    }
}

function treemapTooltip(item, items, xField, yField, labelsOptions) {
    const sortedItems = items.sort((a, b) => (a[yField] > b[yField]) ? -1 : 1);
    return sortedItems[item.dataIndex][xField] 
        + ': ' 
        + String(parseFloat(sortedItems[item.dataIndex][yField]).toFixed(labelsOptions.decimal).toLocaleString()) 
        + labelsOptions.unit;
}

function colorFromRaw(ctx, color, max) {
    if (ctx.type !== 'data') {
        return 'transparent';
    }
    const value = ctx.raw.v;
    let alpha = Math.log(1 + (value / max));
    return chartHelpers.color(color).alpha(alpha).rgbString();
}

function getTextReplaced(text, filterValue, filterLabel, searchValue, data, yFields) {
    if (data) {
        let yValues = [];
        for (let i = 0, n = data[0].length; i < n; i++) {
            if (yFields.length == 1) {
                yValues.push(data[0][i][yFields[0]]);
            } else {
                yValues = reverseData(yFields, data[0]);
            }
        }
        text = dgeData.replaceText(text, yValues);
    }
    return text.replace('%filter%', filterValue ? filterValue : filterLabel).replace('%search%', searchValue);
}


export default {
    dynamicColors: dynamicColors,
    poolColors: poolColors,
    createChart: createChart,
    updateChart: updateChart,
    getTextReplaced: getTextReplaced
}