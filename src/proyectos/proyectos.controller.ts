import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';

@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

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
