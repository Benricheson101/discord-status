FROM node:lts-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl curl
RUN npm install -g pnpm

RUN curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-amd64 && chmod +x /usr/local/bin/dbmate

COPY ./services/commands/package.json ./services/commands/pnpm-lock.yaml ./
RUN pnpm install

COPY ./services/commands/. ./
COPY ./db ./db
RUN pnpm build

EXPOSE 3000

CMD ["node", "./build/src/index.js"]
