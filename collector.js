// TODO: jeśli uchwalony lub odrzucony - pobierz wyniki decydujacego glosowania, jesli przed 3 czytaniem sprawdzaj codziennie o 16 czy byla zmiana statusu

console.log('Uruchomiono collector.js');

const cheerio = require('cheerio');
const request = require('request');
const co = require('co');
const iconv = require('iconv-lite');

const db = require('./database.js');

db.Project.sync({
  // force - czyść tabelę / dev mode
  force: true
})


const base = 'http://www.sejm.gov.pl';

const kadencjeLinki = [{
    nrKadencji: 8,
    link: 'http://www.sejm.gov.pl/Sejm8.nsf/page.xsp/przeglad_projust'
  },
  {
    nrKadencji: 7,
    link: 'http://www.sejm.gov.pl/Sejm7.nsf/page.xsp/przeglad_projust'
  },
  {
    nrKadencji: 6,
    link: 'http://orka.sejm.gov.pl/projustall6.htm'
  },
  {
    nrKadencji: 5,
    link: 'http://www.sejm.gov.pl/archiwum/prace/kadencja5/projustall5.htm'
  },
  {
    nrKadencji: 4,
    link: 'http://www.sejm.gov.pl/archiwum/prace/kadencja4/projustall4.htm'
  },
  {
    nrKadencji: 3,
    link: 'http://www.sejm.gov.pl/archiwum/prace/kadencja3/projust_all3.htm'
  },
];
// module.exports = {
//   test: test
// }
// var globalDeputies = new Set()

co(function*() {
  let projects = [];

  for (kadencja of kadencjeLinki) {
    projects = projects.concat(getProjects(yield getBodyP(kadencja.link), kadencja.nrKadencji));
  }
  console.log(projects);

  for (project of projects.reverse()) {
    test = yield db.Project.findOne({
      where: {
        drukNr: project.drukNr
      }
    });
    // console.log(test);
    if (test != null) {
      continue;
    }


    // if (przebiegBody.search(project.status) === -1) {
    //
    //   project.status1 = 'nieznany';
    //   continue;
    // }
    // console.log(project.status);
    voteData: {
      console.log(`Zbieranie danych o projekcie drukNr: ${project.drukNr}`);
      console.log();
      console.log(project);

      console.log(`Pobieranie drukPdfLink z ${project.trescLink}`);
      if (project.kadencja > 4) {
        project.drukPdfLink = scrapeDrukPdfLink(yield getBodyP(project.trescLink), project.kadencja)
      } else {
        project.drukPdfLink = project.trescLink
      }
      console.log(`Pobieranie przebiegBody z ${project.przebiegLink}`);

      przebiegBody = yield getBodyP(project.przebiegLink);

      console.log(`Pobieranie opis z przebiegBody`);
      project.opis = getVotingDescription(przebiegBody, project.kadencja);
      console.log(project.opis);

      console.log(`Pobieranie votingLink z przebiegBody`);
      project.votingLink = getDecidingVotingLink(przebiegBody, project.kadencja);
      console.log(project.votingLink);
      if (project.votingLink === undefined) {
        continue;
      }

      console.log(`Pobieranie votingBody z ${project.votingLink}`);
      let votingBody = yield getBodyP(project.votingLink);

      console.log(`Pobieranie votingDate z votingBody`);
      project.votingDate = getVotingDate(votingBody, project.kadencja);
      console.log(project.votingDate);

      console.log(`Pobieranie groupLinks z votingBody`);
      project.groupLinks = getGroupLinks(votingBody, project.kadencja);
      console.log(project.groupLinks);

      project.deputies = [];
      for (variable of project.groupLinks) {
        // console.log(variable.source);
        deputies = getDeputies(yield getBodyP(variable.source), variable.group, project.kadencja);
        project.deputies = project.deputies.concat(deputies);
      }

      console.log(project.deputies);

      project.frekwencja = 1 - project.deputies.filter((value) => {
        return value.vote === 'Nieobecny'
      }).length / project.deputies.length

      console.log(project.frekwencja);


      // console.log(project);
      console.log(project);
      db.Project.findOrCreate({
        where: {
          drukNr: project.drukNr
        },
        defaults: project
      }).then((result) => {
        console.log(`Zapisano w bazie danych drukNr: ${result[0].drukNr}`);
      });

      console.log();
    }

  }
  console.log('klotz');
})

// NOTE: Co daje ta klasa? attendance i tak jest zapisywane, pomimo, że brak tej zmiennej w konstruktorze
// class Project {
//   constructor({
//     tresc,
//     status,
//     tytul,
//     isap,
//     przebieg,
//     drukNr,
//     votings
//   }) {
//     this.tresc = tresc;
//     this.status = status;
//     this.tytul = tytul;
//     this.isap = isap;
//     this.przebieg = przebieg;
//     this.drukNr = drukNr;
//     this.votings = votings;
//   }
// }

function getBodyP(url) {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      encoding: null
    }, (err, response, body) => {
      if (err) reject(err);
      else {
        let test = body.toString().search('ISO-8859-2');
        console.log(test);

        if (test !== -1) {
          resolve(iconv.decode(body, 'ISO-8859-2'));
        } else {
          resolve (iconv.decode(body, 'UTF-8'));
        }
      }
    });
  });
}

function getProjects(body, kadencja) {
  console.log(kadencja);
  let projects = [];
  let $ = cheerio.load(body);

  // throw true;
  let dataTable = $('table').find('tbody').find('tr');

  dataTable.each((it, ele) => {
    let element = $(ele).find('td');
    let project = {};

    project.drukNr = parseInt(element.eq(3).find('a').text().replace(/\n/g, ''));
    // console.log(project.drukNr);
    if (isNaN(project.drukNr)) {
      return;
    }

    if (element.eq(1).find('font').attr('color') == 'green') {
      project.status = 'przed III czytaniem';
      project.tytul = element.eq(1).find('font').text();
      return;
    } else if (['#A0A0A0', '#C0C0C0'].indexOf(element.eq(1).find('font').attr('color')) !== -1) {
      project.tytul = element.eq(1).find('font').text();
      project.status = 'odrzucony';
    } else {
      project.status = 'uchwalono';
      project.tytul = element.eq(1).text().replace('Treść projektu', '');
    }
    project.tytul = project.tytul.replace(/\n/g, '').trim();

    project.trescLink = function(link) {
      if (link.indexOf('http') === -1) {
        link = base + link;
      }
      return link;
    }(element.eq(1).find('a').attr('href'));
    project.kadencja = kadencja;

    //WEJDŹ W PRZEBIEG I ZCZYTAJ DANE OSTATNIEGO GŁOSOWANIA, CZYLI DECYDUJĄCEGO a.vote ostatniu

    project.isapLink = element.eq(2).find('a').attr('href');
    project.przebiegLink = function(link) {
      if (link.indexOf('http') === -1) {
        link = base + link;
      }
      return link;
    }(element.eq(3).find('a').attr('href'));


    // project.komisje = element.eq(4).html();
    // console.log(project);
    projects.push(project);

  });
  return projects;
}

function scrapeDrukPdfLink(body, kadencja) {
  let $ = cheerio.load(body);

  let temp = $('a').filter((index, element) => {
    return $(element).text().search('.pdf') !== -1;
  }).first().attr('href');

  if (kadencja === 5 || kadencja === 6) {
    temp = 'http://orka.sejm.gov.pl' + temp;
  }
  return temp;
}

function getDecidingVotingLink(body, kadencja) {
  let $ = cheerio.load(body);
  let lastVotingLink;
  console.log(kadencja);

  if (kadencja > 6) {
    lastVotingLink = base + `/Sejm${kadencja}.nsf/` + $('a.vote').last().attr('href');

  } else {
    lastVotingLink = $('a').filter((index, element) => {
      return $(element).text().search('głos') !== -1;
    }).last().attr('href');
  }
  return lastVotingLink;
}

function getVotingDescription(body, kadencja) {
  let $ = cheerio.load(body);
  let votingDescription;
  if (kadencja > 6) {
    votingDescription = $('div.left p').text();
  } else {
    votingDescription = $('tr').eq(8).text().replace(/\n/g, '').trim();
  }
  return votingDescription;
}

function getVotingDate(body, kadencja) {
  let $ = cheerio.load(body);
  let votingDate;

  if (kadencja > 6) {
    votingDate = $('#title_content small').text();
  } else {
    votingDate = $('td').text();
  }
  votingDay = votingDate.match(/[0-9]{2}-[0-9]{2}-[0-9]{4}/).toString();
  votingHour = votingDate.match(/[0-9]{2}:[0-9]{2}/).toString();

  votingDate = votingDay.split('-').concat(votingHour.split(':'))
  votingDate = new Date(votingDate[2], votingDate[1]-1, votingDate[0], votingDate[3], votingDate[4])
  return votingDate;
}

function getGroupLinks(body, kadencja) {
  let $ = cheerio.load(body);

  var table;
  if (kadencja > 3 && kadencja < 7) {
    table = $('tbody').eq(-2);
  } else {
    table = $('tbody').eq(-1);
  }

  if (kadencja < 7) {
    table.children().eq(0).remove();
  }

  let links = [];

  table.children().each((i, elem) => {
    let currentGroup = $(elem).find('a').first().text();
    let link = $(elem).find('a').attr('href');
    if (kadencja > 6) {
      link = base + `/Sejm${kadencja}.nsf/` + link;
    } else {
      link = link.replace('.', 'http://orka.sejm.gov.pl/SQL.nsf');
    }

    links.push({
      'group': currentGroup,
      'source': link
    });
  });

  return links;

}

function getDeputies(body, group, kadencja) {
  let $ = cheerio.load(body);
  let deputies = [];

  if (kadencja > 6) {
    $('tbody').find('tr').each((it, ele) => {
      let element = $(ele).find('td');
      for (var i = 1; i < 5; i += 3) {
        if (element.eq(i).html() != null) {
          let deputy = {};
          deputy.name = element.eq(i).text();
          deputy.vote = element.eq(i + 1).text();
          deputy.group = group;
          deputies.push(deputy);
        }
      }
    });
  } else {
    $('tbody').find('tr').each((it, ele) => {
      if (it < 6) {
        return;
      }

      let element = $(ele).find('td');
      for (var i = 0; i < 3; i += 2) {
        if (element.eq(i).text() !== "") {
          let deputy = {};
          deputy.name = element.eq(i).text();
          deputy.vote = element.eq(i + 1).text();
          deputy.group = group;
          deputies.push(deputy);
        }
      }
    });
  }

  return deputies;
}
