require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors')
const mongoose = require('mongoose');
const Redis = require('ioredis');
const commentRoute = require('./src/routes/commentRoutes')
const commentLogger = require('./src/utils/commentLogger');
const errorHandler = require('./src/middleware/errorHandler');
const { connectToRabbitMq, consumeEvent } = require('./src/utils/rabbitmq');
const { consumedEvent } = require('./src/utils/consumedEvent')

const app = express();

const PORT = process.env.PORT || 7000

app.use(express.json())
app.use(cors({
  origin: ['https://freeblogweb.vercel.app', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(helmet())

mongoose.connect(process.env.MONGO_DB_URL).then(() => {
  return commentLogger.info('Connected To MongoDB Successfully')
}).catch((error) => {
  return commentLogger.error('Error Occured While Connecting To MONGODB', error)
})

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on('connect', () => {
  commentLogger.info('Connected To Redis Successfully')
})

redisClient.on('error', (error) => {
  commentLogger.error('Error Occured While Connecting to redis', error)
})


app.use((req, res, next) => {
  commentLogger.info(`Received a ${req.method} assigned to ${req.url}`)
  commentLogger.info(`With Request Body ${req.body}`)
  next()
})

// COMMENT ROUTE
app.use('/api/comments', commentRoute)

// error Handler
app.use(errorHandler)

async function startServer () {
  // 1. Bind to the port IMMEDIATELY so Render can see the service is online
  const server = app.listen(PORT, '0.0.0.0', () => {
    commentLogger.info(`COMMENT SERVICE is Running on PORT ${PORT}`)
  })

  try {
    // 2. Attempt downstream infrastructure connections asynchronously
    await connectToRabbitMq();
    await consumeEvent('post_deleted', consumedEvent);
    commentLogger.info('RabbitMQ connection and event consumers initialized.');
    
  } catch (error) {
    commentLogger.error('CRITICAL DEPLOYMENT ERROR: Microservice infrastructure failed to initialize:', error);
    
    // 3. Fail Fast: Force the process to exit immediately if infrastructure is broken.
    // This stops Render from hanging for 15 minutes and tells you there is a configuration issue right away.
    process.exit(1);
  }
}

startServer();