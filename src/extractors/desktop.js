const { ensureItsAbsoluteUrl } = require('./ensure_absolute_url');

exports.extractOrganicResults = ($) => {
    const searchResults = [];

    $('.g .rc').each((index, el) => {
        // HOTFIX: Google is A/B testing a new dropdown, which causes invalid results.
        // For now, just remove it.
        $(el).find('div.action-menu').remove();

        const siteLinks = [];
        $(el).find('ul li').each((i, siteLinkEl) => {
            siteLinks.push({
                status: 200,
                result: {
                    title: $(siteLinkEl).find('h3').text(),
                    url: $(siteLinkEl).find('h3 a').attr('href'),
                    description: $(siteLinkEl).find('div').text()
                }
            });
        });

        searchResults.push({
            status: 200,
            result: {
                title: $(el).find('h3').text(),
                url: $(el).find('.r a').attr('href'),
                displayedUrl: $(el).find('cite').text(),
                description: $(el).find('.s .st').text(),
                siteLinks
            }
        });
    });

    return searchResults;
};

exports.extractPaidResults = ($) => {
    const ads = [];

    $('.ads-ad').each((index, el) => {
        const siteLinks = [];
        $(el).find('ul li').each((i, siteLinkEl) => {
            const $linkEl = $(siteLinkEl).find('a');

            siteLinks.push({
                title: $linkEl.text(),
                url: $linkEl.attr('href'),
                description: $(siteLinkEl).find('div').text() || null,
            });
        });

        ads.push({
            title: $(el).find('h3').text(),
            url: $(el).find('h3 a').attr('href'),
            displayedUrl: $(el).find('cite').text(),
            description: $(el).find('.ellip,.ads-creative').text(),
            siteLinks,
        });
    });

    return ads;
};

exports.extractPaidProducts = ($) => {
    const products = [];

    $('.commercial-unit-desktop-rhs .pla-unit').each((i, el) => {
        const headingEl = $(el).find('[role="heading"]');
        const siblingEls = headingEl.nextAll();
        const displayedUrlEl = siblingEls.last();
        const prices = [];

        siblingEls.each((index, siblingEl) => {
            if (siblingEl !== displayedUrlEl[0]) prices.push($(siblingEl).text());
        });

        products.push({
            title: headingEl.text(),
            url: headingEl.find('a').attr('href'),
            displayedUrl: displayedUrlEl.find('span:first').text(),
            prices,
        });
    });

    return products;
};

exports.extractTotalResults = ($) => {
    const wholeString = $('#resultStats').text();

    // Get number as string from text "Přibližný počet výsledků: 6 730 000 000 (0,30 s)"
    const numberString = wholeString.split('(').shift().replace(/[^\d]/g, '');

    return Number(numberString);
};

exports.extractRelatedQueries = ($, hostname) => {
    const related = [];

    $('#brs a').each((index, el) => {
        related.push({
            title: $(el).text(),
            url: ensureItsAbsoluteUrl($(el).attr('href'), hostname),
        });
    });

    return related;
};
