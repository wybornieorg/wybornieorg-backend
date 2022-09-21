console.log('Uruchomiono database.js');
const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');


const Project = sequelize.define('project', {
  "status": DataTypes.STRING,
  "tytul": DataTypes.TEXT,
  "opis": DataTypes.TEXT,
  "trescLink": DataTypes.STRING,
  "drukPdfLink": DataTypes.STRING,
  "isapLink": DataTypes.STRING,
  "przebiegLink": DataTypes.STRING,
  "komisje": DataTypes.STRING,
  "drukNr": DataTypes.INTEGER,
  "kadencja": DataTypes.INTEGER,
  "prawoUE": { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
});

const Voting = sequelize.define('voting', {
  "status": DataTypes.STRING,
  "frekwencja": DataTypes.FLOAT,
  "votingLink": DataTypes.STRING,
  "votingDate": DataTypes.DATE,
  "votingIntention": DataTypes.STRING,
  "numbers": DataTypes.JSON,
  "groupLinks": DataTypes.JSON,
  "deputies": DataTypes.JSON,
});

const MamPrawoWiedziec = sequelize.define('mpw', {
  "desc": DataTypes.TEXT,
  "markup": DataTypes.TEXT,
  "source": DataTypes.STRING,
  "author": DataTypes.JSON,
  "href": DataTypes.STRING,
  "numbers": {
    type: DataTypes.JSON
  }
});

const NazwaZwyczajowa = sequelize.define('nazwa', {
  "nazwaZwyczajowa": DataTypes.STRING,
  "numbers": {
    type: DataTypes.JSON
  }
});

Project.belongsTo(Voting);
Voting.hasMany(Project);
MamPrawoWiedziec.belongsTo(Voting);
Voting.hasOne(MamPrawoWiedziec);
NazwaZwyczajowa.belongsTo(Voting);
Voting.hasOne(NazwaZwyczajowa);


(async () => {
  await sequelize.sync();
})();

module.exports = {
  'sequelize': sequelize,
  'Project': Project,
  'Voting': Voting,
  'MPW': MamPrawoWiedziec,
  'Nazwa': NazwaZwyczajowa,
}
