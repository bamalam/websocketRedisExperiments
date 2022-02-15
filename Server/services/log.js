const winston = require('winston');
const config = require('./config');
const path = require('path');

const log = winston.createLogger({
  level: config.get('log.level'),
  format: winston.format.combine(
    winston.format.errors(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // todo add proper logging transports here, will just dump to console for demo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.padLevels(),
        // winston.format.simple()
        winston.format.printf(info => `${info.timestamp} ${info.level} ${info.message}`)
      ),
      level: 'silly'
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(config.get('log.location'),
        config.get('env'),
        '/exceptions.log')
    })
  ],
  exitOnError: false
});

module.exports = log;
