const amqp = require('amqplib');
const postLogger = require('./postLogger');

let channel = null;
let connection = null

const EXCHANGE_NAME = 'blog_events'

const connectToRabbitMq = async () => {
  try {
    connection = await amqp.connect(process.env.RABBIT_MQ);

    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });

    postLogger.info('Connection To RabbitMq Successful')
    return channel
  } catch (error) {
    postLogger.error('RabbitMq Connection Failed', error);
  }
}

const publishEvent = async (routingKey, message) => {
  console.log(`Publishing event to RabbitMQ... : ${routingKey}, ${JSON.stringify(message)}`);
  if (!channel) {
    await connectToRabbitMq()
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  )

  postLogger.info(`Published Events to RabbitMq: ${routingKey}, ${JSON.stringify(message)}`);
}

const consumeEvent = async (routingKey, callback) => {
  console.log('Subscribing To RabbitMq Event Successful', routingKey)

  if (!channel) {
    await connectToRabbitMq()
  }

  const que = await channel.assertQueue('', { exclusive: true })

  await channel.bindQueue(que.queue, EXCHANGE_NAME, routingKey);

  channel.consume(que.queue, (msg) => {
    const content = JSON.parse(msg.content.toString())
    // const routingKey = msg.fields.routingKey
    postLogger.info('Event Received in post service:', content)
    callback(content, routingKey)
    channel.ack(msg);
  })

  postLogger.info(`Subscribed to Event: ${routingKey}`)

}

module.exports = {
  connectToRabbitMq,
  publishEvent,
  consumeEvent
}