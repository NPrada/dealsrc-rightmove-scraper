import Fastify, { FastifyHttp2SecureOptions } from "fastify";
import http from "http";
import {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyTypeProviderDefault,
  RawServerDefault,
} from "fastify";
import { env } from "../env";

export type FastifyServer = FastifyInstance<
  RawServerDefault,
  http.IncomingMessage,
  http.ServerResponse<http.IncomingMessage>,
  FastifyBaseLogger,
  FastifyTypeProviderDefault
>;

const envToLogger = {
  development: {
    level: "debug",
    transport: {
      level: "debug",
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },

  production: {
    level: "debug",
    transport: {
      targets: [
        {
          level: "info",
          target: "pino-pretty",
          options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
        // {
        //   target: "pino/file",
        //   level: "debug",
        //   options: { destination: "./" + logFile },
        //   // file: "./" + logFile,
        // },
      ],
    },
  },
} as const;

export const server = Fastify({
  logger: envToLogger[env.NODE_ENV as keyof typeof envToLogger],
});

export const logger = server.log;
