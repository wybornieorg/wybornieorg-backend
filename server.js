console.log('Uruchomiono server.js');

const Koa = require('koa')
// const CSRF = require('koa-csrf').default
// const flash = require('koa-flash')
// const https = require('https')
const compress = require('koa-compress')
const app = new Koa()
// const lastDate = new Date().toLocaleString()

// app.use(require('koa-static')('static'))

// body parser
// const bodyParser = require('koa-bodyparser')
// app.use(bodyParser())

// routes
const fs = require('fs')
const router = require('koa-router')()
const collectorStatus = require('./collector');

app.use(compress({
  threshold: 2048,
  flush: require('zlib')
    .Z_SYNC_FLUSH
}));

app.use(async (ctx, next) => {
    ctx.response.set('Access-Control-Allow-Origin', '*');
    ctx.response.set('Access-Control-Allow-Methods', 'GET');
    ctx.response.set('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    ctx.response.set('Access-Control-Allow-Credentials', true);
    await next();
  })
  .use(router.routes())
  .use(router.allowedMethods());

const db = require('./database.js');

router.get('/dev/status', async (ctx) => {
  ctx.body = collectorStatus.update()
})

router.get('/dev/projekty', async (ctx) => {
  ctx.type = 'html'
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
  ctx.type = 'html'
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
  ctx.type = 'html'
  let votings = await db.Voting.findAll({
    attributes: ['status', 'frekwencja', 'numbers', 'votingDate'],
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
  ctx.type = 'html'
  ctx.body = await db.Voting.findOne({
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

})

router.get('/dev/mamprawowiedziec', async (ctx) => {
  ctx.type = 'html'
  ctx.body = await db.MPW.findAll()
})

router.get('/dev/nazwyzwyczajowe', async (ctx) => {
  ctx.type = 'html'
  ctx.body = await db.Nazwa.findAll()
})

// start server
const port = process.env.PORT || 3000

app.listen(port, () => console.log('Server listening on', port))
