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

const MamPrawoWiedziec = sequelize.define('mpw', {
  "desc": Sequelize.TEXT,
  "markup": Sequelize.TEXT,
  "source": Sequelize.STRING,
  "href": Sequelize.STRING,
  "numbers": {
    type: Sequelize.JSON
  }
});

const NazwaZwyczajowa = sequelize.define('nazwa', {
  "nazwaZwyczajowa": Sequelize.STRING,
  "numbers": {
    type: Sequelize.JSON
  }
});

Project.belongsTo(Voting)
Voting.hasMany(Project)
MamPrawoWiedziec.belongsTo(Voting)
Voting.hasOne(MamPrawoWiedziec)
NazwaZwyczajowa.belongsTo(Voting)
Voting.hasOne(NazwaZwyczajowa)

module.exports = {
  'sequelize': sequelize,
  'Project': Project,
  'Voting': Voting,
  'MPW': MamPrawoWiedziec,
  'Nazwa': NazwaZwyczajowa,
}
