import { Notifier } from './Notifier';
import * as CONFIG from '../config';

import { Clog, LOGLEVEL } from '@fdebijl/clog';
import amqp from 'amqplib/callback_api';

/**
 * Send a article and medium definition to a worker for title checking
 */
export class PubSubNotifier implements Notifier {
  private clog: Clog;
  private channel?: amqp.Channel;
  private queueName: string;

  constructor () {
    this.clog = new Clog();

    if (!CONFIG.RABBITMQ_URL) {
      throw new Error('No RabbitMQ url found in env variables (expected RABBITMQ_URL to not be null)');
    }

    if (!CONFIG.QUEUE_NAME) {
      throw new Error('No queue name found in env variables (expected QUEUE_NAME to not be null)');
    }

    this.queueName = CONFIG.QUEUE_NAME;

    amqp.connect(CONFIG.RABBITMQ_URL, (error0, connection) => {
      if (error0) {
        throw error0;
      }

      connection.createChannel((error1, channel) => {
        if (error1) {
          throw error1;
        }

        this.channel = channel;
        channel.assertQueue(this.queueName, {
          durable: true
        }, (err, queueInfo) => {
          if (err) {
            this.clog.log(`Could not connect to queue: ${err}`, LOGLEVEL.FATAL)
          } else {
            this.clog.log(`Connected succesfully to queue ${this.queueName} with ${queueInfo.messageCount} messages and ${queueInfo.consumerCount} consumers`)
          }
        });
      });
    });
  }

  async notifyListeners(article: Article, medium: MediumDefinition): Promise<void> {
    const payload = JSON.stringify({article, medium});

    if (!this.channel) {
      this.clog.log('Lost connection to RabbitMQ!', LOGLEVEL.WARN);
      return;
    }

    this.channel.assertQueue(this.queueName, {
      durable: true
    });

    this.channel.sendToQueue(this.queueName, Buffer.from(payload));
    //this.clog.log(`Dispatched job for ${medium.name}:${article.articleID}`, LOGLEVEL.DEBUG)
    return;
  }
}
