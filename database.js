console.log('Uruchomiono database.js');


const Sequelize = require('sequelize')

var sequelize = new Sequelize('sejmortestdb', 'alarm', '', {
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
//
// const User = sequelize.define('user', {
//   login: Sequelize.STRING,
//   password: Sequelize.STRING
// })

const Project = sequelize.define('project', {
  "status": Sequelize.STRING,
  "tytul": Sequelize.TEXT,
  "trescLink": Sequelize.STRING,
  "drukPdfLink": Sequelize.JSON,
  "isapLink": Sequelize.STRING,
  "przebiegLink": Sequelize.STRING,
  "drukNr": Sequelize.INTEGER,
  "frekwencja": Sequelize.FLOAT,
  "votingLink": Sequelize.STRING,
  "votingData": Sequelize.JSON,
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
