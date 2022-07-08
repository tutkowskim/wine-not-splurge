const dataPromise = d3.json('/winemag-data-130k-v2.json');

const average = (set) => Array.from(set).reduce((a, b) => (a + b), 0) / set.length;

const fetchNarrativeContainer = () => d3.select('.app-narrative');

const drawInitialQuestion = async () => {
    const container = fetchNarrativeContainer().append('div').attr('style', 'display: flex; align-items: center; justify-content: center; height: 100%;')
    const wrapper = container.append('div');
    wrapper.append('h3').html('Is it really worth splurging on that bottle of wine?')
    wrapper.append('img').attr('src', '/wine.svg').attr('height', 150);
}

const drawBarGraph = async () => {
    const data = await dataPromise;

    const countryScores = {};
    data.forEach(item => {
        points = Number(item.points);
        if (countryScores[item.country]) {
            countryScores[item.country].points.push(points);
        } else {
            countryScores[item.country] = { name: item.country, points: [points] };
        }
    });

    Object.values(countryScores).forEach((value) => value.averagePoints = average(value.points));

    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');
    svgWidth = svgElement.node().getBoundingClientRect().width;
    svgHeight = svgElement.node().getBoundingClientRect().height;
    
    const xs = d3.scaleLinear().domain([0,Object.values(countryScores).length]).range([0,svgWidth]);
    const ys = d3.scaleLinear().domain([0,100]).range([0, svgHeight]);

    svgElement
        .append("g")
        .selectAll()
        .data(Object.values(countryScores).sort((a,b) => (b.averagePoints - a.averagePoints)))
        .enter()
        .append("rect")
        .attr("width", () => xs(1) * .8)
        .attr("height", (d,i) => ys(d.averagePoints))
        .attr("x", (d,i) => xs(i) + .1) // Only difference is x and y are after width and height
        .attr("y", (d,i) => svgHeight - ys(d.averagePoints));
}

const drawScatterPlot = async () => {
    const data = await dataPromise;

    const countryScores = {};
    data.forEach(item => {
        if (!item.price) return;
        points = Number(item.points);
        price = Number(item.price);

        if (countryScores[item.country]) {
            countryScores[item.country].points.push(points);
            countryScores[item.country].prices.push(price);
        } else {
            countryScores[item.country] = { name: item.country, points: [points], prices: [price] };
        }
    });

    Object.values(countryScores).forEach((value) => value.averagePoints = average(value.points));
    Object.values(countryScores).forEach((value) => value.averagePrice = average(value.prices));

    const svgElement = fetchNarrativeContainer().append('svg');
    svgElement.attr('width', '100%').attr('height', '100%');
    svgWidth = svgElement.node().getBoundingClientRect().width;
    svgHeight = svgElement.node().getBoundingClientRect().height;

    const minX = 1;
    const maxX = Math.max(...Object.values(countryScores).map(item => item.averagePrice))+1;
    console.log(maxX)
    
    const minY = 75;
    const maxY = 100;
    
    const xs = d3.scaleLog().domain([minX,maxX]).range([0,svgWidth]);
    const ys = d3.scaleLinear().domain([minY,maxY]).range([0, svgHeight]);

    svgElement
        .append("g")
        .attr("transform", "translate(50,50)")
        .selectAll()
        .data(Object.values(countryScores).sort((a,b) => (b.averagePoints - a.averagePoints)))
        .enter()
        .append("circle")
        .attr("r", 4)
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

const narrativeSteps = [
    drawInitialQuestion,
    drawBarGraph,
    drawScatterPlot,
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