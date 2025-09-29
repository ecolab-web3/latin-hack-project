import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn,
  CreateDateColumn,
  Index
} from 'typeorm';

@Entity('credito_tokens')
@Index(['tokenId', 'proyecto'], { unique: true }) // Asegura que no haya tokenId duplicados por proyecto
export class CreditoToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', comment: 'ID del token ERC-1155' })
  tokenId: number;

  @Column({ type: 'varchar', length: 42, comment: 'Dirección de la wallet del propietario' })
  ownerWallet: string;

  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 2, 
    comment: 'Cantidad de créditos que representa este token' 
  })
  cantidad: number;

  // Relación: Muchos Créditos Tokenizados pertenecen a un Proyecto
  @ManyToOne(() => Proyecto, (proyecto) => proyecto.creditos, {
    onDelete: 'CASCADE', // Si se borra un proyecto, se borran sus tokens indexados
    nullable: false,
  })
  @JoinColumn({ name: 'proyectoId' }) // Define la columna de la clave foránea
  proyecto: Proyecto;

  @CreateDateColumn()
  createdAt: Date;
}
