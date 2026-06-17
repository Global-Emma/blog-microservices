require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors')
const mongoose = require('mongoose');
const Redis = require('ioredis')
const { RedisStore } = require('rate-limit-redis')
const postRoute = require('./src/routes/postRoutes')
const { rateLimit } = require('express-rate-limit')
const postLogger = require('./src/utils/postLogger');
const errorHandler = require('./src/middleware/errorHandler');
const { connectToRabbitMq, consumeEvent } = require('./src/utils/rabbitmq');
const { consumedEvents } = require('./src/utils/consumedEvents');

const app = express();

const PORT = process.env.PORT || 6000

app.use(express.json())
app.use(helmet())
app.use(cors({
  origin: 'https://freeblogweb.vercel.app',
  credentials: true
}))

mongoose.connect(process.env.MONGO_DB_URL).then(() => {
  return postLogger.info('Connected To MongoDB Successfully')
}).catch((error) => {
  return postLogger.error('Error Occured While Connecting To MONGODB', error)
})

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on('connect', () => {
  postLogger.info('Connected To Redis Successfully')
})

redisClient.on('error', (error) => {
  postLogger.error('Error Occured While Connecting to redis', error)
})

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    postLogger.warn(`API Request Limit has Been Exceeded For IP: ${req.ip}`)
    return res.status(429).json({
      success: false,
      message: 'Request Has Exceeded Limit'
    })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
})

app.use('/api/posts', limiter)

app.use((req, res, next) => {
  postLogger.info(`Received a ${req.method} assigned to ${req.url}`)
  postLogger.info(`With Request Body ${req.body}`)
  next()
})

// POST ROUTE
app.use('/api/posts', postRoute)

// error Handler
app.use(errorHandler)

async function startServer () {
  // 1. Bind to the port IMMEDIATELY so Render passes its port scan check
  const server = app.listen(PORT, '0.0.0.0', () => {
    postLogger.info(`POST SERVICE is Running on PORT ${PORT}`)
  })

  try {
    // 2. Initialize downstream infrastructure safely after port binding
    await connectToRabbitMq();
    await consumeEvent('new_comment_published', consumedEvents);
    postLogger.info('Post Service message broker connections initialized successfully.');
    
  } catch (error) {
    // 3. Print the real underlying error stack to your Render logs
    postLogger.error('CRITICAL DEPLOYMENT ERROR: Post Service failed to initialize infrastructure:', error);
    
    // 4. Fail Fast: Immediately close down the container if the connection fails
    process.exit(1);
  }
}

startServer();