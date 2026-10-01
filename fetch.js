const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/**
 * Fetch a URL and return its body.
 * Never throws: returns null on any network/HTTP error so callers can degrade.
 *
 * @param {string} url
 * @param {{json?: boolean, timeout?: number, headers?: object}} [opts]
 * @returns {Promise<string|object|null>}
 */
async function getBodyP(url, opts = {}) {
  const { json = false, timeout = 30000, headers = {} } = opts;
  console.log(`Pobieranie ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'pl,en;q=0.8',
        ...headers
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout)
    });
    if (!response.ok) {
      console.warn(`  -> HTTP ${response.status} dla ${url}, pomijam`);
      return null;
    }
    return json ? await response.json() : await response.text();
  } catch (err) {
    console.warn(`  -> błąd pobierania ${url}: ${err.message}`);
    return null;
  }
}

module.exports = { getBodyP, UA };