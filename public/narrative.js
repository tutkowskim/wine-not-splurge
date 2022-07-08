const dataPromise = d3.json('/winemag-data-130k-v2.json');

const average = (set) => Array.from(set).reduce((a, b) => (a + b), 0) / set.length;

const fetchNarrativeContainer = () => d3.select('.app-narrative');

const drawInitialQuestion = async () => {
    const container = fetchNarrativeContainer().append('div').attr('style', 'display: flex; align-items: center; justify-content: center; height: 100%;')
    const wrapper = container.append('div');
    wrapper.append('h3').html('Is it really worth splurging on that bottle of wine?')
    wrapper.append('img').attr('src', '/wine.svg').attr('height', 150);
}

const drawScatterPlot = async (data, groupByKeyName) => {
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
    
    const minY = 75;
    const maxY = 100;
    
    const xs = d3.scaleLog().domain([minX,maxX]).range([0,svgWidth]);
    const ys = d3.scaleLinear().domain([minY,maxY]).range([0, svgHeight]);

    svgElement
        .append("g")
        .attr("transform", "translate(50,50)")
        .selectAll()
        .data(Object.values(groupedScores))
        .enter()
        .append("circle")
        .attr("fill", '#0020b0')
        .attr("r", 2)
        .attr("cx", (d,i) => xs(d.averagePrice))
        .attr("cy", (d,i) => svgHeight - ys(d.averagePoints));

        d3.select('svg')
        .append("g")
        .attr("transform", "translate(50,50)")
        .call(d3.axisLeft(d3.scaleLinear().domain([minY,maxY]).range([svgHeight-50, 0])));
      
      d3.select('svg')
        .append("g")
        .attr("transform", `translate(50,${svgHeight-50})`)
        .call(d3.axisBottom(d3.scaleLog().domain([minX, maxX]).range([0,svgWidth+50])));
      
        console.log(maxY);
}

const drawVarietyScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot(filteredData, 'variety');
}

const drawCountryScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot(filteredData, 'country');
}

const drawProvidencesScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot(filteredData, 'province');
}

const drawRegionsScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot(filteredData, 'region_1');
}

const drawWineriesScatterPlot = async () => {
    const data = await dataPromise;
    filteredData = data.filter(item => !!item.price && Number(item.price) > 0 && !!item.points && Number(item.points));
    await drawScatterPlot(filteredData, 'winery');
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
        d3.select('.button-previous').attr("disabled", currentStep <= 0 ? true : undefined);
        d3.select('.button-next').attr("disabled", currentStep >= narrativeSteps.length - 1 ? true : undefined);
    }
}

const init = async () => {
    await applyStep(0);
}

const handleResize = async () => {
    await applyStep(currentStep);
}