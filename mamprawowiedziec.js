const cheerio = require('cheerio');

const db = require('./database.js');
const { getBodyP } = require('./fetch.js');

module.exports = { start };

const base = 'http://serwis.mamprawowiedziec.pl';

async function start() {
  try {
    await run();
  } catch (err) {
    console.warn(`mamprawowiedziec: pomijam (${err.message})`);
  }
}

async function run() {
  let arts = [];

  for (let i = 0; i < 34; i++) {
    const page = await getBodyP(`${base}/archiwum.php?p=${i}`);
    if (page === null) {
      // Source is dead / unreachable — no point paging through all 34.
      if (i === 0) {
        console.warn('mamprawowiedziec: źródło nieosiągalne, pomijam.');
        return;
      }
      continue;
    }
    const $ = cheerio.load(page);
    $('a').each((index, element) => {
      const tmp = $(element);
      if (tmp.text().search('Nowe prawa') > -1) {
        arts.push({ title: tmp.text(), href: base + tmp.attr('href') });
      }
    });
  }
  console.log(`${arts.length} artykułów`);

  let projects = [];
  for (const variable of arts) {
    const art = await getBodyP(variable.href);
    if (art === null) {
      continue;
    }
    const $ = cheerio.load(art);
    const author = $('.author a').map((i, el) => {
      return $(el).text();
    }).get();

    let tmp = { desc: '', markup: '', href: '' };
    $('#text').children().each((index, element) => {
      if ($(element).find('a').text().search('cieżka') > -1 || $(element).text().search('#') > -1) {
        // skip
      } else if ($(element).find('a').text().search('łosowani') > -1) {
        tmp.href = $(element).find('a').last().attr('href');
        tmp.source = variable.href;
        tmp.author = author;
        projects.push(tmp);
        tmp = { desc: '', markup: '', href: '' };
      } else {
        tmp.desc += $(element).text();
        tmp.markup += $(element).html();
      }
    });
  }

  for (const variable of projects) {
    try {
      variable.numbers = parseVotingNumbers(variable.href);
    } catch (e) {
      variable.numbers = { source: variable.source, href: variable.href, e: 'Link zepsuty' };
    }

    const voting = await db.Voting.findOne({
      where: { numbers: variable.numbers }
    }).catch(() => null);
    if (voting) {
      variable.votingId = voting.id;
    }

    await db.MPW.findOrCreate({
      where: { numbers: variable.numbers },
      defaults: variable
    }).then((result) => {
      console.log(`Zapisano w bazie danych MamPrawoWiedziec: ${JSON.stringify(result[0].numbers)}`);
    }).catch((e) => console.error(e));
  }
}

function parseVotingNumbers(href) {
  const [kadencja, posiedzenie, glosowanie] =
    href.match(/[0-9]+,[0-9]+,[0-9]+/)[0].split(',').map((a) => parseInt(a));
  return { kadencja, posiedzenie, glosowanie };
}