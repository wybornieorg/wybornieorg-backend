// TODO:
// - zapisywanie w bazie danych
// - inkrementacja numerkow
// - dlaczego nie bierze ostatniego numerka, moze to blad mongoose



console.log('Uruchomiono collector.js');

const co = require('co');
const cheerio = require('cheerio');
const request = require('request');
const database = require('./database');

const base = 'http://www.sejm.gov.pl';

let iterator = '';
//let nr;


co(function *(){
    let url = 'http://sejm.gov.pl/Sejm8.nsf/page.xsp/przeglad_projust';
    let projects = getProjectsData(yield getBodyP(url));
    // console.log(projects);

    let project = projects[13].link;

    let votings = getProjectVotings(yield getBodyP(project));
    console.log(votings);
    let results = getGroupLinks(yield getBodyP(votings));

    for(r in results){
        //console.log(getDeputies(yield getBodyP(results[r].source),results[r].group));
    }

    //Promise.all();

    process.exit();
});

function getBodyP(url){
    return new Promise((resolve,reject)=>{
        request(url,(err,response,body)=>{
            if(err) reject(error);
            else resolve(body);
        });
    });
}

function getProjectsData(body){
    let $ = cheerio.load(body);

    let data = $('tr').map((i,el)=>{

        return $(el).find('td').map((i,el)=>{
            return $(el).html();
        }).get();
    }).get();

    return parseProjectsData(data);
}

function parseProjectsData(projectsArray){
    let projectsData = [];
    projectsArray.forEach((el,i,arr)=>{
        //if (i%5 == 0) projectsData.push([]);
        //projectsData[Math.trunc(i/5)].push(arr[i%5]);
        let $ = cheerio.load(arr[i]);

        let nr = Math.trunc(i/5);

        switch (i%5){
          case 0:
            projectsData[nr]={};
            break;
          case 1:
            projectsData[nr].printLink = base + $('a').attr('href');
            let div = $('div');
            let tit = div.eq(1).find('font').html();
            if(tit === null) tit = div.eq(1).html();
            else {



            }
            projectsData[nr].title = fixLetters(tit);
            break;
          case 2:
            projectsData[nr].txt = $('a').attr('href');
            break;
          case 3:
            projectsData[nr].printNr = $('a').html();
            projectsData[nr].link = base + $('a').attr('href');
            break;
          case 4:
            projectsData[nr].comissionWork = base + $('a').attr('href');
            break;
        }
    });

    return projectsData;
}

function getGroupLinks(body) {
    let $ = cheerio.load(body);

    var table = $('tbody');
    let links = [];


    table.children().each((i, elem) => {
        let link = base + "/Sejm8.nsf/" + $(elem).find('a').attr('href');
        //console.log(link);
        links.push({'group':$(elem).find('a strong').html(),'source':link});
    });

   return links;
}

function getDeputies(body,group){
    //return new Promise((resolve,reject)=>{
        let deputies = [];

            let $ = cheerio.load(body);

            $('tbody').find('tr').each((it,ele)=>{
                let element = $(ele).find('td');
                for (var i = 1; i < 5; i += 3) {
                    if(element.eq(i).html()!=null){
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

function getProjectVotings(body){
    let $ = cheerio.load(body);
    let l = $('a.vote').last().attr('href');

    if(l != undefined) return base + '/Sejm8.nsf/' + l;
    else return l;
}


function parseDate(string) {
  let date = string.slice(5, 15);
  let time = string.slice(27, 50);

  return new Date(date.slice(6, 10), date.slice(3, 5), date.slice(0, 2), time.slice(0, 2), time.slice(3, 5), time.slice(6, 8));
}

function fixLetters(string) {
    if(string==null) return null;

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
  string = string.replace(/\n/g,'');
  return string;
}
