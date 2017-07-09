console.log('Uruchomiono database.js');


const Sequelize = require('sequelize')

var sequelize = new Sequelize('sejmortestdb', 'michal', '', {
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
  title: Sequelize.STRING,
});

var Voting = sequelize.define('Voting', {
  name: Sequelize.STRING,
});


module.exports = {
  'sequelize': sequelize,
  'Project': Project,
  'Voting': Voting,
}
