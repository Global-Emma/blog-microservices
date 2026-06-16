require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors')
const mongoose = require('mongoose');
const Redis = require('ioredis')
const { RedisStore } = require('rate-limit-redis')
const mediaRoute = require('./src/routes/mediaRoutes')
const { rateLimit } = require('express-rate-limit')
const mediaLogger = require('./src/utils/mediaLogger');
const errorHandler = require('./src/middleware/errorHandler');
const { connectToRabbitMq, consumeEvent } = require('./src/utils/rabbitMq');
const { consumedEventHandler } = require('./src/utils/consumedEvents');

const app = express();

const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(helmet())
app.use(cors({
  origin: 'https://freeblogweb.vercel.app',
  credentials: true
}))

mongoose.connect(process.env.MONGO_DB_URL).then(() => {
  return mediaLogger.info('Connected To MongoDB Successfully')
}).catch((error) => {
  return mediaLogger.error('Error Occured While Connecting To MONGODB', error)
})

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on('connect', () => {
  mediaLogger.info('Connected To Redis Successfully')
})

redisClient.on('error', (error) => {
  mediaLogger.error('Error Occured While Connecting to redis', error)
})

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    mediaLogger.warn(`API Request Limit has Been Exceeded For IP: ${req.ip}`)
    return res.status(429).json({
      success: false,
      message: 'Request Has Exceeded Limit'
    })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
})

app.use('/api/media', limiter)

app.use((req, res, next) => {
  mediaLogger.info(`Received a ${req.method} assigned to ${req.url}`)
  mediaLogger.info(`With Request Body ${req.body}`)
  next()
})

// MEDIA ROUTE
app.use('/api/media', mediaRoute)

// error Handler
app.use(errorHandler)

  async function startServer () {
    try {
      await connectToRabbitMq();

      await consumeEvent('post_deleted', consumedEventHandler)
      app.listen(PORT, () => {
        mediaLogger.info(`MEDIA SERVICE is Running on PORT ${PORT}`)
      })
    } catch (error) {
      mediaLogger.error('Error Occured While Starting Server')
    }
  }

  startServer()