export interface Notifier {
  notifyListeners(article: Article): Promise<void>;
}