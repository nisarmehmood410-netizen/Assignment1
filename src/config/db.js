const cosmosDB = require('./cosmos');

async function connectDatabase() {
  await cosmosDB.connect();
}

module.exports = connectDatabase;
