const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, 'app.log');

function fmt(level, msg) {
  return `[${new Date().toISOString()}] [${level}] ${msg}`;
}

const logger = {
  info(msg) {
    const line = fmt('INFO', msg);
    console.log(line);
    fs.appendFileSync(logFile, line + '\n');
  },
  error(msg) {
    const line = fmt('ERROR', msg);
    console.error(line);
    fs.appendFileSync(logFile, line + '\n');
  },
  warn(msg) {
    const line = fmt('WARN', msg);
    console.warn(line);
  }
};

module.exports = logger;
