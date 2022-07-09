const dataPromise = d3.json('/winemag-data-130k-v2.json');

const average = (set) => Array.from(set).reduce((a, b) => (a + b), 0) / set.length;

const fetchNarrativeContainer = () => d3.select('.app-narrative');
const fetchTooltipContainer = () => d3.select('.app-narrative-tooltip');

const drawInitialQuestion = async () => {
    const container = fetchNarrativeContainer().append('div').attr('style', 'display: flex; align-items: center; justify-content: center; height: 100%;')
    const wrapper = container.append('div');
    wrapper.append('h3').html('Is it really worth splurging on that bottle of wine?')
    wrapper.append('img').attr('src', '/wine.svg').attr('height', 150);
}

const drawScatterPlot = async (title, data, groupByKeyName) => {
    const groupedScores = {};
    data.forEach(item => {
        points = Number(item.points);
        price = Number(item.price);

        if (groupedScores[item[groupByKeyName]]) {
            groupedScores[item[groupByKeyName]].points.push(points);
            groupedScores[item[groupByKeyName]].prices.push(price);
        } else {
            groupedScores[item[groupByKeyName]] = { key: item[groupByKeyName], points: [points], prices: [price] };
        }
    });

    Object.values(groupedScores).forEach((value) => value.averagePoints = average(value.points));
    Object.values(groupedScores).forEach((value) => value.averagePrice = average(value.prices));

    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');
    svgWidth = svgElement.node().getBoundingClientRect().width;
    svgHeight = svgElement.node().getBoundingClientRect().height;

    const minX = 1;
    const maxX = Math.max(...Object.values(groupedScores).map(item => item.averagePrice))+1;
    
    const minY = 70;
    const maxY = 100;
    
    const xs = d3.scaleLog().domain([minX,maxX]).range([0,svgWidth-100]);
    const ys = d3.scaleLinear().domain([minY,maxY]).range([0, svgHeight-100]);

    svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .selectAll()
        .data(Object.values(groupedScores))
        .enter()
        .append('circle')
        .attr('fill', '#0020b0')
        .attr('r', 3)
        .attr('cx', (d,i) => xs(d.averagePrice))
        .attr('cy', (d,i) => svgHeight - ys(d.averagePoints))
        .on('mouseover', (event) => {
            const element = d3.select(event.srcElement);
            element.style('outline', '3px solid black');
            data = element.datum();
        
            const tooltip = fetchTooltipContainer();
            tooltip.html(Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('<br>'));
            tooltip.style('top', `${event.clientY + 10}px`);
            tooltip.style('left', `${event.clientX + 10}px`);
            tooltip.style('display', 'inline');
        })
        .on('mouseleave', (event) => {
            const tooltip = fetchTooltipContainer();
            tooltip.style('display', 'none');
            tooltip.selectAll('*').remove();
        
            const element = d3.select(event.srcElement);
            element.style('outline', undefined);
        });

   svgElement
        .append('g')
        .attr('transform', 'translate(50,50)')
        .call(d3.axisLeft(d3.scaleLinear().domain([minY,maxY]).range([svgHeight-100, 0])));
      
    svgElement
        .append('g')
        .attr('transform', `translate(50,${svgHeight-50})`)
        .call(d3.axisBottom(d3.scaleLog().domain([minX, maxX]).range([0,svgWidth-100])));

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
        .text('Average Price (dollars)');
        
    
    svgElement.append('g')
        .attr('transform', `translate(12, ${svgHeight / 2})`)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .text('Average Score (0-100)');
}

const drawVarietyScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot('Wine Scores grouped by Variety', filteredData, 'variety');
}

const drawCountryScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot('Wine Scores grouped by Countries', filteredData, 'country');
}

const drawProvidencesScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot('Wine Scores grouped by Providences', filteredData, 'province');
}

const drawRegionsScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot('Wine Scores grouped by Regions', filteredData, 'region_1');
}

const drawWineriesScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot('Wine Scores grouped by Wineries', filteredData, 'winery');
}

const narrativeSteps = [
    drawInitialQuestion,
    drawVarietyScatterPlot,
    drawCountryScatterPlot,
    drawProvidencesScatterPlot,
    drawRegionsScatterPlot,
    drawWineriesScatterPlot,
];

let currentStep = 0;

const applyStep = async (stepNumber) => {
    if (stepNumber >= 0 && stepNumber < narrativeSteps.length && narrativeSteps[stepNumber] instanceof Function) {
        fetchNarrativeContainer().selectAll('*').remove();
        await narrativeSteps[stepNumber]();
        currentStep = stepNumber;
        d3.select('.button-previous').attr('disabled', currentStep <= 0 ? true : undefined);
        d3.select('.button-next').attr('disabled', currentStep >= narrativeSteps.length - 1 ? true : undefined);
    }
}

const init = async () => {
    await applyStep(0);
}

const handleResize = async () => {
    await applyStep(currentStep);
}