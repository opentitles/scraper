import moment from 'moment';
import * as CONFIG from '../config';

export const clog = (message: string | object): void => {
  if (CONFIG.LOG_OUT) {
    console.log(`${moment().format('DD/MM/Y HH:mm:ss')} - ${message}`);
  }
};