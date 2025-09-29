import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContractAddressToProyecto1759172011311 implements MigrationInterface {
    name = 'AddContractAddressToProyecto1759172011311'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_220a8239f664c4844d7b24f2cc"`);
        await queryRunner.query(`ALTER TABLE "credito_tokens" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_3dd48ce59f789cf2907091369a" ON "credito_tokens" ("ownerWallet") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c2c66f59d84ff328ae2983885c" ON "credito_tokens" ("tokenId", "ownerWallet", "proyectoId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c2c66f59d84ff328ae2983885c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3dd48ce59f789cf2907091369a"`);
        await queryRunner.query(`ALTER TABLE "credito_tokens" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_220a8239f664c4844d7b24f2cc" ON "credito_tokens" ("tokenId", "proyectoId") `);
    }

}
