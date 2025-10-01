import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];
    const validApiKey = this.configService.get<string>('API_KEY');

    if (!validApiKey) {
      // Si no hay API_KEY configurada en el .env, bloquea todas las peticiones por seguridad.
      throw new UnauthorizedException('API Key no configurada en el servidor.');
    }

    if (apiKeyHeader === validApiKey) {
      return true;
    }

    throw new UnauthorizedException('API Key inválida o no proporcionada.');
  }
}