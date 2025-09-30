import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { Proyecto } from './entities/proyecto.entity';

@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Post()
  create(@Body() createProyectoDto: CreateProyectoDto): Promise<Proyecto> {
    // Gracias al ValidationPipe, si el body no cumple con el DTO,
    // la petición ni siquiera llegará a este método.
    return this.proyectosService.create(createProyectoDto);
  }

  /**
   * Endpoint para obtener todos los tokens de una billetera.
   * @param address La dirección de la billetera (case-insensitive).
   */
  @Get('wallet/:address')
  findTokensByWallet(
    @Param('address') address: string,
  ): Promise<CreditoToken[]> {
    // La consulta es instantánea gracias a la base de datos indexada.
    return this.proyectosService.findTokensByWallet(address);
  }
}
