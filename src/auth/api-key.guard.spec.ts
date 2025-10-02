import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyGuard } from './api-key.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: ConfigService;

  const mockSecretApiKey = 'mi-clave-secreta-de-prueba';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'API_KEY') {
                return mockSecretApiKey;
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('debería estar definido', () => {
    expect(guard).toBeDefined();
  });

  it('debería retornar true si la API key es válida', () => {
    // Creamos un mock del ExecutionContext que simula una petición HTTP
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-api-key': mockSecretApiKey,
          },
        }),
      }),
    });

    const canActivate = guard.canActivate(mockContext);
    expect(canActivate).toBe(true);
  });

  it('debería lanzar UnauthorizedException si la API key es inválida', () => {
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-api-key': 'clave-incorrecta',
          },
        }),
      }),
    });

    // Esperamos que la función lance una excepción
    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si no se provee la cabecera x-api-key', () => {
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {}, // Sin cabecera
        }),
      }),
    });

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si la API_KEY no está configurada en el servidor', () => {
    // Sobrescribimos el mock de ConfigService para este test específico
    jest.spyOn(configService, 'get').mockReturnValue(undefined);

    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-api-key': mockSecretApiKey },
        }),
      }),
    });

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });
});
