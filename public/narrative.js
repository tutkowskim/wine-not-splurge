const dataPromise = d3.json('/winemag-data-130k-v2.json');

const average = (set) => Array.from(set).reduce((a, b) => (a + b), 0) / set.length;

const fetchAppContainer = () => d3.select('.app');
const fetchNarrativeContainer = () => d3.select('.app-narrative');
const fetchTooltipContainer = () => d3.select('.app-narrative-tooltip');

const loadData = async () => {
    // Show a message that the data is still loading for slower connections
    const loadingMessage = fetchNarrativeContainer()
        .append('div')
        .attr('style', 'display: flex; align-items: center; justify-content: center; height: 100%;');
    loadingMessage
        .append('h3')
        .html('Loading...');

    const data = await dataPromise;
    loadingMessage.remove();
    return data;
}

const showTooltip = (event, buildTooltipContents) => {
    const element = d3.select(event.srcElement);
    element.style('outline', '3px solid black');

    const tooltip = fetchTooltipContainer();
    tooltip.html(buildTooltipContents(event));
    tooltip.style('top', `${event.clientY + 10}px`);
    tooltip.style('left', `${event.clientX + 10}px`);
    tooltip.style('display', 'inline');
}

const hideTooltip = (event) => {
    const tooltip = fetchTooltipContainer();
    tooltip.style('display', 'none');
    tooltip.selectAll('*').remove();

    const element = d3.select(event.srcElement);
    element.style('outline', undefined);
}

const getScatterPlotXS = (svgElement, minX, maxX) => {
    const svgWidth = svgElement.node().getBoundingClientRect().width;
    return d3.scaleLinear().domain([minX,maxX]).range([0,svgWidth-100]);
}

const getScatterPlotYS = (svgElement, minY,maxY) => {
    const svgHeight = svgElement.node().getBoundingClientRect().height;
    return d3.scaleLinear().domain([minY,maxY]).range([0, svgHeight-100]);
}

const transformScatterPlotData = (data, groupBy, buildExtraToolTipDataFn) => {
    const groupedScores = {};
    data.forEach(item => {
        points = Number(item.points);
        price = Number(item.price);

        if (groupedScores[item[groupBy]]) {
            groupedScores[item[groupBy]].points.push(points);
            groupedScores[item[groupBy]].prices.push(price);
        } else {
            groupedScores[item[groupBy]] = { 
                key: item[groupBy],
                points: [points],
                prices: [price],
                tooltipData: buildExtraToolTipDataFn(item),
            };
        }
    });
    const scatterPlotData = Object.values(groupedScores);
    scatterPlotData.forEach((value) => value.averagePoints = Number(average(value.points)).toFixed(2));
    scatterPlotData.forEach((value) => value.averagePrice = Number(average(value.prices)).toFixed(2));
    scatterPlotData.forEach((value) => value.tooltipData['Average Points'] = `${value.averagePoints}`);
    scatterPlotData.forEach((value) => value.tooltipData['Average Price'] = `$${value.averagePrice}`);
    return scatterPlotData;
}

const drawScatterPlot = (svgElement, title, scatterPlotData, minX, minY, maxX, maxY) => {
    const svgWidth = svgElement.node().getBoundingClientRect().width;
    const svgHeight = svgElement.node().getBoundingClientRect().height;
    const xs = getScatterPlotXS(svgElement, minX, maxX);
    const ys = getScatterPlotYS(svgElement, minY, maxY);

    svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .selectAll()
        .data(scatterPlotData)
        .enter()
        .append('circle')
        .attr('fill', '#0020b0')
        .attr('r', 3.5)
        .attr('cx', (d,i) => xs(d.averagePrice))
        .attr('cy', (d,i) => svgHeight - 100 - ys(d.averagePoints))
        .on('mouseover', (event) => showTooltip(event, () => {
            const element = d3.select(event.srcElement);
            const data = element.datum();
            return Object.entries(data.tooltipData).map(([key, value]) => `<b>${key}</b>: ${value}`).join('<br>');
        }))
        .on('mouseleave', hideTooltip);

   svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .call(d3.axisLeft(d3.scaleLinear().domain([minY,maxY]).range([svgHeight-100, 0])));
      
    svgElement
        .append('g')
        .attr('transform', `translate(50,${svgHeight-50})`)
        .call(d3.axisBottom(d3.scaleLinear().domain([minX, maxX]).range([0,svgWidth-100])));

    svgElement.append('text')
        .attr('x', '50%')
        .attr('y',  14)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .attr('style', 'font-size: 1.17em')
        .text(title);
    
    svgElement.append('text')
        .attr('x', '50%')
        .attr('y', svgHeight - 10)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .text('Average Price (USD)');
        
    
    svgElement.append('g')
        .attr('transform', `translate(12, ${svgHeight / 2})`)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .text('Average Score (0-100)');
}

const drawTrendLine = (svgElement, minX, minY, maxX, maxY, step, trendFunctionFn, trendFunctionLabel, trendR2) => {
    const svgHeight = svgElement.node().getBoundingClientRect().height;
    const xs = getScatterPlotXS(svgElement, minX, maxX);
    const ys = getScatterPlotYS(svgElement, minY, maxY);
    
    let pathData = '';
    let initialMove = true;
    for (let i = minX; i <= maxX; i += step) {
        pathData += `${initialMove ? 'M' : 'L'}${xs(i)} ${svgHeight - 100 - ys(trendFunctionFn(i))} `
        initialMove = false;
    }
    
    svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .append('path')
        .attr('d', pathData.trim())
        .attr('stroke', 'orange')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .on('mouseover', (event) => showTooltip(event, () => {
           return `<b>Trend: </b>${trendFunctionLabel}<br><b>R<sup>2</sup>: </b>${trendR2}`;
        }))
        .on('mouseleave', hideTooltip);
}

const drawAnnotation = (svgElement, minX, minY, maxX, maxY, plotX, plotY, message, dx = 20, dy = 20, note = undefined) => {
    const svgHeight = svgElement.node().getBoundingClientRect().height;
    const xs = getScatterPlotXS(svgElement, minX, maxX);
    const ys = getScatterPlotYS(svgElement, minY, maxY);

    const calloutWithArrow = d3.annotationCustomType(d3.annotationCalloutElbow, {
        connector: { end: "arrow" },
    });

    svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .call(d3.annotation()
            .notePadding(15)
            .type(calloutWithArrow)
            .annotations([{
                note: { label: message },
                x: xs(plotX),
                y: svgHeight - 100 - ys(plotY),
                dx,
                dy,
            }])
        );
}

const drawInitialScene = async () => {
    const container = fetchNarrativeContainer().append('div').attr('style', 'display: flex; align-items: center; justify-content: center; height: 100%;')
    const wrapper = container.append('div');
    wrapper.append('h3').html('Is it really worth splurging on that bottle of wine?');
    wrapper.append('img').attr('src', '/wine.png').attr('height', 150);
    wrapper.append('p').html('By looking at 130 thousand wine reviews submitted to wine magazine we can attempt to answer this question through a series of visualizations. Use the buttons below to navigate through the presentation and hover over items in the chart for more information.');
}

const drawCountryScene = async () => {
    const data = await loadData();
    const scatterPlotData = transformScatterPlotData(
        data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points)),
        'country',
        (item) => ({ 'Country':  item.country }),
    );
    
    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');

    const minX = 1;
    const maxX = Math.max(...scatterPlotData.map(item => item.averagePrice));
    const minY = 78;
    const maxY = 100;
    drawScatterPlot(svgElement, 'Wine Scores grouped by Countries', scatterPlotData, minX, minY, maxX, maxY);

    const trendFunctionFn = (x) => 1.91483 * Math.log(x) + 81.6517;
    const trendFunctionLabel = 'Avg Points = 1.91483 * ln(Avg Price) + 81.6517';
    const trendR2 = '0.0003901';
    drawTrendLine(svgElement, minX, minY, maxX, maxY, (maxX-minX)/500, trendFunctionFn, trendFunctionLabel, trendR2);
    drawAnnotation(svgElement, minX, minY, maxX, maxY, 50, trendFunctionFn(50),
        'Glancing at the average score for countries it appears there is a correlation between score and price.'
    );
}

const drawProvidencesScene = async () => {
    const data = await loadData();
    const scatterPlotData = transformScatterPlotData(
        data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points)),
        'province',
        (item) => ({ 'Country':  item.country, 'Province': item['province'] }),
    );

    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');

    const minX = 1;
    const maxX = Math.max(...scatterPlotData.map(item => item.averagePrice));
    const minY = 78;
    const maxY = 100;
    drawScatterPlot(svgElement, 'Wine Scores grouped by Province', scatterPlotData, minX, minY, maxX, maxY);

    const trendFunctionFn = (x) => 2.00079 * Math.log(x) + 81.1895;
    const trendFunctionLabel = 'Avg Points = 2.00079 * ln(Avg Price) + 81.1895';
    const trendR2 = '0.252179';
    drawTrendLine(svgElement, minX, minY, maxX, maxY, (maxX-minX)/500, trendFunctionFn, trendFunctionLabel, trendR2);
    drawAnnotation(svgElement, minX, minY, maxX, maxY, 100, trendFunctionFn(100),
        'Breaking countries up into providences the correlation becomes more distinct.'
    );
}

const drawRegionsScene = async () => {
    const data = await loadData();
    const scatterPlotData = transformScatterPlotData(
        data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points)),
        'region_1',
        (item) => ({ 'Country':  item.country, 'Province': item['province'], 'Region': item['region_1'] }),
    );

    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');

    const minX = 1;
    const maxX = Math.max(...scatterPlotData.map(item => item.averagePrice));
    const minY = 78;
    const maxY = 100;
    drawScatterPlot(svgElement, 'Wine Scores grouped by Regions', scatterPlotData, minX, minY, maxX, maxY);

    const trendFunctionFn = (x) => 2.8742 * Math.log(x) + 78.3731;
    const trendFunctionLabel = 'Avg Points = 2.8742 * ln(Avg Price) + 78.3731';
    const trendR2 = '0.593806';
    drawTrendLine(svgElement, minX, minY, maxX, maxY, (maxX-minX)/500, trendFunctionFn, trendFunctionLabel, trendR2);
    drawAnnotation(svgElement, minX, minY, maxX, maxY, 850, trendFunctionFn(850),
        'Grouping by regions we can see a logarithmic correlation start to emerge.'
    );
}

const drawRegionsUnder600Scene = async () => {
    const data = await loadData();
    const scatterPlotData = transformScatterPlotData(
        data.filter(item => !!item.price && Number(item.price) > 0 && Number(item.price) <= 600 && !!item.points && Number(item.points)),
        'region_1',
        (item) => ({ 'Country':  item.country, 'Province': item['province'], 'Region': item['region_1'] }),
    );

    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');

    const minX = 1;
    const maxX = Math.max(...scatterPlotData.map(item => item.averagePrice));
    const minY = 78;
    const maxY = 100;
    drawScatterPlot(svgElement, 'Wine Scores grouped by Regions < $600', scatterPlotData, minX, minY, maxX, maxY);

    const trendFunctionFn = (x) => 2.94624 * Math.log(x) + 78.1471;
    const trendFunctionLabel = 'Avg Points = 2.94624 * ln(Avg Price) + 78.1471';
    const trendR2 = '0.538389';
    drawTrendLine(svgElement, minX, minY, maxX, maxY, (maxX-minX)/500, trendFunctionFn, trendFunctionLabel, trendR2);
    drawAnnotation(svgElement, minX, minY, maxX, maxY, 200, trendFunctionFn(200),
        'Removing the outliers you will notice the correlation still exists, however there is a lot of variation at the lower price range.'
    );
}

const drawWineriesUnder600Scene = async () => {
    const data = await loadData();
    const scatterPlotData = transformScatterPlotData(
        data.filter(item => !!item.price && Number(item.price) > 0 && Number(item.price) <= 600 && !!item.points && Number(item.points)),
        'winery',
        (item) => ({ 'Country':  item.country, 'Province': item['province'], 'Region': item['region_1'], 'Winery': item['winery'] }),
    );

    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');

    const minX = 1;
    const maxX = Math.max(...scatterPlotData.map(item => item.averagePrice));
    const minY = 78;
    const maxY = 100;
    const xs = getScatterPlotXS(svgElement, minX, maxX);
    const ys = getScatterPlotYS(svgElement, minY, maxY);

    svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .append('rect')
        .attr('x', xs(0))
        .attr('y', 0)
        .attr('height', ys(maxY))
        .attr('width', xs(80))
        .attr('fill', '#f05959')
        .attr('opacity', '60');
    svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .append('rect')
        .attr('x', xs(80))
        .attr('y', 0)
        .attr('height', ys(maxY))
        .attr('width', xs(140-80))
        .attr('fill', '#ffff5c')
        .attr('opacity', '60');
    svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .append('rect')
        .attr('x', xs(140))
        .attr('y', 0)
        .attr('height', ys(maxY))
        .attr('width', xs(maxX-137))
        .attr('fill', '#33f550')
        .attr('opacity', 60);

    
    drawScatterPlot(svgElement, 'Wine Scores grouped by Wineries < $600', scatterPlotData, minX, minY, maxX, maxY);

    const trendFunctionFn = (x) => 2.80229 * Math.log(x) + 78.6389;
    const trendFunctionLabel = 'Avg Points = 2.80229 * ln(Avg Price) + 78.6389';
    const trendR2 = '0.0003901';
    drawTrendLine(svgElement, minX, minY, maxX, maxY, (maxX-minX)/500, trendFunctionFn, trendFunctionLabel, trendR2);
    drawAnnotation(svgElement, minX, minY, maxX, maxY, 140, 78,
        'More expensive wine is most likely to be of higher quality due to less variance.',
        60,
        -10,
    );
}

const narrativeSteps = [
    drawInitialScene,
    drawCountryScene,
    drawProvidencesScene,
    drawRegionsScene,
    drawRegionsUnder600Scene,
    drawWineriesUnder600Scene,
];

let currentStep = 0;
let isInStepTransition = false;

const applyStep = async (stepNumber) => {
    if (isInStepTransition) return;
    isInStepTransition = true;

    const appHeight = d3.select('body').node().getBoundingClientRect().height;
    fetchAppContainer().style('height', `${appHeight}px`);

    if (stepNumber >= 0 && stepNumber < narrativeSteps.length && narrativeSteps[stepNumber] instanceof Function) {
        fetchNarrativeContainer().selectAll('*').remove();
        await narrativeSteps[stepNumber]();
        currentStep = stepNumber;
        d3.select('.button-previous').attr('disabled', currentStep <= 0 ? true : undefined);
        d3.select('.button-next').attr('disabled', currentStep >= narrativeSteps.length - 1 ? true : undefined);
    }

    isInStepTransition = false;
}

const init = async () => {
    await applyStep(0);
}

const handleResize = async () => {
    await applyStep(currentStep);
}