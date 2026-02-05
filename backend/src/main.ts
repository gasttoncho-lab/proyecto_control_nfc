import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para permitir peticiones desde la app Android y web
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Validación de datos
  app.useGlobalPipes(new ValidationPipe());
  
  await app.listen(3000);
  console.log('🚀 Backend running on http://localhost:3000');
}
bootstrap();
