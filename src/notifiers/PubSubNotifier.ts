import { Notifier } from './Notifier';
import * as CONFIG from '../config';

import { Clog, LOGLEVEL } from '@fdebijl/clog';
import amqp from 'amqplib/callback_api';

export class PubSubNotifier implements Notifier {
  private clog: Clog;
  private channel?: amqp.Channel;

  constructor () {
    this.clog = new Clog();
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

  async notifyListeners(article: Article): Promise<void> {
    const exchange = 'opentitles';
    const key = `${article.lang}.${article.org}`;
    const payload = JSON.stringify(article);

    if (!this.channel) {
      this.clog.log('Lost connection to RabbitMQ!', LOGLEVEL.WARN);
      return;
    }

    this.channel.assertExchange(exchange, 'topic', {
      durable: true
    });

    this.channel.publish(exchange, key, Buffer.from(payload));
    this.clog.log(`Dispatched title change to ${key} queue`, LOGLEVEL.DEBUG);
    return;
  }
}
