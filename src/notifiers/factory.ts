import { Notifier } from './Notifier';
import * as CONFIG from '../config';
import { NullNotifier } from './NullNotifier';
import { WebhookNotifier } from './WebhookNotifier';
import { PubSubNotifier } from './PubSubNotifier';

export const NotifierFactory = (): Notifier => {
  switch (CONFIG.NOTIFIER) {
    case 'null': {
      return new NullNotifier();
    }
    case 'webhook': {
      return new WebhookNotifier();
    }
    case 'pubsub':
    default: {
      return new PubSubNotifier();
    }
  }
}
