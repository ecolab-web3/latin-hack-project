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
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { ProyectosService } from './proyectos.service';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { Proyecto } from './entities/proyecto.entity';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Proyectos')
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Post()
  @UseGuards(ApiKeyGuard) // <-- ¡Endpoint protegido!
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Registrar un nuevo proyecto para indexar' })
  @ApiResponse({
    status: 201,
    description: 'El proyecto ha sido creado exitosamente.',
    type: Proyecto,
  })
  @ApiResponse({
    status: 401,
    description: 'API Key inválida o no proporcionada.',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un proyecto con esa dirección de contrato.',
  })
  create(@Body() createProyectoDto: CreateProyectoDto): Promise<Proyecto> {
    // Gracias al ValidationPipe, si el body no cumple con el DTO,
    // la petición ni siquiera llegará a este método.
    return this.proyectosService.create(createProyectoDto);
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard) // <-- ¡Endpoint protegido!
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Actualizar un proyecto existente' })
  @ApiResponse({
    status: 200,
    description: 'Proyecto actualizado.',
    type: Proyecto,
  })
  @ApiResponse({
    status: 401,
    description: 'API Key inválida o no proporcionada.',
  })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProyectoDto: UpdateProyectoDto,
  ): Promise<Proyecto> {
    return this.proyectosService.update(id, updateProyectoDto);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard) // <-- ¡Endpoint protegido!
  @ApiSecurity('ApiKeyAuth')
  @ApiOperation({ summary: 'Eliminar un proyecto' })
  @ApiResponse({ status: 204, description: 'Proyecto eliminado exitosamente.' })
  @ApiResponse({
    status: 401,
    description: 'API Key inválida o no proporcionada.',
  })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado.' })
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un 204 No Content en lugar de 200 OK
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.proyectosService.remove(id);
  }

  @Get('wallet/:address')
  @ApiOperation({ summary: 'Obtener todos los créditos de una billetera' })
  @ApiParam({
    name: 'address',
    description: 'La dirección de la billetera (case-insensitive).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de créditos encontrados.',
    type: [CreditoToken],
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron tokens para la wallet.',
  })
  findTokensByWallet(
    @Param('address') address: string,
  ): Promise<CreditoToken[]> {
    // La consulta es instantánea gracias a la base de datos indexada.
    return this.proyectosService.findTokensByWallet(address);
  }
}
