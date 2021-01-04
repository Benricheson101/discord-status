import 'dotenv/config';
import './server';
import './updates';

import {connect} from 'mongoose';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import timezone from 'dayjs/plugin/timezone';

connect(process.env.MONGODB_URL!, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(console.error);

dayjs.extend(advancedFormat);
dayjs.extend(timezone);

// TODO: logger
// TODO: yaml config
//   TODO: make less discord-centered and easy to configure for any status page
// TODO: support one webhook/no mongo + oauth
// TODO: oauth pages:
//   TODO: success
//   TODO: error
// TODO: commands:
//   TODO: announce
//   TODO: stop
//   TODO: start
