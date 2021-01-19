import express, {json} from 'express';
import {validateInteraction} from 'slashy';
import {handleCommands} from './handleCommands';
import {inviteUrl} from '../util';
import {oauth2} from './oauth';
import path from 'path';
import {logger} from '..';

const PORT = global.config.slash_commands?.port || process.env.PORT || 8080;
const PUBLIC_KEY =
  global.config.slash_commands?.public_key || process.env.PUBLIC_KEY!;

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(json());

app.use((req, _res, next) => {
  logger.server(req.method, req.path);

  next();
});

if (global.config.slash_commands?.enabled) {
  logger.log('Slash commands endpoint enabled 🗸');

  app.post('/cmds', validateInteraction(PUBLIC_KEY), handleCommands);

  const inv = inviteUrl();

  if (inv) {
    app.get('/', (_req, res) => res.redirect(inv));
  }
}

if (global.config.oauth?.enabled) {
  logger.log('OAuth endpoint enabled 🗸');

  app.get('/auth/callback', oauth2);
}

app.get('/github', (_req, res) =>
  res.redirect('https://github.com/benricheson101/discord-status')
);

app.listen(PORT, () => {
  logger.info('Listening on port', PORT);
});
