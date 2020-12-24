import express, {json} from 'express';
import {slashCmdAuth} from './auth';
import {handleCommands} from './handleCommands';
import {INVITE_URL} from '../util';
import {oauth2} from './oauth';
import path from 'path';

const PORT = 8080;
const PUBLIC_KEY = process.env.PUBLIC_KEY!;

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(json());
app.use('/cmds', slashCmdAuth({PUBLIC_KEY}));

app.get('/', (_req, res) => res.redirect(INVITE_URL));
app.post('/cmds', handleCommands);
app.get('/auth/callback', oauth2);

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
