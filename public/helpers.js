const init = async () => {
    const testDiv = document.getElementById('test-div');
    testDiv.insertAdjacentText('beforeend', 'loading');
    
    const data = await d3.csv('/winemag-data-130k-v2.csv');
    testDiv.insertAdjacentText('beforeend', JSON.stringify(data));
}
