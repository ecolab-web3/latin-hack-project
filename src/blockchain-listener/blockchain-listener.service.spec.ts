import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ListenerService } from './listener.service';
import { Proyecto, TipoCredito } from '../proyectos/entities/proyecto.entity';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';

// Usamos temporizadores falsos para controlar y evitar que setInterval se ejecute realmente.
jest.useFakeTimers();

describe('ListenerService', () => {
  let service: ListenerService;
  let proyectoRepository: Repository<Proyecto>;
  let creditoTokenRepository: Repository<CreditoToken>;

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const MOCK_OPERATOR = '0x0000000000000000000000000000000000000001';
  const MOCK_FROM_WALLET = '0x0000000000000000000000000000000000000002';
  const MOCK_TO_WALLET = '0x0000000000000000000000000000000000000003';

  const mockProyecto = {
    id: 'a1b2c3d4-e5f6-a1b2-c3d4-e5f6a1b2c3d4',
    nombre: 'Proyecto Test',
    tipoCredito: TipoCredito.CARBONO,
    contractAddress: '0xContractAddress',
    abi: [{ type: 'event', name: 'TransferSingle' }],
  } as Proyecto;

  // Mocks para los repositorios y el EntityManager
  const mockProyectoRepository = {
    find: jest.fn().mockResolvedValue([mockProyecto]),
  };

  const mockCreditoTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    decrement: jest.fn(),
    remove: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListenerService,
        {
          provide: getRepositoryToken(Proyecto),
          useValue: mockProyectoRepository,
        },
        {
          provide: getRepositoryToken(CreditoToken),
          useValue: mockCreditoTokenRepository,
        },
        {
          provide: DataSource,
          useValue: {
            // Mockeamos el DataSource para que devuelva nuestro queryRunner simulado
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('ws://localhost:8545'),
          },
        },
      ],
    }).compile();

    service = module.get<ListenerService>(ListenerService);
    proyectoRepository = module.get(getRepositoryToken(Proyecto));
    creditoTokenRepository = module.get(getRepositoryToken(CreditoToken));

    // Evitamos que el servicio inicie la conexión real en onModuleInit
    jest
      .spyOn(service as any, 'startListeningToAllProjects')
      .mockImplementation(() => {});
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('handleTokenTransfer (Lógica de Mint/Transfer/Burn)', () => {
    const tokenId = 1n;
    const amount = 10000n; // 100.00 con 2 decimales

    it('debería manejar una ACUÑACIÓN (Mint) correctamente', async () => {
      // Simula que no existe un token para el destinatario
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockReturnValue({
        /* mock token */
      });

      await (service as any).handleTokenTransfer(
        mockProyecto,
        ZERO_ADDRESS, // from
        MOCK_TO_WALLET, // to
        tokenId,
        amount,
      );

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CreditoToken,
        {
          proyecto: mockProyecto,
          tokenId: Number(tokenId),
          ownerWallet: MOCK_TO_WALLET,
          cantidad: 100,
        },
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('debería manejar una TRANSFERENCIA correctamente', async () => {
      // Simula que el token del remitente existe
      const fromToken = { id: 'token-from', cantidad: 200 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(fromToken) // Para el remitente
        .mockResolvedValueOnce(null); // Para el destinatario (no tiene token aún)

      await (service as any).handleTokenTransfer(
        mockProyecto,
        MOCK_FROM_WALLET, // from
        MOCK_TO_WALLET, // to
        tokenId,
        amount,
      );

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      // Verifica que se decrementa el saldo del remitente
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: fromToken.id, cantidad: 100 }),
      );
      // Verifica que se crea un nuevo token para el destinatario
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CreditoToken,
        {
          proyecto: mockProyecto,
          tokenId: Number(tokenId),
          ownerWallet: MOCK_TO_WALLET,
          cantidad: 100,
        },
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('debería manejar una QUEMA (Burn) correctamente', async () => {
      const fromToken = { id: 'token-to-burn', cantidad: 150 };
      mockQueryRunner.manager.findOne.mockResolvedValue(fromToken);

      await (service as any).handleTokenTransfer(
        mockProyecto,
        MOCK_FROM_WALLET, // from
        ZERO_ADDRESS, // to
        tokenId,
        amount,
      );

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: fromToken.id, cantidad: 50 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('debería eliminar el token del remitente si su saldo llega a cero después de una transferencia o quema', async () => {
      const fromToken = { id: 'token-from', cantidad: 100 }; // Saldo exacto a transferir
      mockQueryRunner.manager.findOne.mockResolvedValue(fromToken);

      await (service as any).handleTokenTransfer(
        mockProyecto,
        MOCK_FROM_WALLET,
        ZERO_ADDRESS, // Quema total
        tokenId,
        10000n, // Misma cantidad que el saldo
      );

      expect(fromToken.cantidad).toBe(0);
      // La clave es verificar que se llama a delete
      expect(mockQueryRunner.manager.remove).toHaveBeenCalledWith(fromToken);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
