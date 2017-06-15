const Sequelize = require('sequelize')

var sequelize = new Sequelize('test', 'alarm', '', {
  host: 'localhost',
  dialect: 'postgres',
  timestamps: true,

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
})

sequelize
  .authenticate()
  .then(function(err) {
    console.log('Connection has been established successfully.');
  })
  .catch(function(err) {
    console.log('Unable to connect to the database:', err);
  })

var User = sequelize.define('user', {
  login: Sequelize.STRING,
  password: Sequelize.STRING
})

var Project = sequelize.define('project'), {
  name: Sequelize.STRING,
  date: Sequelize.DATE,
  decisiveVotingId: Sequelize.NUMBER
})

var Voting = sequelize.define('Voting'), {
  name: Sequelize.STRING,
  date: Sequelize.DATE
})


module.exports = {
  'sequelize': sequelize,
  'User': User,

  //    'votingSchema': votingSchema,
  //    'Voting': Voting,
  //    'userSchema': userSchema,
}



//const userSchema = {
//    username: String,
//    password: String,
//    facebook_id: String,
//    votes: {
//        projectId: String,
//        option: {
//            type: String,
//            enum: ['Za', 'Przeciw', 'Nie oddał głosu', 'Nieobecny', 'Wstrzymał się']
//        },
//        date: Date,
//    }
//}

//let User = mongoose.model('User', userSchema)


//const projectSchema = new mongoose.Schema({
//    printLink: String,
//    title: String,
//    txt: String,
//    printNr: Number,
//    link: String,
//    comissionWork: String,
//})



//const votingSchema = new mongoose.Schema({
//    source: String,
//    date: Date,
//    title: String,
//    nr: {
//        Kadencji: Number,
//        Posiedzenia: Number,
//        Glosowania: Number,
//    },
//
//    deputies: [{
//        name: String,
//        group: String,
//        vote: {
//            type: String,
//            enum: ['Za', 'Przeciw', 'Nie oddał głosu', 'Nieobecny', 'Wstrzymał się']
//        },
//    }],
//})

//let Voting = mongoose.model('Voting', votingSchema)
