import {verify} from 'noble-ed25519';
import {Request, Response, NextFunction} from 'express';

export function slashCmdAuth({PUBLIC_KEY}: {PUBLIC_KEY: string}) {
  return async function (req: Request, res: Response, next: NextFunction) {
    if (req.method !== 'POST') {
      next();
      return;
    }

    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];

    if (!signature || !timestamp) {
      return res.status(401).send('Unauthorized');
    }

    const hash = Buffer.concat([
      Buffer.from(timestamp as string, 'utf-8'),
      Buffer.from(JSON.stringify(req.body)),
    ]);

    const isSigned = await verify(signature as string, hash, PUBLIC_KEY);

    if (!isSigned) {
      return res.status(401).send('Unauthorized');
    }

    if (req.body.type === 1) {
      return res.json({type: 1});
    }

    next();
    return;
  };
}
