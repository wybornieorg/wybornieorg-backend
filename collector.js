console.log('Uruchomiono collector.js');

const cheerio = require('cheerio');
const request = require('request');
// const database = require('./database');


const base = 'http://www.sejm.gov.pl/Sejm8.nsf/page.xsp/przeglad_projust';

module.exports.test = test();

async function test() {
  let body = await getBodyP(base);
  let projects = await getProjects(body);
  return projects;

}


function getLastEntryNr() {
  return new Promise((resolve, reject) => {
    console.log('getLastEntryNr');
    database.Voting.find({}, {
      'nr': 1
    }).sort({
      'nr.Glosowania': 1,
      'nr.Posiedzenia': 1,
      'nr.Kadencji': 1,
    }).limit().exec((err, lastnr) => {
      if (lastnr.length == 0) {
        nr = {
          Kadencji: 3,
          Posiedzenia: 1,
          Glosowania: 1,
        };
      } else {
        nr = lastnr[0].nr;
        database.Voting.findOne({
          'nr.Kadencji': nr.Kadencji,
          'nr.Posiedzenia': nr.Posiedzenia,
          'nr.Glosowania': nr.Glosowania
        }).remove().exec();
      }
      resolve(nr);
    });

  });
}

function incrementCounter() {
  if ('p' == iterator) {
    nr.Posiedzenia++;
    nr.Glosowania = 1;
  } else if ('k' == iterator) {
    nr.Kadencji++;
    nr.Posiedzenia = 1;
    nr.Glosowania = 1;
  } else {
    nr.Glosowania++;
  }
}

function getBodyP(url) {
  return new Promise((resolve, reject) => {
    request(url, (err, response, body) => {
      if (err) reject(error);
      else resolve(body);
    });

  });
}

function getProjects(body) {
  let projects = [];
  let $ = cheerio.load(body);
  $('tbody').find('tr').each((it, ele) => {
    let element = $(ele).find('td');
        let project = {};
        project.tytul = fixLetters(element.eq(1).find('div').eq(1).html().replace(/\n/g,''));
        // project.status = cheerio.load(project.tytul).find('font').attr('color');
        project.cos = element.eq(2).find('a').attr('href');
        project.drukLink = element.eq(3).find('a').attr('href');
        project.drukNr = parseInt(element.eq(3).find('a').text().replace(/\n/g,''));
        project.komisje = fixLetters(element.eq(4).html());

        projects.push(project);
  });
}

function getVotingData(body) {
  let $ = cheerio.load(body);
  let voting = {};
  let title = $('#contentBody').find('p').html();
  if (title === null) {
    if (nr.Glosowania == 1) iterator = 'k';
    else iterator = 'p';
    console.log('pusta strona!!!');
    return;
  }
  voting.title = fixLetters(title);
  console.log(voting.title);
  voting.date = parseDate($('#title_content small').html());

  return voting;
}

function getGroupLinks(body) {
  let $ = cheerio.load(body);

  var table = $('tbody');
  let links = [];


  table.children().each((i, elem) => {
    //console.log(`rozpoczęcie ${i} iteracji pętli each na głosowaniu ${id}`);
    let currentGroup = $(elem).find('strong').html();
    let link = base + $(elem).find('a').attr('href');
    links.push({
      'group': currentGroup,
      'source': link
    });
  });

  return links;

}

function getDeputies(body, group) {
  //return new Promise((resolve,reject)=>{
  let deputies = [];

  let $ = cheerio.load(body);


  $('tbody').find('tr').each((it, ele) => {
    let element = $(ele).find('td');
    for (var i = 1; i < 5; i += 3) {
      if (element.eq(i).html() != null) {
        let deputy = {};
        deputy.name = fixLetters(element.eq(i).html());
        deputy.vote = fixLetters(element.eq(i + 1).html());
        deputy.group = group;
        deputies.push(deputy);
      }
    }
  });
  //resolve(deputies);
  //});
  return deputies;
}


function parseDate(string) {
  let date = string.slice(5, 15);
  let time = string.slice(27, 50);

  return new Date(date.slice(6, 10), date.slice(3, 5), date.slice(0, 2), time.slice(0, 2), time.slice(3, 5), time.slice(6, 8));
}

function fixLetters(string) {
  let letters = {
    "Ą": "&#x104;",
    "ą": "&#x105;",

    "Ę": "&#x118;",
    "ę": "&#x119;",

    "Ó": "&Oacute;",
    "Ó": "&#xD3;",
    "ó": "&oacute;",
    "ó": "&#xF3;",

    "Ć": "&#x106;",
    "ć": "&#x107;",

    "Ł": "&#x141;",
    "ł": "&#x142;",

    "Ń": "&#x143;",
    "ń": "&#x144;",

    "Ś": "&#x15A;",
    "ś": "&#x15B;",

    "Ź": "&#x179;",
    "ź": "&#x17A;",

    "Ż": "&#x17B;",
    "ż": "&#x17C;",
  };
  for (var variable in letters) {
    // console.log(`Zmieniam ${letters[variable]} na ${variable}`);
    string = string.replace(new RegExp(letters[variable], 'g'), variable);
  }
  return string;
}
