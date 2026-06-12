const amqp = require('amqplib');
const mediaLogger = require('./mediaLogger');

let channel = null;
let connection = null

const EXCHANGE_NAME = 'blog_events'

const connectToRabbitMq = async () => {
  try {
    connection = await amqp.connect(process.env.RABBIT_MQ);

    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });

    mediaLogger.info('Connection To RabbitMq Successful')
    return channel
  } catch (error) {
    mediaLogger('RabbitMq Connection Failed', error);
  }
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
    mediaLogger.info('Event Received in media service:', content)
    callback(content, routingKey)
    channel.ack(msg);
  })

  mediaLogger.info(`Subscribed to Event: ${routingKey}`)

}

module.exports = {
  connectToRabbitMq,
  consumeEvent
}