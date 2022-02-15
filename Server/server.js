const ws = require('ws');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const log = require('./services/log.js');
const config = require('./services/config.js');
const messages = require('./constants/messages.js');
const { once } = require('events');

module.exports = class Server {
  async start () {
    if (this.started) {
      // should never happen...
      throw new Error('Start called twice! Server can only be started once');
    }
    this.started = true;
    const { host, port } = config.get('server');

    // todo redis config
    this.redisPub = redis.createClient();
    this.redisSub = redis.createClient();

    await new Promise((resolve) => {
      this.wss = new ws.WebSocketServer({
        port,
        host,
        clientTracking: true
      }, resolve);
    });
    log.info('Websocket server listening..');

    try {
      await Promise.all([this.redisPub.connect(), this.redisSub.connect()]);
    } catch (error) {
      log.error('Failed to connect to redis server', error);
      throw error;
    }
    log.info('Redis connected..');
    // now do something with the ws
    this.redisSub.subscribe(messages.boardcastMessage);
    this.redisSub.subscribe(messages.directMessage);

    this.wss.on('connection', (socket, request) => {
      // give each socket a unique id
      socket.id = uuidv4();
      socket.on(messages.boardcastMessage, (message) => {
        this.redisPub.publish(messages.boardcastMessage, message);
      });
    });

    this.redisSub.on('message', (channel, data) => {
      /** @type {target?: string, message: string} */
      const messageData = JSON.parse(data);
      log.debug('Received message', messageData);
      switch (channel) {
        case messages.boardcastMessage:
          log.silly('Broadcasting message to all clients', messageData.message);
          this.wss.clients.forEach((ws) => {
            ws.send(data);
          });
          break;
        case messages.directMessage:
          // todo have a map containing current clients keyed by id
          for (const client of this.wss.clients) {
            if (client.id !== messageData.target) continue;

            log.silly('Sending private message to client', messageData);
            client.send(data);
            break;
          }
          break;
        default:
          log.warn('Unknown message type received', data);
          break;
      }
    });
  }

  async shutdown () {
    // orderly shutdown
    log.info('Shutting down..');

    // stop accepting requests, finish active requests
    log.verbose('Closing server');
    await new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
    log.verbose('Server closed');

    // close redis connections
    await Promise.all([
      this.redisSub.quit(),
      this.redisPub.quit()
    ]);

    // flush logs
    log.end();
    await once(log, 'finish');
  }
};
