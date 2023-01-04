import {
  RESTPutAPIApplicationCommandsResult,
  Routes,
} from 'discord-api-types/v10';

import {Client} from 'discord-status';

const main = async () => {
  const CLIENT_ID = Buffer.from(
    process.env.DISCORD_TOKEN.split('.')[0],
    'base64'
  ).toString();

  const client = new Client();
  await client.loadCmds();

  const cmds = [...client.cmds.values()];

  const res = (await client.rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: cmds,
  })) as RESTPutAPIApplicationCommandsResult;

  console.dir(res, {depth: null});
};

main().catch(console.error);
