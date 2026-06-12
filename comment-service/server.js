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
app.use(helmet())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

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
  try {
    await connectToRabbitMq();

    await consumeEvent('post_deleted', consumedEvent)

    app.listen(PORT, () => {
      commentLogger.info(`COMMENT SERVICE is Running on PORT ${PORT}`)
    })
  } catch (error) {
    commentLogger.error('Error Corrured While Starting server', error)
  }
}

startServer()