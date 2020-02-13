import dotenv from 'dotenv';

export const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  dotenv.config();
}

export const {
  MONGO_URL = 'mongodb://10.10.10.15:27017/opentitles',
  PORT = 8083,
  LOG_OUT = true
} = process.env;