import { MigrationInterface, QueryRunner } from "typeorm";

export class ABIdelContratoInteligenteEnJson1759199229212 implements MigrationInterface {
    name = 'ABIdelContratoInteligenteEnJson1759199229212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "proyectos" ADD "abi" jsonb NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "proyectos"."abi" IS 'ABI del contrato inteligente en formato JSON'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "proyectos"."abi" IS 'ABI del contrato inteligente en formato JSON'`);
        await queryRunner.query(`ALTER TABLE "proyectos" DROP COLUMN "abi"`);
    }

}
