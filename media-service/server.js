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
app.use(cors({
  origin: ['https://freeblogweb.vercel.app', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(helmet())

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
  // 1. Bind to the port IMMEDIATELY so Render marks the container as healthy
  const server = app.listen(PORT, '0.0.0.0', () => {
    mediaLogger.info(`MEDIA SERVICE is Running on PORT ${PORT}`)
  })

  try {
    // 2. Initialize your infrastructure connection
    await connectToRabbitMq();

    // 3. Register your specific media consumer event handler
    await consumeEvent('post_deleted', consumedEventHandler)
    mediaLogger.info('Media Service message broker connections initialized successfully.')

  } catch (error) {
    // 4. Output the real error stack to your Render logs
    mediaLogger.error('CRITICAL DEPLOYMENT ERROR: Media Service failed to initialize infrastructure:', error)
    
    // 5. Fail Fast: Close the process immediately if the connection fails
    process.exit(1)
  }
}

startServer()