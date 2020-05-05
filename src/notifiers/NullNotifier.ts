import { Notifier } from "./Notifier";
import { Clog, LOGLEVEL } from '@fdebijl/clog';

/**
 * Debugging notifier that does nothing with the given article but log it
 */
export class NullNotifier implements Notifier {
  private clog: Clog;

  constructor () {
    this.clog = new Clog();
  }

  async notifyListeners(article: Article): Promise<void> {
    this.clog.log(article, LOGLEVEL.DEBUG);
    return;
  }
}