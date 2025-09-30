import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsNumber,
  IsEthereumAddress,
  IsArray,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { TipoCredito } from '../entities/proyecto.entity';

export class CreateProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(TipoCredito)
  @IsNotEmpty()
  tipoCredito: TipoCredito;

  @IsDateString()
  @IsNotEmpty()
  fechaVerificacion: Date;

  @IsNumber()
  @Min(0)
  cantidadAcunada: number;

  @IsEthereumAddress()
  @IsNotEmpty()
  contractAddress: string;

  @IsString()
  @IsNotEmpty()
  abiName: string;

  @IsString()
  @IsNotEmpty()
  ipfsHashDocumentos: string;
}
