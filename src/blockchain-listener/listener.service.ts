import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers, Contract, JsonRpcProvider, EventLog } from 'ethers';
import { DataSource, Repository } from 'typeorm';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';

@Injectable()
export class ListenerService implements OnModuleInit {
  private readonly logger = new Logger(ListenerService.name);
  private provider: JsonRpcProvider;
  private listeningContracts: Map<string, Contract> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(Proyecto)
    private proyectoRepository: Repository<Proyecto>,
    @InjectRepository(CreditoToken)
    private creditoTokenRepository: Repository<CreditoToken>,
    private dataSource: DataSource, // Inyectamos DataSource para transacciones
  ) {
    // 1. Configuración de Ethers.js: Conexión a la blockchain
    const providerUrl = this.configService.get<string>('JSON_RPC_URL');
    if (!providerUrl) {
      throw new Error('La variable de entorno JSON_RPC_URL no está definida.');
    }
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.logger.log(`Conectado al nodo RPC en ${providerUrl}`);
  }

  /**
   * Hook de NestJS que se ejecuta cuando el módulo ha sido inicializado.
   */
  async onModuleInit() {
    this.logger.log('Iniciando la escucha de eventos de los contratos...');
    await this.startListeningToAllProjects();

    // Opcional: Verificar nuevos proyectos cada 5 minutos
    setInterval(() => {
      this.logger.log('Buscando nuevos proyectos para monitorear...');
      this.startListeningToAllProjects();
    }, 300000);
  }

  /**
   * Obtiene todos los proyectos de la base de datos y comienza a escuchar
   * los eventos de sus respectivos contratos.
   */
  private async startListeningToAllProjects() {
    const proyectos = await this.proyectoRepository.find();
    if (proyectos.length === 0) {
      this.logger.warn(
        'No hay proyectos en la base de datos para escuchar eventos.',
      );
      return;
    }

    for (const proyecto of proyectos) {
      // Solo iniciamos la escucha si no lo estamos haciendo ya
      if (!this.listeningContracts.has(proyecto.contractAddress)) {
        // Ahora pasamos el ABI específico de cada proyecto
        this.startListeningToContract(proyecto, proyecto.abi);
      }
    }
  }

  /**
   * Inicia la escucha de eventos para un contrato específico.
   * @param proyecto El proyecto al que pertenece el contrato.
   * @param abi El ABI del contrato.
   */
  private startListeningToContract(proyecto: Proyecto, abi: any[]) {
    const contract = new Contract(proyecto.contractAddress, abi, this.provider);
    this.listeningContracts.set(proyecto.contractAddress, contract); // Registramos el contrato
    this.logger.log(
      `Escuchando eventos del contrato ${proyecto.nombre} en ${proyecto.contractAddress}`,
    );

    // 2. Lógica de Suscripción: Escuchamos el evento 'TransferSingle' de ERC-1155
    // Este evento se emite tanto en acuñaciones (from = address(0)) como en transferencias.
    contract.on(
      'TransferSingle',
      async (operator, from, to, id, value, event) => {
        this.logger.log(
          `Evento 'TransferSingle' detectado en el contrato ${proyecto.nombre}`,
        );
        this.logger.log(`  - Token ID: ${id.toString()}`);
        this.logger.log(`  - Cantidad: ${ethers.formatUnits(value, 2)}`); // Asumiendo 2 decimales

        // 3. Lógica de registro en la base de datos
        await this.handleTokenTransfer(proyecto, from, to, id, value);
      },
    );
  }

  /**
   * Procesa el evento de transferencia y actualiza la base de datos.
   * @param proyecto El proyecto asociado al evento.
   * @param fromWallet La wallet de origen.
   * @param toWallet La nueva wallet propietaria.
   * @param tokenId El ID del token.
   * @param cantidad La cantidad de créditos transferidos.
   */
  private async handleTokenTransfer(
    proyecto: Proyecto,
    fromWallet: string,
    toWallet: string,
    tokenId: bigint,
    cantidad: bigint,
  ) {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const cantidadFloat = parseFloat(ethers.formatUnits(cantidad, 2)); // Asumiendo 2 decimales

    // Usamos un QueryRunner para manejar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Caso 1: Acuñación (de dirección cero a una wallet)
      if (fromWallet === ZERO_ADDRESS) {
        this.logger.log(`Procesando acuñación para el token ${tokenId}.`);
        let credito = await queryRunner.manager.findOne(CreditoToken, {
          where: {
            tokenId: Number(tokenId),
            ownerWallet: toWallet,
            proyecto: { id: proyecto.id },
          },
        });

        if (credito) {
          credito.cantidad = Number(credito.cantidad) + cantidadFloat;
        } else {
          credito = queryRunner.manager.create(CreditoToken, {
            tokenId: Number(tokenId),
            ownerWallet: toWallet,
            cantidad: cantidadFloat,
            proyecto: proyecto,
          });
        }
        await queryRunner.manager.save(credito);
      }

      // Caso 2: Transferencia (de una wallet a otra)
      if (fromWallet !== ZERO_ADDRESS && toWallet !== ZERO_ADDRESS) {
        this.logger.log(`Procesando transferencia para el token ${tokenId}.`);
        const fromCredito = await queryRunner.manager.findOne(CreditoToken, {
          where: {
            tokenId: Number(tokenId),
            ownerWallet: fromWallet,
            proyecto: { id: proyecto.id },
          },
        });

        // Debitar del remitente
        if (fromCredito && fromCredito.cantidad >= cantidadFloat) {
          fromCredito.cantidad -= cantidadFloat;
          // Si la cantidad es 0 o menos, podríamos eliminar el registro
          if (fromCredito.cantidad <= 0) {
            await queryRunner.manager.remove(fromCredito);
          } else {
            await queryRunner.manager.save(fromCredito);
          }
        } else {
          // Si no tiene fondos suficientes, lanzamos un error para revertir la transacción
          throw new Error(
            `Fondos insuficientes para la transferencia desde ${fromWallet}.`,
          );
        }

        // Acreditar al destinatario
        let toCredito = await queryRunner.manager.findOne(CreditoToken, {
          where: {
            tokenId: Number(tokenId),
            ownerWallet: toWallet,
            proyecto: { id: proyecto.id },
          },
        });

        if (toCredito) {
          toCredito.cantidad = Number(toCredito.cantidad) + cantidadFloat;
        } else {
          toCredito = queryRunner.manager.create(CreditoToken, {
            tokenId: Number(tokenId),
            ownerWallet: toWallet,
            cantidad: cantidadFloat,
            proyecto: proyecto,
          });
        }
        await queryRunner.manager.save(toCredito);
      }

      // Caso 3: Quema (de una wallet a dirección cero)
      if (toWallet === ZERO_ADDRESS && fromWallet !== ZERO_ADDRESS) {
        this.logger.log(`Procesando quema para el token ${tokenId}.`);
        const fromCredito = await queryRunner.manager.findOne(CreditoToken, {
          where: {
            tokenId: Number(tokenId),
            ownerWallet: fromWallet,
            proyecto: { id: proyecto.id },
          },
        });

        if (fromCredito && fromCredito.cantidad >= cantidadFloat) {
          fromCredito.cantidad -= cantidadFloat;
          if (fromCredito.cantidad <= 0) {
            await queryRunner.manager.remove(fromCredito);
          } else {
            await queryRunner.manager.save(fromCredito);
          }
        } else {
          throw new Error(
            `Fondos insuficientes para la quema desde ${fromWallet}.`,
          );
        }
      }

      // Si todo fue bien, confirmamos la transacción
      await queryRunner.commitTransaction();
      this.logger.log(
        `Base de datos actualizada para el token ${tokenId} del proyecto ${proyecto.nombre}.`,
      );
    } catch (error) {
      // Si algo falla, revertimos todos los cambios
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al procesar el evento del token ${tokenId}:`,
        error.stack,
      );
    } finally {
      // Liberamos el queryRunner
      await queryRunner.release();
    }
  }
}
