const zlib = require('zlib');
const Koa = require('koa');
const compress = require('koa-compress');
const cors = require('@koa/cors');
const Router = require('@koa/router');

const collectorStatus = require('./collector');
const db = require('./database.js');

const router = new Router();

router.get('/dev/status', async (ctx) => {
  ctx.body = { collectorStatus: collectorStatus.update() };
});

router.get('/dev/projekty', async (ctx) => {
  ctx.type = 'json';
  ctx.body = await db.Project.findAll();
});

router.get('/dev/kadencje', async (ctx) => {
  const [rows] = await db.sequelize.query(
    "SELECT numbers ->> 'kadencja' AS kadencja FROM votings GROUP BY kadencja"
  );
  ctx.body = rows;
});

router.get('/dev/glosowania', async (ctx) => {
  ctx.type = 'json';
  const votings = await db.Voting.findAll({
    attributes: ['status', 'frekwencja', 'numbers', 'votingDate'],
    include: [{
      model: db.Project,
      attributes: ['drukNr', 'tytul', 'kadencja', 'prawoUE']
    }]
  });

  ctx.body = {
    collectorStatus: collectorStatus.update(),
    votings
  };
});

router.get('/dev/glosowania/:kadencja', async (ctx) => {
  ctx.type = 'json';
  const votings = await db.Voting.findAll({
    attributes: ['status', 'frekwencja', 'numbers', 'votingDate', 'votingIntention'],
    where: {
      numbers: {
        kadencja: parseInt(ctx.params.kadencja)
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
  });

  ctx.body = {
    collectorStatus: collectorStatus.update(),
    votings
  };
});

router.get('/dev/glosowania/:kadencja/:posiedzenie/:glosowanie', async (ctx) => {
  ctx.type = 'json';
  const voting = await db.Voting.findOne({
    where: {
      numbers: {
        kadencja: parseInt(ctx.params.kadencja),
        posiedzenie: parseInt(ctx.params.posiedzenie),
        glosowanie: parseInt(ctx.params.glosowanie)
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
  });
  if (voting) {
    ctx.body = voting;
  } else {
    ctx.status = 404;
    ctx.body = { error: 'brak' };
  }
});

function parseList(list) {
  const array = JSON.parse(Buffer.from(list, 'base64').toString());
  return array.map((el) => {
    const [kadencja, posiedzenie, glosowanie] = el.split('/');
    return {
      kadencja: parseInt(kadencja),
      posiedzenie: parseInt(posiedzenie),
      glosowanie: parseInt(glosowanie)
    };
  });
}

router.get('/dev/glosowaniaBulk/:list', async (ctx) => {
  ctx.type = 'json';

  const promiseList = parseList(ctx.params.list).map((votingNumber) =>
    db.Voting.findOne({
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
  );

  ctx.body = await Promise.all(promiseList);
});

router.get('/dev/mamprawowiedziec', async (ctx) => {
  ctx.type = 'json';
  ctx.body = await db.MPW.findAll();
});

router.get('/dev/nazwyzwyczajowe', async (ctx) => {
  ctx.type = 'json';
  ctx.body = await db.Nazwa.findAll();
});

function createApp() {
  const app = new Koa();

  app.use(compress({
    threshold: 2048,
    flush: zlib.constants.Z_SYNC_FLUSH
  }));
  app.use(cors({ origin: () => '*' }));
  app.use(async (ctx, next) => {
    ctx.set('cache-control', 'max-age=604800');
    await next();
  });
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}

async function start() {
  const port = process.env.PORT || 3000;
  const app = createApp();

  // Make sure the schema exists before we accept traffic.
  await db.sequelize.sync();

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

module.exports = { createApp, start, router };