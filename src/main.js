const Apify = require('apify');
const url = require('url');
const {
    REQUIRED_PROXY_GROUP, GOOGLE_DEFAULT_RESULTS_PER_PAGE, DEFAULT_GOOGLE_SEARCH_DOMAIN_COUNTRY_CODE,
    GOOGLE_SEARCH_DOMAIN_TO_COUNTRY_CODE, GOOGLE_SEARCH_URL_REGEX } = require('./consts');
const extractorsDesktop = require('./extractors/desktop');
const extractorsMobile = require('./extractors/mobile');
const {
    getInitialRequests, executeCustomDataFunction, createSerpRequest,
    logAsciiArt, createDebugInfo, ensureAccessToSerpProxy,
} = require('./tools');
const https = require('https');

const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();

    const { maxConcurrency, maxPagesPerQuery, customDataFunction, mobileResults, saveHtml } = input;

    // Check that user have access to SERP proxy.
    await ensureAccessToSerpProxy();
    logAsciiArt();

    // Create initial request list and queue.
    const initialRequests = getInitialRequests(input);
    if (!initialRequests.length) throw new Error('The input must contain at least one search query or URL.');
    const requestList = await Apify.openRequestList('initial-requests', initialRequests);
    const requestQueue = await Apify.openRequestQueue();
    const dataset = await Apify.openDataset();
    const extractors = mobileResults ? extractorsMobile : extractorsDesktop;
    var hasNextPage = false;

    // Create crawler.
    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        maxConcurrency,
        prepareRequestFunction: ({ request }) => {
            const parsedUrl = url.parse(request.url, true);
            request.userData.startedAt = new Date();
            log.info(`Querying "${parsedUrl.query.q}" page ${request.userData.page} ...`);
            return request;
        },
        useApifyProxy: true,
        apifyProxyGroups: [REQUIRED_PROXY_GROUP],
        handlePageTimeoutSecs: 60,
        requestTimeoutSecs: 180,
        handlePageFunction: async ({ request, response, body, $ }) => {
            request.userData.finishedAt = new Date();

            const nonzeroPage = request.userData.page + 1; // Display same page numbers as Google, i.e. 1, 2, 3..
            const parsedUrl = url.parse(request.url, true);

            // We know the URL matches (otherwise we have a bug here)
            const matches = GOOGLE_SEARCH_URL_REGEX.exec(request.url);
            const domain = matches[3].toLowerCase();

            // Compose the dataset item.
            const data = extractors.extractOrganicResults($);

            if (saveHtml) data.html = body;

            // Enqueue new page.
            const nextPageUrl = $('#pnnext').attr('href');
            if (nextPageUrl) {
                hasNextPage = true;
                if (request.userData.page < maxPagesPerQuery - 1 && maxPagesPerQuery) {
                    await requestQueue.addRequest(createSerpRequest(`http://${parsedUrl.host}${nextPageUrl}`, request.userData.page + 1));
                } else {
                    log.info(`Not enqueueing next page for query "${parsedUrl.query.q}" because the "maxPagesPerQuery" limit has been reached.`);
                }
            } else {
                log.info(`This is the last page for query "${parsedUrl.query.q}". Next page button has not been found.`);
            }

            await dataset.pushData(data);

            // Log some nice info for user.
            log.info(`Finished query "${parsedUrl.query.q}" page ${nonzeroPage}`);
        },
        handleFailedRequestFunction: async ({ request }) => {
            await Apify.pushData({
                '#debug': createDebugInfo(request),
                '#error': true,
            });
        },
    });

    // Run the crawler.
    await crawler.run();

    const { datasetId } = dataset;
    if (datasetId) {
        log.info(`Scraping is finished, see you next time.

Full results in JSON format:
https://api.apify.com/v2/datasets/${datasetId}/items?format=json

Simplified organic results in JSON format:
https://api.apify.com/v2/datasets/${datasetId}/items?format=json&fields=searchQuery,organicResults&unwind=organicResults`);
    } else {
        log.info('Scraping is finished, see you next time.');
    }

    // Push the result to API Gateway which will call the Lambda and put the results in S3.
    log.info('Pushing results to the webhook.');

    request.post(
        input.webhook.url,
        { json: dataset },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
            if(error){
                console.log(error);
            }
        }
    );
});
