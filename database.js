console.log('Uruchomiono database.js');


const Sequelize = require('sequelize')

var sequelize = new Sequelize('sejmortestdb', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  timestamps: true,
  logging: false,

  pool: {
    max: 30,
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
  "prawoUE": { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
});

const Voting = sequelize.define('voting', {
  "status": Sequelize.STRING,
  "frekwencja": Sequelize.FLOAT,
  "votingLink": Sequelize.STRING,
  "votingDate": Sequelize.JSON,
  "votingIntention": Sequelize.STRING,
  "numbers": Sequelize.JSON,
  "groupLinks": Sequelize.JSON,
  "deputies": Sequelize.JSON,
});

Voting.hasMany(Project)
const NazwaZwyczajowa = sequelize.define('nazwa', {
  "nazwaZwyczajowa": Sequelize.STRING,
  "numbers": {
    type: Sequelize.JSON
  }
});

Project.belongsTo(Voting)
NazwaZwyczajowa.belongsTo(Voting)
Voting.hasOne(NazwaZwyczajowa)

module.exports = {
  'sequelize': sequelize,
  'Project': Project,
  'Voting': Voting,
  'Nazwa': NazwaZwyczajowa,
}
