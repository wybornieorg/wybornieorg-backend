console.log('Uruchomiono mamprawowiedziec.js');

const cheerio = require('cheerio');
const request = require('request');
const iconv = require('iconv-lite');

const db = require('./database.js');

db.MPW.drop()
module.exports = { start }

const base = 'http://serwis.mamprawowiedziec.pl';

async function start () {
  let arts = []

  for (var i = 0; i < 34; i++) {
    let page = await getBodyP(`${base}/archiwum.php?p=${i}`)
    let $ = cheerio.load(page);
    $('a').each((index, element) => {
      let tmp = $(element)
      if (tmp.text().search('Nowe prawa') > -1) {
        console.log(`${tmp.text()} ${tmp.attr('href')}`)
        arts.push({title: tmp.text(), href: base + tmp.attr('href')})
      }
    })
  }
  console.log(`${arts.length} artykułów`);

  let projects = []
  for (variable of arts) {
    let art = await getBodyP(`${base}/${variable.href}`)
    let $ = cheerio.load(art);

    let tmp = { desc: '', markup: '', href: ''}
    $('#text').children().each((index, element) => {
      if ($(element).find('a').text().search('cieżka') > -1 || $(element).text().search('#') > -1) {

      } else if ($(element).find('a').text().search('łosowani') > -1) {
        tmp.href = $(element).find('a').last().attr('href')
        tmp.source = variable.href
        // tmp.voting = $(element).next().find('a').attr('href')
        projects.push(tmp)
        tmp = { desc: '', markup: '', href: ''}
      } else {
        tmp.desc += $(element).text()
        tmp.markup += $(element).html()
      }
    })
  }
  for (variable of projects) {
    try {
      variable.numbers = parseVotingNumbers(variable.href)
    } catch (e) {
      variable.numbers = {source: variable.source, href: variable.href, e: 'Link zepsuty'}
      // throw e
    }
    console.log(variable.numbers)

    let voting = await db.Voting.find({
      where: {
        numbers: variable.numbers
      }
    })
    console.log();
    try {
      variable.votingId = voting.id
    } catch (e) {

    }

    await db.MPW.findOrCreate({
      where: {
        numbers: variable.numbers
      },
      defaults: variable
    }).then((result) => {
      console.log(`Zapisano w bazie danych MamPrawoWiedziec: ${JSON.stringify(result[0].numbers)}`);
    });
  }


}

function parseVotingNumbers(href) {
  let [kadencja, posiedzenie, glosowanie] = href.match(/[0-9]+\,[0-9]+\,[0-9]+/)[0].split(',').map(a => parseInt(a))
  return {kadencja, posiedzenie, glosowanie}
}


function getBodyP(url) {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      encoding: null
    }, (err, response, body) => {
      if (err) reject(err);
      else {
        let test = body.toString().search('ISO-8859-2');

        if (test !== -1) {
          resolve(iconv.decode(body, 'ISO-8859-2'));
        } else {
          resolve (iconv.decode(body, 'UTF-8'));
        }
      }
    });
  });
}
