import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListenerService } from './listener.service';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';

@Module({
  imports: [
    // Importamos las entidades para que el servicio pueda usar sus repositorios
    TypeOrmModule.forFeature([Proyecto, CreditoToken]),
  ],
  // El ConfigModule es global, por lo que no es necesario importarlo aquí
  providers: [ListenerService],
  exports: [ListenerService], // Exportamos el servicio si otros módulos lo necesitan
})
export class BlockchainListenerModule {}