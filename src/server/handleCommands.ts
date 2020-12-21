import {Request, Response} from 'express';
import {Interaction} from '../util/Interaction';

export async function handleCommands(
  req: Request<{}, {}, Interaction>,
  res: Response
) {
  const {
    data,
    data: {name},
  } = req.body;

  switch (name) {
    case 'setup':
      console.log('setup command :D');
      break;
  }

  return res.status(200).send('OK');
}
