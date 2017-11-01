console.log('Uruchomiono database.js');


const Sequelize = require('sequelize')

var sequelize = new Sequelize('sejmortestdb', 'postgres', '', {
  host: 'localhost',
  dialect: 'postgres',
  timestamps: true,
  logging: false,

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
//
// const User = sequelize.define('user', {
//   login: Sequelize.STRING,
//   password: Sequelize.STRING
// })

const Project = sequelize.define('project', {
  "status": Sequelize.STRING,
  "tytul": Sequelize.TEXT,
  "opis": Sequelize.TEXT,
  "trescLink": Sequelize.STRING,
  "drukPdfLink": Sequelize.STRING,
  "isapLink": Sequelize.STRING,
  "przebiegLink": Sequelize.STRING,
  "komisje": Sequelize.STRING,
  "drukNr": Sequelize.INTEGER,
  "kadencja": Sequelize.INTEGER,
  "frekwencja": Sequelize.FLOAT,
  "votingLink": Sequelize.STRING,
  "votingDate": Sequelize.JSON,
  "votingIntention": Sequelize.STRING,
  "groupLinks": Sequelize.JSON,
  "deputies": Sequelize.JSON,
});

var Voting = sequelize.define('Voting', {
  // name: Sequelize.STRING,
});


module.exports = {
  'sequelize': sequelize,
  'Project': Project,
  'Voting': Voting,
}
