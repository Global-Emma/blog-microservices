require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors')
const mongoose = require('mongoose');
const Redis = require('ioredis')
const {RedisStore} = require('rate-limit-redis')
const {rateLimit} = require('express-rate-limit')
const authLogger = require('./src/utils/authLogger');
const authRoutes = require('./src/routes/authRoute')
const cookieParser = require('cookie-parser');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

const PORT = process.env.PORT || 4000

app.use(express.json())
app.use(helmet())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(cookieParser())

mongoose.connect(process.env.MONGO_DB_URL).then(()=>{
  return authLogger.info('Connected To MongoDB Successfully')
}).catch((error)=>{
  return authLogger.error('Error Occured While Connecting To MONGODB', error)
})

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on('connect', ()=>{
  authLogger.info('Connected To Redis Successfully')
})

redisClient.on('error', (error)=>{
  authLogger.error('Error Occured While Connecting to redis', error)
})

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res)=>{
    authLogger.warn(`API Request Limit has Been Exceeded For IP: ${req.ip}`)
    return res.status(429).json({
      success: false,
      message: 'Request Has Exceeded Limit'
    })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
})

app.use((req, res, next)=>{
  authLogger.info(`Received a ${req.method} assigned to ${req.url}`)
  authLogger.info(`With Request Body ${req.body}`)
  next()
})

app.use('/api/auth', limiter)

// AUTH ROUTE
app.use('/api/auth', authRoutes)

// error Handler
app.use(errorHandler)

app.listen(PORT, ()=>{
  authLogger.info(`AUTH SERVICE is Running on PORT ${PORT}`)
})