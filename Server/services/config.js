const convict = require('convict');

const schema = {
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  log: {
    level: {
      doc: 'Log Level (info, verbose, silly, debug, warn, error)',
      default: 'info',
      format: ['info', 'verbose', 'silly', 'debug', 'warn', 'error']
    },
    location: {
      doc: 'log folder',
      format: String,
      default: './log'
    }
  },
  server: {
    host: {
      doc: 'The hostname to bind.',
      format: String,
      default: '0.0.0.0',
      env: 'HOST_NAME',
      arg: 'host'
    },
    port: {
      doc: 'The port to bind.',
      format: 'port',
      default: 8080,
      env: 'PORT',
      arg: 'port'
    }
  }
};

const config = convict(schema);

// Load environment dependent configuration
const env = config.get('env');

config.loadFile(`./config/${env}.json`);

// Perform validation
config.validate({ allowed: 'strict' });

module.exports = config;
