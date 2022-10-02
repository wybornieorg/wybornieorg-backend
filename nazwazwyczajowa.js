console.log('Uruchomiono nazwazwyczajowa.js');

const db = require('./database.js');

db.Nazwa.drop()
module.exports = { start }

async function start () {
  let trello = await getBodyP('https://trello.com/b/X1Jp1EXO.json?key=cb55d042c8c02a3a6feb36e95cde20fe&cards=open')
  for (card of trello.cards) {
    if (card.idList !== '5a4ab28b970d7c085460a180') {
      let commonName = { nazwaZwyczajowa: card.name }

      try {
        commonName.numbers = parseVotingNumbers(card.desc)

        let voting = await db.Voting.find({
          where: {
            numbers: commonName.numbers
          }
        })

        try {
          commonName.votingId = voting.id
        } catch (e) {

        }
        console.log(commonName);
        await db.Nazwa.findOrCreate({
          where: {
            numbers: commonName.numbers
          },
          defaults: commonName
        }).then((result) => {
          console.log(`Zapisano w bazie danych nazwę zwyczajową: ${JSON.stringify(result[0].nazwaZwyczajowa)}`);
        });
      } catch (e) {

      }
    }
  }

}

function parseVotingNumbers(desc) {
  let [kadencja, posiedzenie, glosowanie] = desc.match(/[0-9]+\/[0-9]+\/[0-9]+/)[0].split('/').map(a => parseInt(a))
  return {kadencja, posiedzenie, glosowanie}
}


async function getBodyP(url) {
  const response = await fetch(url)
  return await response.text()
}
