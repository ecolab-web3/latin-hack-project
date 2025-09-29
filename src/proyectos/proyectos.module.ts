import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosService } from './proyectos.service';
import { ProyectosController } from './proyectos.controller';
import { Proyecto } from './entities/proyecto.entity';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proyecto, CreditoToken])],
  controllers: [ProyectosController],
  providers: [ProyectosService],
})
export class ProyectosModule {}
