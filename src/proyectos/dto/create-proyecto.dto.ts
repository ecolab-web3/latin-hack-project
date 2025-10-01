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
import { ApiProperty } from '@nestjs/swagger';
import { TipoCredito } from '../entities/proyecto.entity';

export class CreateProyectoDto {
  @ApiProperty({
    description: 'El nombre del proyecto de sostenibilidad.',
    example: 'Proyecto de Reforestación Amazónica',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'El tipo de crédito que genera el proyecto.',
    enum: TipoCredito,
    example: TipoCredito.CARBONO,
  })
  @IsEnum(TipoCredito)
  @IsNotEmpty()
  tipoCredito: TipoCredito;

  @ApiProperty({
    description: 'La fecha de verificación del proyecto en formato ISO 8601.',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  fechaVerificacion: Date;

  @ApiProperty({
    description: 'Cantidad inicial de créditos acuñados.',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  cantidadAcunada: number;

  @ApiProperty({
    description: 'La dirección del contrato inteligente en la blockchain.',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  contractAddress: string;

  @ApiProperty({
    description:
      "El nombre del archivo ABI (sin extensión) ubicado en la carpeta 'src/abis'.",
    example: 'erc1155-base',
  })
  @IsString()
  @IsNotEmpty()
  abiName: string;

  @ApiProperty({
    description: 'El hash de IPFS que apunta a los documentos de verificación.',
    example: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  })
  @IsString()
  @IsNotEmpty()
  ipfsHashDocumentos: string;
}
