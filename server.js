console.log('Uruchomiono server.js');

let collector = require('./collector');

console.log(collector.test.then(() => {
  console.log('finisz');
}));

const Koa = require('koa')
// const CSRF = require('koa-csrf').default
// const flash = require('koa-flash')
// const https = require('https')
const app = new Koa()
const lastDate = new Date().toLocaleString()

app.use(require('koa-static')('static'))

// body parser
// const bodyParser = require('koa-bodyparser')
// app.use(bodyParser())

// routes
const fs = require('fs')
const router = require('koa-router')()

app.use(router.routes())
  .use(router.allowedMethods());


blog = fs.readdirSync('./views/blog')
blogbody = ''
console.log(blog);

if (blog.length!=0) {
  for (var i = blog.length-1; i >= 0; i--) {
    date = fs.statSync('views/blog/' + blog[i]).mtime.toLocaleString()
    blog[i]=fs.readFileSync('views/blog/' + blog[i], 'utf8')
    blogbody+=blog[i]
  }
}


router.get('/', function(ctx) {
  ctx.type = 'html'
  body = fs.readFileSync('views/blog.html', 'utf8')
  ctx.body = body.replace('{blog}',blogbody)
})



// start server
const port = process.env.PORT || 3000

app.listen(port, () => console.log('Server listening on', port))
