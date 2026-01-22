import { getEnvVariable } from '@server/env';
import { copySchema, createMysqlConnection, wipeDatabase } from './methods';
import { PoolConfig } from './defines';

// Centralize the Naming Logic
const getDbNames = () => {
  const main = getEnvVariable('MYSQL_DATABASE');
  return {
    main,
    test: `${main}-testdb`,
    host: '127.0.0.1',
  };
};

/**
 * Higher-order helper to manage connection lifecycle
 * 
 * @param userType 
 * @param callback 
 */
const useConnection = async (userType: 'root' | 'app', callback: (conn: any) => Promise<void>) => {
  const { host } = getDbNames();
  const isRoot = userType === 'root';

  const user = isRoot ? 'root' : getEnvVariable('MYSQL_USER');
  const pass = isRoot ? getEnvVariable('MYSQL_ROOT_PASSWORD') : getEnvVariable('MYSQL_PASS');

  const connection = await createMysqlConnection(host, user, pass);
  try {
    await callback(connection);
  } finally {
    await connection.end();
  }
};

/**
 * 
 * 
 */
export const setupTestDatabase = async () => {
  const { main, test } = getDbNames();
  const mainUser = getEnvVariable('MYSQL_USER');

  await useConnection('root', async (conn) => {
    // 1. Check existence efficiently
    const [rows]: any = await conn.query(
      'SELECT 1 FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', 
      [test]
    );

    if (rows.length === 0) {
      console.log(`Creating test database: ${test}...`);
      await conn.query(`CREATE DATABASE \`${test}\``);
      await conn.query(`GRANT ALL PRIVILEGES ON \`${test}\`.* TO '${mainUser}'@'%'`);
      
      // 2. Clone structure
      await copySchema(conn, main, test);
    }
  });

  // 3. Update Global Config
  PoolConfig.database = test;
  PoolConfig.host = '127.0.0.1';
};

/**
 * 
 */
export const clearTestDatabase = async () => {
  const { test } = getDbNames();
  
  // Wipe using app credentials (safer than root)
  await useConnection('app', async (conn) => {
    await wipeDatabase(conn, test);
  });
};

//////

const createTestDatabaseFromCurrent = async (
  hostname = '127.0.0.1',
  mainDbName = '',
  testDbName = '',
) => {
  const rootUser = 'root';
  const mainDbUser = getEnvVariable('MYSQL_USER');
  const password = getEnvVariable('MYSQL_ROOT_PASSWORD');

  // create connection
  const connection = await createMysqlConnection(hostname, rootUser, password);

  // execute commands
  const [rows] = await connection.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [testDbName],
  );
  const dbExists: boolean = (rows as any[]).length > 0;
  if (!dbExists) {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\`;`);
    await connection.query(`GRANT ALL PRIVILEGES ON \`${testDbName}\`.* TO '${mainDbUser}'@'%';`);

    // then we programmatically copy the schema from main db to *test* db
    await copySchema(connection, mainDbName, testDbName);
  }

  // turn off connection
  await connection.end();
};

export const overrideDevDbConnectionToTest = async () => {
  const overrideHost = '127.0.0.1';
  const mainDbName = getEnvVariable('MYSQL_DATABASE');
  const testDbName = `${mainDbName}-testdb`;

  // generate test database if it didn't exists
  await createTestDatabaseFromCurrent(overrideHost, mainDbName, testDbName);

  // override server config
  PoolConfig.host = overrideHost;
  PoolConfig.database = testDbName;
};

export const clearTestDatabase1 = async () => {
  const mainDbName = getEnvVariable('MYSQL_DATABASE');
  const testDbName = `${mainDbName}-testdb`;
  const overrideHost = '127.0.0.1';
  const mainDbUser = getEnvVariable('MYSQL_USER');
  const mainDbPass = getEnvVariable('MYSQL_PASS');

  // create connection
  const connection = await createMysqlConnection(overrideHost, mainDbUser, mainDbPass);

  // do wipe the database
  await wipeDatabase(connection, testDbName);

  // turn off connection
  await connection.end();
};
