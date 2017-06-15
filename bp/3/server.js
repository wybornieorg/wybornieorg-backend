const Koa = require('koa')
  // const CSRF = require('koa-csrf').default
// const flash = require('koa-flash')
const https = require('https')
const app = new Koa()
const lastDate = new Date().toLocaleString()

app.use(require('koa-static')('static'))
// trust proxy
// app.proxy = false

// MongoDB
// const mongo = require('koa-mongo')
// app.use(mongo({
//     host: 'localhost',
//     port: 27017,
//     db: 'test',
// }))

// console.log('connecting to MongoDB...')

// sessions
const convert = require('koa-convert')
const session = require('koa-generic-session')
  // const MongoStore = require('koa-generic-session-mongo')

app.keys = ['wielka-tajemnica-ziarno-swiata']
app.use(convert(session({
  // store: new MongoStore()
})))
// app.use(convert(flash()))


// body parser
const bodyParser = require('koa-bodyparser')
app.use(bodyParser())

// csrf
// app.use(new CSRF({
//     invalidSessionSecretMessage: 'Invalid session secret',
//     invalidSessionSecretStatusCode: 403,
//     invalidTokenMessage: 'Invalid CSRF token',
//     invalidTokenStatusCode: 403
// }))

// authentication
require('./auth')
const passport = require('koa-passport')
app.use(passport.initialize())
app.use(passport.session())

// routes
const fs = require('fs')
const router = require('koa-router')()

app.use(router.routes())
  .use(router.allowedMethods());

router.get('/', function(ctx) {
  ctx.type = 'html'
  var body = fs.readFileSync('views/login.html', 'utf8')
  ctx.body = body.replace('{data}', lastDate)
})

router.post('/custom', function(ctx, next) {
  return passport.authenticate('local', function(user, info, status) {
    if (user === false) {
      ctx.status = 401
      ctx.body = {
        success: false
      }
    } else {
      ctx.body = {
        success: true
      }
      return ctx.login(user)
    }
  })(ctx, next)
})

// POST /login
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/app',
    failureRedirect: '/',
    failureFlash: true
  })
)

router.get('/logout', function(ctx) {
  ctx.logout()
  ctx.redirect('/')
})

router.get('/auth/facebook',
  passport.authenticate('facebook')
)

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/app',
    failureRedirect: '/',
    failureFlash: true
  })
)

// Require authentication for now
app.use(function(ctx, next) {
  if (ctx.isAuthenticated()) {
    return next()
  } else {
    ctx.redirect('/')
  }
})

router.get('/app', function(ctx) {
  // ctx.state.user = await User.find(id);

  ctx.type = 'html'
  if (ctx.session.passport == undefined) {
    ctx.body = 'zaloguj sie ciulu'
  }
  else {
    ctx.body = fs.createReadStream('views/app.html')
  }
})

// start server
const port = process.env.PORT || 3000

// var options = {
//   key: fs.readFileSync('server.key'),
//   cert: fs.readFileSync('server.crt')
// }

app.listen(port, () => console.log('Server listening on', port))
// https.createServer(options, app.callback()).listen(port);
