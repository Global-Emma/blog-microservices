require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors')
const Redis = require('ioredis')
const { RedisStore } = require('rate-limit-redis')
const { rateLimit } = require('express-rate-limit')
const apiLogger = require('./src/utils/apiLogger');
const proxy = require('express-http-proxy')
const cookieParser = require('cookie-parser');
const errorHandler = require('./src/middleware/errorHandler');
const authValidation = require('./middleware/authMiddleware');

const app = express();

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors({
  origin: ['https://freeblogweb.vercel.app', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.options('*', cors());

app.use(helmet())

app.use(cookieParser())

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on('connect', () => {
  apiLogger.info('Connected To Redis Successfully')
})

redisClient.on('error', (error) => {
  apiLogger.error('Error Occured While Connecting to redis', error)
})

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    apiLogger.warn(`API Request Limit has Been Exceeded For IP: ${req.ip}`)
    return res.status(429).json({
      success: false,
      message: 'Request Has Eceeded Limit'
    })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
})

app.use((req, res, next) => {
  apiLogger.info(`Received a ${req.method} assigned to ${req.url}`)
  apiLogger.info(`With Request Body ${req.body}`)
  next()
})

// Proxy Options
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, '/api')
  },

  proxyErrorHandler: (res, err, next) => {
    apiLogger.error('Proxy Error Occured', err && err.message ? err.message : err);
    return res.status(500).json({
      message: 'Proxy Error Occured',
      error: err?.message || err
    })
  }
}

// Proxy For AUTH-SERVICE
app.use('/v1/auth', authValidation, proxy(process.env.AUTH_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    if (srcReq.userInfo) {
      proxyReqOpts.headers['x-user-id'] = srcReq.userInfo.userId
      proxyReqOpts.headers['x-role'] = srcReq.userInfo.role
    }
    return proxyReqOpts;
  },

  userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
    apiLogger.info(`Response Received From Identity Service with Status Code: ${proxyRes.statusCode}`)
    return proxyResData
  }
}))

// Proxy for MEDIA-SERVICE
app.use('/v1/media', authValidation, proxy(process.env.MEDIA_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.userInfo) {
      proxyReqOpts.headers['x-user-id'] = srcReq.userInfo.userId
      proxyReqOpts.headers['x-role'] = srcReq.userInfo.role
    }
    return proxyReqOpts
  },

  userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
    apiLogger.info(`Response Received From Media Service with Status Code: ${proxyRes.statusCode}`)
    return proxyResData
  },

  parseReqBody: false

}))

// Proxy For POST-SERVICE
app.use('/v1/posts', authValidation, proxy(process.env.POST_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    if (srcReq.userInfo) {
      proxyReqOpts.headers['x-user-id'] = srcReq.userInfo.userId
      proxyReqOpts.headers['x-role'] = srcReq.userInfo.role
    }
    return proxyReqOpts;
  },

  userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
    apiLogger.info(`Response Received From Post Service with Status Code: ${proxyRes.statusCode}`)
    return proxyResData
  },

}))

// Proxy For COMMENT-SERVICE
app.use('/v1/comments', authValidation, proxy(process.env.COMMENT_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    if (srcReq.userInfo) {
      proxyReqOpts.headers['x-user-id'] = srcReq.userInfo.userId
      proxyReqOpts.headers['x-role'] = srcReq.userInfo.role
    }
    return proxyReqOpts;
  },

  userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
    apiLogger.info(`Response Received From Comment Service with Status Code: ${proxyRes.statusCode}`)
    return proxyResData
  },

}))


app.use('/v1/auth', limiter)

// error Handler
app.use(errorHandler)

app.listen(PORT, () => {
  apiLogger.info(`API GATEWAY is Running on PORT ${PORT}`)
  apiLogger.info(`AUTH SERVICE is Running on ${process.env.AUTH_SERVICE_URL}`)
  apiLogger.info(`MEDIA SERVICE is Running on ${process.env.MEDIA_SERVICE_URL}`)
  apiLogger.info(`POST SERVICE is Running on ${process.env.POST_SERVICE_URL}`)
  apiLogger.info(`COMMENT SERVICE is Running on ${process.env.COMMENT_SERVICE_URL}`)
})

// Unhandled Promise Rejection
process.on('unhandledRejection', (promise, reason) => {
  apiLogger.error('Unhandled rejection at', { promise, reason });
});