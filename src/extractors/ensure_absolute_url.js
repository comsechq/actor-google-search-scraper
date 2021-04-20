exports.ensureItsAbsoluteUrl = (maybeUrl, hostname) => {
    return hostname && maybeUrl && maybeUrl.startsWith('/')
        ? `https://${hostname}${maybeUrl}`
        : maybeUrl;
};
