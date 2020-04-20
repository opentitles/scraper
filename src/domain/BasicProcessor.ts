import { Output } from 'rss-parser';

import { Processor } from './Processor';
import { ExtendedOutput } from './ExtendedOutput';
import { ConfirmedItem } from './ConfirmedItem';

export abstract class BasicProcessor implements Processor {
  // Input
  protected inputFeed: Output;
  protected inputMedium: MediumDefinition;
  protected inputFeedName: string;
  protected inputCountryCode: string;

  // Output
  protected outputFeedItems: ConfirmedItem[] = [];

  constructor(feed: Output, medium: MediumDefinition, feedname: string, countrycode: string) {
    this.inputFeed = feed;
    this.inputMedium = medium;
    this.inputFeedName = feedname;
    this.inputCountryCode = countrycode;
  }

  toExtendedOutput(): Promise<ExtendedOutput> {
    throw new Error(`Can not call stub function 'toExtendedOutput' on abstract class 'BasicProcessor'`);
  }
}