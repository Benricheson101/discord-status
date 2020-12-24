import 'dotenv/config';
import './server';

import {connect} from 'mongoose';

connect(process.env.MONGODB_URL!, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(console.error);
