import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosService } from './proyectos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Proyecto, TipoCredito } from './entities/proyecto.entity';
import { CreditoToken } from '../credito-tokens/entities/credito-token.entity';
import { Repository } from 'typeorm';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';

// Mockeamos el módulo 'fs' para no depender del sistema de archivos real.
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ProyectosService', () => {
  let service: ProyectosService;
  let proyectoRepository: Repository<Proyecto>;
  let creditoTokenRepository: Repository<CreditoToken>;

  // Creamos un mock del ABI para simular su carga desde un archivo
  const mockAbi = [{ type: 'event', name: 'TransferSingle' }];

  // Creamos mocks para los repositorios de TypeORM
  const mockProyectoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCreditoTokenRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectosService,
        {
          provide: getRepositoryToken(Proyecto),
          useValue: mockProyectoRepository,
        },
        {
          provide: getRepositoryToken(CreditoToken),
          useValue: mockCreditoTokenRepository,
        },
      ],
    }).compile();

    service = module.get<ProyectosService>(ProyectosService);
    proyectoRepository = module.get<Repository<Proyecto>>(
      getRepositoryToken(Proyecto),
    );
    creditoTokenRepository = module.get<Repository<CreditoToken>>(
      getRepositoryToken(CreditoToken),
    );

    // Configuramos el mock de fs para que devuelva nuestro ABI de prueba
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockAbi));
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpiamos los mocks después de cada prueba
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProyectoDto: CreateProyectoDto = {
      nombre: 'Proyecto Test',
      tipoCredito: TipoCredito.CARBONO,
      fechaVerificacion: new Date(),
      cantidadAcunada: 1000,
      contractAddress: '0x1234567890123456789012345678901234567890',
      abiName: 'test-abi',
      ipfsHashDocumentos: 'Qm...',
    };

    it('debería crear y guardar un proyecto exitosamente', async () => {
      mockProyectoRepository.findOne.mockResolvedValue(null); // No existe un proyecto con esa dirección
      mockProyectoRepository.save.mockImplementation((p) =>
        Promise.resolve({ ...p, id: 'uuid-test' }),
      );

      const result = await service.create(createProyectoDto);

      expect(mockedFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join('src', 'abis', 'test-abi.abi.json')),
        'utf-8',
      );
      expect(mockProyectoRepository.findOne).toHaveBeenCalledWith({
        where: { contractAddress: createProyectoDto.contractAddress },
      });
      expect(mockProyectoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ abi: mockAbi }),
      );
      expect(mockProyectoRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('debería lanzar ConflictException si el contrato ya existe', async () => {
      mockProyectoRepository.findOne.mockResolvedValue({ id: 'some-id' });

      await expect(service.create(createProyectoDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería lanzar NotFoundException si el archivo ABI no se encuentra', async () => {
      // Aseguramos que el proyecto no existe para esta prueba específica
      mockProyectoRepository.findOne.mockResolvedValue(null);
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.create(createProyectoDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findTokensByWallet', () => {
    const walletAddress = '0xWalletAddress';

    it('debería retornar un array de CreditoToken si se encuentran', async () => {
      const mockTokens = [{ id: 'token-1' }, { id: 'token-2' }];
      mockCreditoTokenRepository.find.mockResolvedValue(mockTokens);

      const result = await service.findTokensByWallet(walletAddress);

      expect(mockCreditoTokenRepository.find).toHaveBeenCalledWith({
        where: { ownerWallet: walletAddress },
        relations: ['proyecto'],
      });
      expect(result).toEqual(mockTokens);
    });

    it('debería lanzar NotFoundException si no se encuentran tokens', async () => {
      mockCreditoTokenRepository.find.mockResolvedValue([]);

      await expect(service.findTokensByWallet(walletAddress)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
