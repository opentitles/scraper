import { Notifier } from "./Notifier";
import { Clog, LOGLEVEL } from '@fdebijl/clog';

export class PubSubNotifier implements Notifier {
  private clog: Clog;

  constructor () {
    this.clog = new Clog();
  }

  async notifyListeners(article: Article): Promise<void> {
    this.clog.log(article, LOGLEVEL.DEBUG);
    return;
  }
}
