import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(CreditoToken)
    private readonly creditoTokenRepository: Repository<CreditoToken>,
  ) {}

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
