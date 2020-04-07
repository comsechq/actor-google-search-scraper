const desktop = require('../src/extractors/desktop');
const { loadPair, dataSnapshotter } = require('./utils');

const snapshot = dataSnapshotter();

describe('desktop extractor', () => {
    /* eslint-disable no-loop-func */

    afterAll(async () => {
        await snapshot.save();
    });

    for (const type of [
        'desktop',
    ]) {
        describe(`${type}`, () => {
            test('extractOrganicResults', async () => {
                const { $, json } = await loadPair(type);
                const results = desktop.extractOrganicResults($, 'www.google.com');

                snapshot.set(type, 'organicResults', results);

                expect(results).toEqual(json.organicResults);
            });

            test('extractPaidProducts', async () => {
                const { $, json } = await loadPair(type);
                const results = desktop.extractPaidProducts($, 'www.google.com');

                snapshot.set(type, 'paidProducts', results);

                expect(results).toEqual(json.paidProducts);
            });

            test('extractPaidResults', async () => {
                const { $, json } = await loadPair(type);
                const results = desktop.extractPaidResults($, 'www.google.com');

                snapshot.set(type, 'paidResults', results);

                expect(results).toEqual(json.paidResults);
            });

            test('extractTotalResults', async () => {
                const { $, json } = await loadPair(type);
                const results = desktop.extractTotalResults($, 'www.google.com');

                snapshot.set(type, 'resultsTotal', results);

                expect(results).toEqual(json.resultsTotal);
            });

            test('extractRelatedQueries', async () => {
                const { $, json } = await loadPair(type);
                const results = desktop.extractRelatedQueries($, 'www.google.com');

                snapshot.set(type, 'relatedQueries', results);

                expect(results).toEqual(json.relatedQueries);
            });
        });
    }
});
