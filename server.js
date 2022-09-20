console.log('Uruchomiono server.js');

const Koa = require('koa')
// const https = require('https')
const compress = require('koa-compress')
const cors = require('@koa/cors');
// const lastDate = new Date().toLocaleString()

const fs = require('fs')
const router = require('koa-router')()
const collectorStatus = require('./collector');

async function start() {
  const app = new Koa()
  app.use(cors());
  app.use(compress({
    threshold: 2048,
    flush: require('zlib')
      .Z_SYNC_FLUSH
  }));
  app.use(router.routes())
    .use(router.allowedMethods());

  const db = require('./database.js');

  router.get('/dev/status', async (ctx) => {
    ctx.body = collectorStatus.update()
  })

  router.get('/dev/projekty', async (ctx) => {
    ctx.type = 'json'
    ctx.body = await db.Project.findAll({
      // attributes: ['drukNr', 'tytul', 'frekwencja', 'status', 'kadencja', 'votingDate']
    })
  })

  router.get('/dev/kadencje', async (ctx) => {
    // ctx.type = 'json'
    let query = ` \
    SELECT numbers ->> 'kadencja' AS kadencja \
     FROM votings \
     GROUP BY kadencja \
    `
    ctx.body = await db.sequelize.query(query, { raw: true })
  })

  router.get('/dev/glosowania', async (ctx) => {
    ctx.type = 'json'
    let votings = await db.Voting.findAll({
      attributes: ['status', 'frekwencja', 'numbers', 'votingDate'],
      include: [{
        model: db.Project,
        attributes: ['drukNr', 'tytul', 'kadencja', 'prawoUE']
      }]
    })


    ctx.body = {
      collectorStatus: collectorStatus.update(),
      votings: votings
    }
  })

  router.get('/dev/glosowania/:kadencja', async (ctx) => {
    ctx.type = 'json'
    let votings = await db.Voting.findAll({
      attributes: ['status', 'frekwencja', 'numbers', 'votingDate', 'votingIntention'],
      where: {
        numbers: {
          kadencja: ctx.params.kadencja
        }
      },
      include: [{
        model: db.Project,
        attributes: ['drukNr', 'tytul', 'kadencja', 'prawoUE']
      },
      {
        model: db.MPW
      },
      {
        model: db.Nazwa
      }
    ]
    })

    ctx.body = {
      collectorStatus: collectorStatus.update(),
      votings: votings
    }

  })

  router.get('/dev/glosowania/:kadencja/:posiedzenie/:glosowanie', async (ctx) => {
    ctx.type = 'json'
    let voting = await db.Voting.findOne({
      where: {
        numbers: {
          kadencja: ctx.params.kadencja,
          posiedzenie: ctx.params.posiedzenie,
          glosowanie: ctx.params.glosowanie
        }
      },
      include: [{
        model: db.Project
      },
      {
        model: db.MPW
      },
      {
        model: db.Nazwa
      }
    ]
    })
    if (voting) {
      ctx.body = voting
    } else {
      ctx.status = 404
      ctx.body = {error: 'brak'}
    }
  })

  router.get('/dev/glosowaniaBulk/:list', async (ctx) => {
    ctx.type = 'json'
    let votings = []

    function parseList(list) {
      let array = JSON.parse(Buffer.from(list, 'base64').toString())
      array = array.map((el)=>{
        [kadencja, posiedzenie, glosowanie] = el.split('/')
        return {kadencja: parseInt(kadencja), posiedzenie: parseInt(posiedzenie), glosowanie: parseInt(glosowanie)}
      })
      console.log(array);
      return array
    }
    let promiseList = []

    for (votingNumber of parseList(ctx.params.list)) {
      // Promise.all?
      promise = db.Voting.findOne({
        where: {
          numbers: {
            kadencja: votingNumber.kadencja,
            posiedzenie: votingNumber.posiedzenie,
            glosowanie: votingNumber.glosowanie
          }
        },
        include: [{
          model: db.Project
        },
        {
          model: db.MPW
        },
        {
          model: db.Nazwa
        }
      ]
      })
      promiseList.push(promise)
    }
    votings = await Promise.all(promiseList)
    ctx.body = votings
  })


  router.get('/dev/mamprawowiedziec', async (ctx) => {
    ctx.type = 'json'
    ctx.body = await db.MPW.findAll()
  })

  router.get('/dev/nazwyzwyczajowe', async (ctx) => {
    ctx.type = 'json'
    ctx.body = await db.Nazwa.findAll()
  })

  // start server
  const port = process.env.PORT || 3000

  app.listen(port, () => console.log('Server listening on', port))
}

start()
