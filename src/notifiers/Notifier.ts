export interface Notifier {
  notifyListeners(article: Article, medium: MediumDefinition): Promise<void>;
}