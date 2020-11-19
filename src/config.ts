import dotenv from 'dotenv';

export const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  dotenv.config();
}

export const {
  RABBITMQ_URL = 'amqp://10.10.10.15',
  MONGO_URL = 'mongodb://10.10.10.15:7071,10.10.10.16:7072,10.10.10.17:7073/?replicaSet=archer&readPreference=primary&appname=OpenTitles%20Scraper',
  MONGO_DB_PROD = 'opentitles',
  MONGO_DB_TEST = 'opentitlestest',
  PORT = 8083,
  LOGLEVEL = 0,
  USER_AGENT = 'GoogleBot'
} = process.env;