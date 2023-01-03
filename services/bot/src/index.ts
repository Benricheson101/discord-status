import {webcrypto} from 'node:crypto';
import {ServerResponse, createServer} from 'node:http';

import {
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v10';
import {PlatformAlgorithm, verify} from 'discord-verify/node';

import {Client} from 'discord-status';

const respondJSON = (
  res: ServerResponse,
  body: APIInteractionResponse,
  status = 200
) =>
  res
    .writeHead(status, {
      'Content-Type': 'application/json',
    })
    .end(JSON.stringify(body));

const main = async () => {
  const client = new Client();
  await client.loadCmds();

  const server = createServer((req, res) => {
    switch (req.url) {
      case '/i': {
        if (req.method !== 'POST') {
          res
            .writeHead(405, {'Content-Type': 'text/plain'})
            .end('Method Not Allowed');
          return;
        }

        const sig = req.headers['x-signature-ed25519'];
        const ts = req.headers['x-signature-timestamp'];

        if (!sig || !ts || Array.isArray(sig) || Array.isArray(ts)) {
          res.writeHead(400).end('Bad Request');
          return;
        }

        const data: string[] = [];
        req.on('data', d => data.push(d));
        req.on('end', async () => {
          const body = data.join('');
          if (!body) {
            res.writeHead(400).end('Bad Request');
            return;
          }

          const isValid = await verify(
            body,
            sig,
            ts,
            process.env.DISCORD_PUBLIC_KEY,
            webcrypto.subtle,
            PlatformAlgorithm.NewNode
          );

          if (!isValid) {
            res.writeHead(401).end('Unauthorized');
            return;
          }

          const interaction = JSON.parse(body) as APIInteraction;

          switch (interaction.type) {
            case InteractionType.Ping: {
              respondJSON(res, {
                type: InteractionResponseType.Pong,
              });

              return;
            }

            case InteractionType.ApplicationCommand: {
              interaction;
              switch (interaction.data.type) {
                case ApplicationCommandType.ChatInput: {
                  const cmd = client.cmds.get(interaction.data.name);
                  if (cmd) {
                    try {
                      console.log(
                        `User \`${
                          interaction.member?.user.id ||
                          interaction.user?.id ||
                          'unknown'
                        }\` used command \`${
                          interaction.data.name
                        }\` in guild \`${interaction.guild_id || 'DMs'}\``
                      );

                      const r = await cmd.run(
                        client,
                        interaction as APIChatInputApplicationCommandInteraction,
                        req,
                        res
                      );

                      if (r) {
                        if (r instanceof ServerResponse) {
                          r.end();
                          return;
                        } else {
                          respondJSON(res, r);
                          return;
                        }
                      }

                      return;
                    } catch (err) {
                      console.error(
                        `Chat input command \`${
                          interaction.data.name
                        }\` failed to run for user \`${
                          interaction?.member?.user.id ||
                          interaction.user?.id ||
                          'unknown'
                        }\` in guild \`${interaction.guild_id || 'DMs'}\`:`
                      );
                      console.error(err);
                    }
                  } else {
                    console.warn(
                      `User \`${
                        interaction.member?.user.id ||
                        interaction.user?.id ||
                        'unknown'
                      }\` used an unknown command in guild ${
                        interaction.guild_id || 'DMs'
                      }: \`${interaction.data.name}\``
                    );
                  }

                  break;
                }
              }
            }
          }
        });

        break;
      }

      default: {
        res.writeHead(404).end('Not Found');
        return;
      }
    }
  });

  server.listen({host: '0.0.0.0', port: 3000}, () => {
    console.log('Server listening on addr=http://0.0.0.0:3000');
  });
};

main().catch(console.error);

// @ts-expect-error bad but prisma dumb lol
BigInt.prototype.toJSON = function () {
  return this.toString();
};
