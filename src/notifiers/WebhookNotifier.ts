import { Clog, LOGLEVEL } from '@fdebijl/clog';
import { Notifier } from './Notifier';
import * as CONFIG from '../config';

export class WebhookNotifier implements Notifier {
  private clog: Clog;

  private listeners: Listener[];

  constructor () {
    this.clog = new Clog();

    try {
      this.listeners = JSON.parse(CONFIG.WEBHOOK_LISTENERS);
    } catch (e) {
      this.clog.log(`Couldn't load webhook listeners from env: ${JSON.stringify(e)}`, LOGLEVEL.WARN);
      this.listeners = [];
    }
  }

  /**
   * Notify all defined listeners that the title for an article has changed.
   * @param {Article} article The article object.
   */
  async notifyListeners(article: Article): Promise<void> {
    return new Promise((resolve) => {
      if (!article.org || !article.articleID) {
        resolve();
      }

      if (this.listeners.length === 0) {
        resolve();
      }

      this.listeners.forEach((listener) => {
        if (listener.interestedOrgs.includes(article.org)) {
          fetch(listener.webhookuri, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(article),
          })
          .then((res) => {
            if (res.status < 200 || res.status >= 400) {
              this.clog.log(`Could not reach ${listener.name} when issuing webhook (${res.status}: ${res.statusText})`, LOGLEVEL.WARN);
            } else {
              this.clog.log(`Reached ${listener.name} for [${article.org}:${article.articleID}].`, LOGLEVEL.DEBUG);
            }
          })
          .catch((err) => {
            this.clog.log(`Could not reach ${listener.name} when issuing webhook: ${err}`, LOGLEVEL.WARN);
          });
        }
      });

      return;
    });
  }
}
