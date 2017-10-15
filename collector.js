// TODO: jeśli uchwalony lub odrzucony - pobierz wyniki decydujacego glosowania, jesli przed 3 czytaniem sprawdzaj codziennie o 16 czy byla zmiana statusu

console.log('Uruchomiono collector.js');

const cheerio = require('cheerio');
const request = require('request');
const co = require('co');

const db = require('./database.js');

db.Project.sync({
  // force: true
})


const base = 'http://www.sejm.gov.pl';

// module.exports = {
//   test: test
// }


co(function*() {
  let body = yield getBodyP(base + '/Sejm8.nsf/page.xsp/przeglad_projust');
  let projects = getProjects(body);

  // console.log(projects);

  for (project of projects) {
    // TODO: sprawić, żeby program sprawdzał prawidłowo status projektu
    przebiegBody = yield getBodyP(project.przebiegLink);
    if (przebiegBody.search(project.status) === -1) {

      project.status1 = 'nieznany';
      continue;
    }

    test = yield db.Project.findOne({
      where: {
        drukNr: project.drukNr
      }
    });
    // console.log(test);
    if (test != null) {continue;}


    // console.log(project.status);
    voteData: if (project.status != 'przed III czytaniem') {
      project.drukPdfLink = scrapeDrukPdfLink(yield getBodyP(project.trescLink))



      project.votingLink = getDecidingVotingLink(przebiegBody);
      // console.log('\n');

      let votingBody = yield getBodyP(project.votingLink);

      project.votingData = getVotingData(votingBody);
      project.groupLinks = getGroupLinks(votingBody);

      project.deputies = [];
      for (variable of project.groupLinks) {
        // console.log(variable.source);
        deputies = getDeputies(yield getBodyP(variable.source), variable.group);
        project.deputies = project.deputies.concat(deputies);
      }

      project.frekwencja = 1 - project.deputies.filter((value) => { return value.vote === 'Nieobecny' }).length / project.deputies.length

      console.log(project.frekwencja);
      // console.log(project.deputies);

      // console.log(project);

      db.Project.findOrCreate({
        where: {
          drukNr: project.drukNr
        },
        defaults: project
      });

      console.log();
    }

  }
  console.log('klotz');
})


class Project {
  constructor({
    tresc,
    status,
    tytul,
    tekst,
    przebieg,
    drukNr,
    votings
  }) {
    this.tresc = tresc;
    this.status = status;
    this.tytul = tytul;
    this.tekst = tekst;
    this.przebieg = przebieg;
    this.drukNr = drukNr;
    this.votings = votings;
  }
}

function getBodyP(url) {
  return new Promise((resolve, reject) => {
    request(url, (err, response, body) => {
      if (err) reject(err);
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
    project.trescLink = base + element.eq(1).find('a').attr('href');


    if (element.eq(1).find('font').attr('color') == 'green') {
      project.status = 'przed III czytaniem';
      project.tytul = fixLetters(element.eq(1).find('font').text());
    } else if (element.eq(1).find('font').attr('color') == '#A0A0A0') {
      project.tytul = element.eq(1).find('font').text();
      project.status = 'odrzucony';
    } else {
      project.status = 'uchwalono';
      project.tytul = element.find('div').eq(1).text();
    }
    project.tytul = project.tytul.replace(/\n/g, '');

    //WEJDŹ W PRZEBIEG I ZCZYTAJ DANE OSTATNIEGO GŁOSOWANIA, CZYLI DECYDUJĄCEGO a.vote ostatniu

    project.isapLink = element.eq(2).find('a').attr('href');
    project.przebiegLink = base + element.eq(3).find('a').attr('href');
    project.drukNr = parseInt(element.eq(3).find('a').text().replace(/\n/g, ''));

    // project.komisje = element.eq(4).html();
    projects.push(project);

  });
  return projects;
}

function scrapeDrukPdfLink(body) {
  let $ = cheerio.load(body);

  return $('a.pdf').attr('href');
}

function getDecidingVotingLink(body) {
  let $ = cheerio.load(body);

  let lastVotingLink = $('a.vote').last().attr('href');

  return base + '/Sejm8.nsf/' + lastVotingLink;
}

function getVotingData(body) {
  let $ = cheerio.load(body);
  let voting = {};
  let title = $('#contentBody').find('p').html();

  voting.votingTitle = fixLetters(title);
  // console.log(voting.title);
  voting.votingDate = parseDate($('#title_content small').html());

  return voting;
}

function getGroupLinks(body) {
  let $ = cheerio.load(body);

  var table = $('tbody');
  let links = [];


  table.children().each((i, elem) => {
    //console.log(`rozpoczęcie ${i} iteracji pętli each na głosowaniu ${id}`);
    let currentGroup = $(elem).find('strong').html();
    let link = base + '/Sejm8.nsf/' + $(elem).find('a').attr('href');
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
  // let date = string.slice(5, 15);
  // let time = string.slice(27, 50);
  // console.log(date);
  // console.log(time);


  // return new Date(date.slice(6, 10), date.slice(3, 5), date.slice(0, 2), time.slice(0, 2), time.slice(3, 5), time.slice(6, 8));
  return string;
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
