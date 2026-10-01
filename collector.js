// Data collection orchestration.
//
// History: this used to scrape sejm.gov.pl's HTML. The 2023 site redesign made
// the voting pages client-rendered, so scraping can no longer work — the data
// is not in the markup at all. New terms now come from the official Sejm API
// (see sejm-api.js). Terms already in the database are left untouched.

const sejmApi = require('./sejm-api.js');
const mamprawowiedziec = require('./mamprawowiedziec.js');
const nazwazwyczajowa = require('./nazwazwyczajowa.js');

let update = false;

exports.update = function () {
  return update;
};

// Terms to (re)collect from the API. The API currently serves terms 9 and 10.
// Term 10 is the one that was missing; add numbers here as new terms start.
const TERMS = [10];

async function collect() {
  let total = 0;
  for (const kadencja of TERMS) {
    const result = await sejmApi.collectTerm(kadencja);
    total += result.saved;
  }

  // Both of these sources are long dead; each fails fast and is a no-op.
  await mamprawowiedziec.start();
  await nazwazwyczajowa.start();

  console.log(`Ukończono ${new Date()}. Zapisano ${total} nowych głosowań.`);
}

async function start() {
  if (update) {
    console.log('Update już trwa, pomijam.');
    return;
  }
  update = true;
  try {
    await collect();
  } catch (err) {
    console.error('Collector zakończył się błędem:', err);
  } finally {
    update = false;
  }
}

exports.start = start;
