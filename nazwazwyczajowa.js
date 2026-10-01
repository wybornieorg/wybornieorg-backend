const db = require('./database.js');
const { getBodyP } = require('./fetch.js');

module.exports = { start };

// Public Trello board holding the "nazwy zwyczajowe" cards.
// The old hard-coded API key no longer works; override with TRELLO_BOARD_URL
// or TRELLO_KEY/TRELLO_TOKEN if you have working credentials.
const TRELLO_BOARD_ID = 'X1Jp1EXO';
const LIST_ID = '5a4ab28b970d7c085460a180';

function boardUrl() {
  if (process.env.TRELLO_BOARD_URL) {
    return process.env.TRELLO_BOARD_URL;
  }
  if (process.env.TRELLO_KEY && process.env.TRELLO_TOKEN) {
    return `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/cards?cards=open&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;
  }
  return null;
}

async function start() {
  const url = boardUrl();
  if (!url) {
    console.warn('nazwazwyczajowa: brak TRELLO_BOARD_URL / TRELLO_KEY+TRELLO_TOKEN, pomijam.');
    return;
  }

  try {
    const trello = await getBodyP(url, { json: true });
    if (trello === null || !Array.isArray(trello.cards)) {
      console.warn('nazwazwyczajowa: nieoczekiwana odpowiedź Trello, pomijam.');
      return;
    }
    for (const card of trello.cards) {
      if (card.idList === LIST_ID) {
        continue;
      }
      const commonName = { nazwaZwyczajowa: card.name };

      try {
        commonName.numbers = parseVotingNumbers(card.desc);

        const voting = await db.Voting.findOne({
          where: { numbers: commonName.numbers }
        });
        if (voting) {
          commonName.votingId = voting.id;
        }

        await db.Nazwa.findOrCreate({
          where: { numbers: commonName.numbers },
          defaults: commonName
        }).then((result) => {
          console.log(`Zapisano w bazie danych nazwę zwyczajową: ${JSON.stringify(result[0].nazwaZwyczajowa)}`);
        });
      } catch (e) {
        // card without a parseable voting number - skip
      }
    }
  } catch (err) {
    console.warn(`nazwazwyczajowa: pomijam (${err.message})`);
  }
}

function parseVotingNumbers(desc) {
  const [kadencja, posiedzenie, glosowanie] =
    desc.match(/[0-9]+\/[0-9]+\/[0-9]+/)[0].split('/').map((a) => parseInt(a));
  return { kadencja, posiedzenie, glosowanie };
}