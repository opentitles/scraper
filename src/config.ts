import dotenv from 'dotenv';

export const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  dotenv.config();
}

export const {
  RABBITMQ_URL = 'amqp://127.0.0.1',
  MONGO_URL = 'mongodb://127.0.0.1:27017',
  MONGO_DB_PROD = 'opentitles',
  MONGO_DB_TEST = 'opentitlestest',
  PORT = 8083,
  NOTIFIER = 'pubsub',
  WEBHOOK_LISTENERS = '[]'
} = process.env;
