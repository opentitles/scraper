declare type Listener = {
  /* name by which the listener is identified */
  name: string;
  /* organisations for which title change should be send to this listener */
  interestedOrgs: string[];
  /* URI where the listener can be reached with the payload */
  webhookuri: string;
}

declare type MediaDefinition = {
  feeds: FeedList;
}

declare type FeedList = {
  [key: string]: MediumDefinition[];
}

declare type MediumDefinition = {
  name: string;
  prefix: string;
  suffix: string;
  feeds: string[];
  id_container: 'link' | 'guid';
  id_mask: string;
  page_id_location: string;
  page_id_query: string;
  match_domains: string[];
  title_query: string;
}

declare type Article = {
  _id?: string;
  org: string;
  articleID: string;
  feedtitle: string;
  sourcefeed: string;
  lang: string;
  link: string;
  guid: string;
  titles: Title[];
  first_seen: string;
  pub_date: string;
}

declare type Title = {
  title: string;
  datetime: string;
  timestamp: number;
}
