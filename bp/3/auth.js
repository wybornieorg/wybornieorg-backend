const passport = require('koa-passport')

const database = require('./database.js')
const User = database.User

//co(function* (){
//    let testUser = yield User.where('username', 'test').find()
//      if (!testUser) {
//        console.log('test user did not exist; creating test user...')
//        testUser = new User({
//          username: 'test',
//          password: 'test'
//        })
//        testUser.save()
//      }
//})

async function findUser(username, password) {
  //    User.findOne({'username':username}) (err, user) => {
  //        if(!user){
  //            console.log(`user ${user} did not exist, informing user`)
  //            return 'user doesnt exist'
  //        } else if(user.password != password){
  //            console.log(`password for ${user} wrong`)
  //            return 'wrong password'
  //        } else return user
  //    }
}

async function fetchUser(id) {
  //    User.findOne({'id':id}) (err, user) => {
  //        if(!user) return 'no user with this id'
  //        return user
  //    }
}

passport.serializeUser(function(user, done) {
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  User.findById(id).then((user) => {
    done(null, user)
  })
})

const LocalStrategy = require('passport-local').Strategy
passport.use(new LocalStrategy((username, password, done) => {
  User.findOrCreate({
      where: {
        login: username
      },
      defaults: {
        login: username,
        password: password
      }
    }).spread((user) => {
      if (user.password != password) return done(null, false)
      else return done(null, user.get())
    })
    // User.findOne({ username: username, password: password }, done);
}))

const FacebookStrategy = require('passport-facebook').Strategy
passport.use(new FacebookStrategy({
    clientID: '425720344484746',
    clientSecret: 'eb57379cbf1e793fcb6eb0da780acfed',
    callbackURL: 'http://89.70.23.117:' + (process.env.PORT || 3000) + '/auth/facebook/callback'
  },
  function(token, tokenSecret, profile, done) {
    // retrieve user
    User.findOne({
      facebook_id: profile.id
    }, done);
  }
))
