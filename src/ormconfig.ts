import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';0

// Carga las variables de entorno desde .env
dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  // TypeORM CLI necesita rutas absolutas o relativas al directorio raíz
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  // IMPORTANTE: `synchronize` debe ser `false` en producción.
  // Las migraciones se encargan de los cambios de esquema.
  synchronize: false,
  logging: true,
};

// La CLI de TypeORM busca una exportación por defecto de un `DataSource`
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
