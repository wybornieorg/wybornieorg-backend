console.log('Uruchomiono collector.js');

const cheerio = require('cheerio');
const axios = require('axios');
const iconv = require('iconv-lite');

const db = require('./database.js');
const mamprawowiedziec = require('./mamprawowiedziec.js');
const nazwazwyczajowa = require('./nazwazwyczajowa.js');

db.sequelize.sync({
  // force: true
}).then(start)

let update = true
exports.update = function() {
  return update
};

const base = 'https://www.sejm.gov.pl';

const kadencjeLinki = [
  {
    nrKadencji: 9,
    link: 'https://www.sejm.gov.pl/Sejm9.nsf/page.xsp/przeglad_projust'
  },
  {
    nrKadencji: 8,
    link: 'https://www.sejm.gov.pl/Sejm8.nsf/page.xsp/przeglad_projust'
  },
  {
    nrKadencji: 7,
    link: 'https://www.sejm.gov.pl/Sejm7.nsf/page.xsp/przeglad_projust'
  },
  {
    nrKadencji: 6,
    link: 'https://www.sejm.gov.pl/prace/projustall6.htm'
  },
  {
    nrKadencji: 5,
    link: 'https://www.sejm.gov.pl/archiwum/prace/kadencja5/projustall5.htm'
  },
  {
    nrKadencji: 4,
    link: 'https://www.sejm.gov.pl/archiwum/prace/kadencja4/projustall4.htm'
  },
  {
    nrKadencji: 3,
    link: 'https://www.sejm.gov.pl/archiwum/prace/kadencja3/projust_all3.htm'
  },
];


async function start() {
  update = true
  let projects = [];

  for (const kadencja of kadencjeLinki) {
    projects = projects.concat(getProjects(await getBodyP(kadencja.link), kadencja.nrKadencji));
  }
  // console.log(projects);

  for (const project of projects) {
    test = await db.Project.findOne({
      where: {
        drukNr: project.drukNr
      }
    });

    if (test != null) {
      console.log(`Projekt nr: ${test.drukNr} jest już w bazie`);
      continue;
    }

    let voting = {}

    console.log(project.status);

    voteData: {
      console.log(`Zbieranie danych o projekcie drukNr: ${project.drukNr}\n`);
      // console.log(project);

      console.log(`Pobieranie drukPdfLink z ${project.trescLink}`);
      if (project.kadencja > 4) {
        project.drukPdfLink = scrapeDrukPdfLink(await getBodyP(project.trescLink), project.kadencja)
      } else {
        project.drukPdfLink = project.trescLink
      }
      console.log(`Pobieranie przebiegBody z ${project.przebiegLink}`);

      przebiegBody = await getBodyP(project.przebiegLink);

      if (przebiegBody.search('wycofany dnia') !== -1 || przebiegBody.indexOf(project.status) === -1) {
        console.log(`Pomijam pobieranie ${project.drukNr}`);
        continue;
      }
      if (przebiegBody.search('wykonanie prawa Unii Europejskiej') !== -1) {
        project.prawoUE = true;
      }
      console.log(`Pobieranie opis z przebiegBody`);
      project.opis = getProjectDescription(przebiegBody, project.kadencja);
      console.log(project.opis);

      console.log(`Pobieranie votingLink z przebiegBody`);
      voting.votingLink = getDecidingVotingLink(przebiegBody, project.kadencja);
      console.log(`votingLink: ${voting.votingLink}`);
      if (voting.votingLink === undefined) {
        continue;
      }
      voting.status = project.status
      voting.numbers = getVotingNumbers(voting.votingLink)
      console.log(voting.numbers);

      console.log(`Pobieranie votingBody z ${voting.votingLink}`);
      let votingBody = await getBodyP(voting.votingLink);

      console.log(`Pobieranie votingDate z votingBody`);
      voting.votingDate = getVotingDate(votingBody, project.kadencja);
      console.log(voting.votingDate);

      voting.votingIntention = getVotingIntention(votingBody);

      console.log(`Pobieranie groupLinks z votingBody`);
      voting.groupLinks = getGroupLinks(votingBody, project.kadencja);
      console.log(voting.groupLinks);

      voting.deputies = [];

      if (voting.groupLinks === []) {
        continue;
      }

      for (variable of voting.groupLinks) {
        // console.log(variable.source);
        deputies = getDeputies(await getBodyP(variable.source), variable.group, project.kadencja);
        voting.deputies = voting.deputies.concat(deputies);
      }

      console.log(voting.deputies);

      voting.frekwencja = 1 - voting.deputies.filter((value) => {
        return value.vote === 'Nieobecny'
      }).length / voting.deputies.length

      if (voting.frekwencja === null || voting.frekwencja === NaN) {
        voting.frekwencja = 0
      }
      console.log(voting.frekwencja);

      await db.Voting.findOrCreate({
        where: {
          votingLink: voting.votingLink
        },
        defaults: voting
      }).then((result) => {
        console.log(`Zapisano w bazie danych glosowanie: ${result[0].votingLink}`);
        project.votingId = result[0].id

        // console.log(project);

      }).catch(e=>{
        console.error(e)
      });
      // console.log(project);
      await db.Project.findOrCreate({
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

  await mamprawowiedziec.start()
  await nazwazwyczajowa.start()
  console.log(`Ukończono ${new Date()}. Odpal następny update za 4 godziny.`);
  update = false
  setTimeout(start, 1000 * 60 * 60 * 4)
}

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

async function getBodyP(url) {
  console.log(`Pobieranie ${url}`)
  let body = await axios.get(url, {
    responseType: 'arraybuffer',
    responseEncoding: 'binary'
  });
  let test = body.data.toString().search('ISO-8859-2');
  // console.log(test);

  if (test !== -1) {
    return iconv.decode(body.data, 'ISO-8859-2');
  } else {
    return iconv.decode(body.data, 'UTF-8');
  }
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
      if (link.indexOf('https') === -1) {
        link = base + link;
      }
      return link;
    }(element.eq(1).find('a').attr('href'));

    project.kadencja = kadencja;

    project.isapLink = element.eq(2).find('a').attr('href');
    project.przebiegLink = function(link) {
      if (link.indexOf('https') === -1) {
        link = base + link;
      }
      return link;
    }(element.eq(3).find('a').attr('href'));

    project.komisje = function(link) {
      if (link !== undefined && link.indexOf('https') === -1) {
        link = base + link;
      }
      return link;
    }(element.eq(4).find('a').attr('href'));

    projects.push(project);

  });
  console.log(projects)
  return projects;
}

function scrapeDrukPdfLink(body, kadencja) {
  let $ = cheerio.load(body);

  let temp = $('a').filter((index, element) => {
    return $(element).text().search('.pdf') !== -1;
  }).first().attr('href');

  if (kadencja === 5 || kadencja === 6) {
    temp = 'https://orka.sejm.gov.pl' + temp;
  }
  return temp;
}

function getDecidingVotingLink(body, kadencja) {
  let $ = cheerio.load(body);
  let lastVotingLink;
  console.log(kadencja);

  if (kadencja > 6) {
    let relLink = $('a.vote').last().attr('href')

    if (relLink === undefined) {
      return undefined;
    }
    lastVotingLink = base + `/Sejm${kadencja}.nsf/` + relLink;

  } else {
    lastVotingLink = $('a').filter((index, element) => {
      return $(element).text().search('głos') !== -1;
    }).last().attr('href');
  }
  return lastVotingLink;
}

function getVotingNumbers(votingLink) {
  let data = votingLink.split('&').slice(1).map((item) => {
    return parseInt(item.match(/\d+/)[0])
  })
  let [kadencja, posiedzenie, glosowanie] = data
  console.log(kadencja);
  return { kadencja: kadencja, posiedzenie: posiedzenie, glosowanie: glosowanie }
}

function getProjectDescription(body, kadencja) {
  let $ = cheerio.load(body);
  let votingDescription;
  if (kadencja > 6) {
    votingDescription = $('div.left').find('p').filter((index, element) => {
      return $(element).attr('class') === undefined
    }).text();
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
  console.log(votingDate);
  votingDay = votingDate.match(/[0-9]{2}-[0-9]{2}-[0-9]{4}/).toString();
  votingHour = votingDate.match(/[0-9]{2}:[0-9]{2}/).toString();

  votingDate = votingDay.split('-').concat(votingHour.split(':'))
  votingDate = new Date(votingDate[2], votingDate[1] - 1, votingDate[0], votingDate[3], votingDate[4])
  return votingDate;
}

function getVotingIntention(body) {
  return body.indexOf('odrzucenie') !== -1 ? 'odrzucenie' : 'przyjęcie'
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
    if (link === undefined) {
      return false;
    }
    if (kadencja > 6) {
      link = base + `/Sejm${kadencja}.nsf/` + link;
    } else {
      link = link.replace('.', 'https://orka.sejm.gov.pl/SQL.nsf');
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
