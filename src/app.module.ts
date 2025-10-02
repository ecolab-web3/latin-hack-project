import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosModule } from './proyectos/proyectos.module';
import { CreditoTokensModule } from './credito-tokens/credito-tokens.module';
import { AppController } from './app.controller';
import { BlockchainListenerModule } from './blockchain-listener/blockchain-listener.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true, // Permite escuchar patrones de eventos como 'proyecto.*'
    }),
    ConfigModule.forRoot({
      isGlobal: true, // Variables de entorno disponibles en toda la app
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: +configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true, // TypeORM cargará automáticamente las entidades de los módulos registrados
        // En desarrollo, `synchronize` crea/actualiza las tablas automáticamente.
        // En producción, debe ser `false` para usar migraciones y evitar la pérdida de datos.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    ProyectosModule, // Este módulo ahora contiene nuestro controlador y servicio
    CreditoTokensModule,
    BlockchainListenerModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
