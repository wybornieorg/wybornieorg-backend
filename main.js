const server = require('./server.js');

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

async function main() {
  await server.start();

  if (process.env.COLLECT === '1') {
    const collector = require('./collector.js');
    const run = () => {
      collector.start()
        .catch((err) => console.error('Collector error:', err))
        .finally(() => {
          console.log('Następny update za 4 godziny.');
          setTimeout(run, 1000 * 60 * 60 * 4);
        });
    };
    run();
  } else {
    console.log('Collector wyłączony (uruchom z COLLECT=1, aby pobierać dane z sejm.gov.pl).');
  }
}

main().catch((err) => {
  console.error('Nie udało się uruchomić serwera:', err);
  process.exit(1);
});