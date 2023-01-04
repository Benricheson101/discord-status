import {IncomingMessage, ServerResponse} from 'node:http';

import {
  APIApplicationCommandOption,
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

import {Client} from './client';

export abstract class Command
  implements RESTPostAPIChatInputApplicationCommandsJSONBody
{
  abstract name: string;
  abstract description: string;
  options: APIApplicationCommandOption[] = [];

  abstract run(
    client: Client,
    interaction: APIChatInputApplicationCommandInteraction,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<ServerResponse | APIInteractionResponse | void>;
}
