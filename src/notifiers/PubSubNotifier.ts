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

  constructor () {
    this.clog = new Clog();

    if (!CONFIG.RABBITMQ_URL) {
      throw new Error('No RabbitMQ url found in env variables (expected RABBITMQ_URL to not be null)');
    }

    amqp.connect(CONFIG.RABBITMQ_URL, (error0, connection) => {
      if (error0) {
        throw error0;
      }

      connection.createChannel((error1, channel) => {
        if (error1) {
          throw error1;
        }

        this.channel = channel;
      });
    });
  }

  async notifyListeners(article: Article, medium: MediumDefinition): Promise<void> {
    const queue = 'opentitles_work';
    const payload = JSON.stringify({article, medium});

    if (!this.channel) {
      this.clog.log('Lost connection to RabbitMQ!', LOGLEVEL.WARN);
      return;
    }

    this.channel.assertQueue(queue, {
      durable: true
    });

    this.channel.sendToQueue(queue, Buffer.from(payload));
    this.clog.log(`Dispatched job for ${medium.name}:${article.articleID}`)
    return;
  }
}
