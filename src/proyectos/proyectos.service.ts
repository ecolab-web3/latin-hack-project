import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
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
