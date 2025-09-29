import { CreditoToken } from '../../credito-tokens/entities/credito-token.entity';
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

// Definimos el ENUM para los tipos de crédito
export enum TipoCredito {
  CARBONO = 'CARBONO',
  BIODIVERSIDAD = 'BIODIVERSIDAD',
  RECICLAJE = 'RECICLAJE',
}

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({
    type: 'enum',
    enum: TipoCredito,
  })
  tipoCredito: TipoCredito;

  @Column({ type: 'timestamp' })
  fechaVerificacion: Date;

  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 2, 
    comment: 'Cantidad total de créditos que se pueden acuñar para este proyecto' 
  })
  cantidadAcunada: number;

  @Column({ type: 'varchar', length: 42, unique: true, comment: 'Dirección del contrato inteligente del proyecto' })
  contractAddress: string;

  @Column({ type: 'varchar', length: 255, comment: 'Hash de IPFS que apunta a los documentos de verificación' })
  ipfsHashDocumentos: string;

  // Relación: Un Proyecto puede tener muchos Créditos Tokenizados
  @OneToMany(() => CreditoToken, (creditoToken) => creditoToken.proyecto)
  creditos: CreditoToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
