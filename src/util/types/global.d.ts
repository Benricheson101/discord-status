import {Config} from '../config';
import {Logger} from '../Logger';

declare global {
  namespace NodeJS {
    interface Global {
      config: Config;
      logger: Logger;
    }
  }
}
