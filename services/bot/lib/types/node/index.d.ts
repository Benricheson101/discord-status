import '@types/node';

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      DISCORD_TOKEN: string;
      DISCORD_PUBLIC_KEY: string;
      DATABASE_URL: string;
    }
  }
}
