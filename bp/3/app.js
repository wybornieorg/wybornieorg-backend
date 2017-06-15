let koa = require('koa'),
    logger = require('koa-logger'),
    router = require('koa-router')(),
    //stylus = require('koa-stylus'),
    mongo = require('koa-mongo'),
    server = require('koa-static'),
    Pug = require('koa-pug'),
    bodyparser = require('koa-bodyparser'),
    app = new koa();

app.use(mongo({
      host: 'localhost',
      port: 27017,
      //user: 'admin',
      //pass: '123456',
      db: 'test',
      max: 100,
      min: 1,
      timeout: 30000,
      log: false
}));

var pug = new Pug({
    viewPath: './source/templates',
    debug: true,
    /*pretty: false,
    compileDebug: false,
    locals: global_locals_for_all_pages,
    basedir: 'path/for/pug/extends',
    helperPath: [
        'path/to/pug/helpers',
        { random: 'path/to/lib/random.js' },
        { _: require('lodash') }
    ],*/
    app: app // equals to pug.use(app) and app.use(pug.middleware)
});

app
  .use(logger('dev'))
  .use(bodyparser())
  //.use(stylus('./source/stylesheets'))
  .use(server('./static'))
  .use(router.routes())
  .use(router.allowedMethods());

router.get('/',function *(){
    this.render('index', {});
});
router.get('/login',function *(){
    this.render('login', {});
});
router.get('/data/voting:nrGlosowania',function *(){
    this.body = yield this.mongo.db('test').collection('votings').findOne({'nr.Glosowania':parseInt(this.params.nrGlosowania)});
});
router.get('/voting',function *(){
    this.render('voting', {});
});



app.listen(3000);
