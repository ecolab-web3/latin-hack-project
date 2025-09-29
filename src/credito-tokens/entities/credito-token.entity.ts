import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';

@Entity('credito_tokens')
// Unicidad: Un propietario solo puede tener un registro para un tokenId de un proyecto específico.
@Index(['tokenId', 'ownerWallet', 'proyecto'], { unique: true })
// Índice para búsquedas rápidas por propietario. ¡Clave para nuestro nuevo endpoint!
@Index(['ownerWallet'])
export class CreditoToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', comment: 'ID del token ERC-1155' })
  tokenId: number;

  @Column({
    type: 'varchar',
    length: 42,
    comment: 'Dirección de la wallet del propietario',
  })
  ownerWallet: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    comment: 'Cantidad de créditos que representa este token',
  })
  cantidad: number;

  @ManyToOne(() => Proyecto, (proyecto) => proyecto.creditos, {
    onDelete: 'CASCADE', // Si se borra un proyecto, se borran sus tokens.
    nullable: false,
  })
  @JoinColumn({ name: 'proyectoId' }) // Especifica la columna de la clave foránea
  proyecto: Proyecto;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
