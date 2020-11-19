import puppeteer from 'puppeteer';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { cookieClicker } from './cookieClicker';
import { findTitleElement } from './findTitleElement';
import * as CONFIG from '../config';

const clog = new Clog();

export const titleFetch = async (article: Article, medium: MediumDefinition): Promise<string> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(CONFIG.USER_AGENT);

  const link: string = article.link || article.guid;
  await page.goto(link);

  // Bypass any cookiewalls
  await cookieClicker(page, medium);

  // Verify title is present on page and matches that from the RSS feed
  const titleElement = await findTitleElement(medium, page);
  const title = await page.evaluate(titleElement => titleElement.textContent, titleElement);

  // Remove whitespace, linebreaks and carriage returns
  title.trim();
  title.replace(/\n\r/gi, '');

  clog.log(`Got title <<${title}>> on ${article.org}:${article.articleID}`, LOGLEVEL.DEBUG);

  await browser.close();
  return title;
}