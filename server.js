console.log('Uruchomiono server.js');

const Koa = require('koa')
// const CSRF = require('koa-csrf').default
// const flash = require('koa-flash')
// const https = require('https')
const app = new Koa()
// const lastDate = new Date().toLocaleString()

// app.use(require('koa-static')('static'))

// body parser
// const bodyParser = require('koa-bodyparser')
// app.use(bodyParser())

// routes
const fs = require('fs')
const router = require('koa-router')()

app.use(async (ctx,next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*');
  ctx.response.set('Access-Control-Allow-Methods', 'GET');
  ctx.response.set('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  ctx.response.set('Access-Control-Allow-Credentials', true);
  await next();

}).use(router.routes())
  .use(router.allowedMethods());
//
// blog = fs.readdirSync('./views/blog')
// blogbody = ''
// console.log(blog);
//
// if (blog.length != 0) {
//   for (var i = blog.length - 1; i >= 0; i--) {
//     date = fs.statSync('views/blog/' + blog[i]).mtime.toLocaleString()
//     blog[i] = fs.readFileSync('views/blog/' + blog[i], 'utf8')
//     blogbody += blog[i]
//   }
// }
//
//
// router.get('/blog', async(ctx) => {
//   ctx.type = 'html'
//   let body = fs.readFileSync('views/blog.html', 'utf8')
//   ctx.body = body.replace('{blog}', blogbody)
// })

const db = require('./database.js');

router.get('/dev/projekty', async(ctx) => {
  ctx.type = 'html'
  ctx.body = await db.Project.findAll({
    attributes: ['drukNr', 'tytul', 'frekwencja', 'status', 'kadencja', 'votingDate']
  })
})

router.get('/dev/projekty/:kadencja/:druk', async(ctx) => {
  ctx.type = 'html'
  ctx.body = await db.Project.findOne({
    where: {
      drukNr: ctx.params.druk,
      kadencja: ctx.params.kadencja
    }
  })

});



// start server
const port = process.env.PORT || 3000

app.listen(port, () => console.log('Server listening on', port))
