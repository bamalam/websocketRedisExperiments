
const log = require('./services/log.js');
const Server = require('./server.js');
log.profile('start up');
log.info('Process started');

// only enable if within PM2 environment
if (process.env.PROCESS_MANAGER === 'PM2') {
  const io = require('@pm2/io');
  log.debug('Server is running within PM2 process manager. Enabling PM2 integrations..');
  io.init({
    catchExceptions: false
  });

  // todo add some integrated error handling here
  // todo possibly add some custom metrics?
  // todo possibly add some custom cmds?
}

const server = new Server();

// allow graceful shutdown/restart
let exitCalledOnce = false;
process.on('message', async function (msg) {
  if (msg === 'shutdown') {
    exitCalledOnce = true;
    log.info('shutdown command received. Shutting down');
    let exitCode = 0;
    try {
      await server.shutdown();
    } catch (error) {
      console.error(error);
      exitCode = 1;
    } finally {
      process.exit(exitCode);
    }
  }
});

process.on('SIGINT', async function () {
  if (exitCalledOnce) {
    process.abort();
  }
  exitCalledOnce = true;
  log.info('SIGINT received. Shutting down');
  let exitCode = 0;
  try {
    await server.shutdown();
  } catch (error) {
    console.error(error);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
});

server.start()
  .then(() => {
    // notify process handler (eg pm2) that we are ready for requests
    if (process.send) {
      console.info('ready');
      process.send('ready');
    }
    log.profile('start up');
  })
  .catch((err) => {
    try {
      log.error(err);
    } catch (error) {
      console.error(err);
      console.error(error);
    }

    process.exit(1);
  });
