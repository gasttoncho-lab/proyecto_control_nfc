import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

process.env.TZ ??= 'America/Argentina/Buenos_Aires';

function buildCorsConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logger = new Logger('Bootstrap');

  if (!isProduction) {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    logger.log('CORS allowed origins: localhost/127.0.0.1 (dynamic ports)');
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || localhostPattern.test(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: false,
    };
  }

  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  logger.log(`CORS allowed origins: ${envOrigins.length > 0 ? envOrigins.join(', ') : '(none)'}`);

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || envOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(buildCorsConfig());

  app.useGlobalPipes(new ValidationPipe());

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
