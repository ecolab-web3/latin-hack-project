import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { Proyecto } from './entities/proyecto.entity';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Post()
  @UseGuards(ApiKeyGuard) // <-- ¡Endpoint protegido!
  create(@Body() createProyectoDto: CreateProyectoDto): Promise<Proyecto> {
    // Gracias al ValidationPipe, si el body no cumple con el DTO,
    // la petición ni siquiera llegará a este método.
    return this.proyectosService.create(createProyectoDto);
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard) // <-- ¡Endpoint protegido!
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProyectoDto: UpdateProyectoDto,
  ): Promise<Proyecto> {
    return this.proyectosService.update(id, updateProyectoDto);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard) // <-- ¡Endpoint protegido!
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un 204 No Content en lugar de 200 OK
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.proyectosService.remove(id);
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
