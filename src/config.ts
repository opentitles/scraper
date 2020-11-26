import dotenv from 'dotenv';

export const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  dotenv.config();
}

export const {
  RABBITMQ_URL,
  MONGO_URL,
  MONGO_DB_PROD,
  MONGO_DB_TEST,
  PORT,
  LOGLEVEL,
  QUEUE_NAME
} = process.env;