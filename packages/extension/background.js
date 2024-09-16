import { Storage } from "@plasmohq/storage"
const storage = new Storage()

chrome.tabs.onUpdated.addListener(async function () {
    const lastFetched = await getLastFetched();
    if (!lastFetched) {
        console.log("No Last Fetched")
        const currentTimeStamp = Date.now();
    }
    if (lastFetched) {
        chrome.history.search({ startTime: lastFetched, maxResults: 1000, text: '' }, function (data) {
            data = filterData(data);
            fetch('http://localhost:3333/history', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

        })
        await setLastFetched(Date.now());
    }
    // chrome.history.search({ text: '', maxResults: 1000 }, function (data) {
    //     data = data.filter((item, index) =>
    //         !(item.url.indexOf('google') !== -1 ||
    //             data.findIndex(t => t.url === item.url) !== index)
    //     );

    //     fetch('http://localhost:3000/history', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(data),
    //     }).then(response => response.json())
    //         .then(result => console.log('History sent to server:', result))
    //         .catch(error => console.error('Error sending history:', error));
    // });
});

const getLastFetched = async () => {
    const lastFetched = await storage.get('lastFetched');
    return lastFetched;
}
const setLastFetched = async (timestamp) => {
    await storage.set('lastFetched', timestamp);
}
const filterData = (data) => {
    return data.filter((item, index) =>
        !(item.url.indexOf('google') !== -1 ||
            data.findIndex(t => t.url === item.url) !== index)
    );
}