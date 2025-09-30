import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { Proyecto } from './entities/proyecto.entity';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly proyectoRepository: Repository<Proyecto>,
    @InjectRepository(CreditoToken)
    private readonly creditoTokenRepository: Repository<CreditoToken>,
  ) {}

  async create(createProyectoDto: CreateProyectoDto): Promise<Proyecto> {
    const existingProject = await this.proyectoRepository.findOne({
      where: { contractAddress: createProyectoDto.contractAddress },
    });

    if (existingProject) {
      throw new ConflictException(
        `Ya existe un proyecto con la dirección de contrato ${createProyectoDto.contractAddress}`,
      );
    }

    const nuevoProyecto = this.proyectoRepository.create(createProyectoDto);
    return this.proyectoRepository.save(nuevoProyecto);
  }

  async update(id: string, updateProyectoDto: UpdateProyectoDto): Promise<Proyecto> {
    // `preload` busca el proyecto por ID y luego fusiona los nuevos datos del DTO.
    // Si no encuentra el proyecto, devuelve undefined.
    const proyecto = await this.proyectoRepository.preload({
      id,
      ...updateProyectoDto,
    });

    if (!proyecto) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    }

    return this.proyectoRepository.save(proyecto);
  }

  async remove(id: string): Promise<void> {
    const proyecto = await this.proyectoRepository.findOneBy({ id });

    if (!proyecto) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    }

    // TypeORM se encargará de las relaciones si están configuradas con `onDelete: 'CASCADE'`
    await this.proyectoRepository.remove(proyecto);
  }

  /**
   * Encuentra todos los tokens de crédito poseídos por una dirección de billetera específica.
   * @param address La dirección de la billetera a consultar.
   * @returns Una lista de tokens de crédito con la información del proyecto relacionado.
   */
  async findTokensByWallet(address: string): Promise<CreditoToken[]> {
    const tokens = await this.creditoTokenRepository.find({
      where: { ownerWallet: address },
      relations: ['proyecto'], // Carga la entidad 'Proyecto' relacionada
    });

    if (!tokens || tokens.length === 0) {
      throw new NotFoundException(
        `No se encontraron tokens para la wallet ${address}`,
      );
    }

    return tokens;
  }
}
