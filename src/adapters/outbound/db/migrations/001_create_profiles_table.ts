import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profiles')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('birthday', 'date')
    .addColumn('description', 'text')
    .addColumn('latitude', sql`decimal(10,8)`)
    .addColumn('longitude', sql`decimal(11,8)`)
    .addColumn('last_login', 'timestamptz')
    .addColumn('is_dm', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_player', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('is_remote', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('experience', 'varchar(20)', (col) =>
      col.notNull().defaultTo('beginner'),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profiles').execute();
}
