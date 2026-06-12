const Winston = require('winston');

const commentLogger = Winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: Winston.format.combine(
    Winston.format.splat(),
    Winston.format.errors({stack: true}),
    Winston.format.timestamp(),
    Winston.format.json()
  ),
  defaultMeta: {service: 'comment-service'},
  transports: [
      new Winston.transports.Console({
        format: Winston.format.combine(
          Winston.format.colorize(),
          Winston.format.simple()
        )
      }),
  
      new Winston.transports.File({
        filename: 'error.log',
        level: 'error'
      }),
  
      new Winston.transports.File({
        filename: 'combined.log',
      })
    ]
})

module.exports = commentLogger;