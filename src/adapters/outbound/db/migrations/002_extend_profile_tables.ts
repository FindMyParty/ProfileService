import { type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('pictures')
    .ifNotExists()
    .addColumn('id_profile', 'uuid', (col) =>
      col.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('pic', 'varchar(2048)', (col) => col.notNull())
    .addColumn('is_primary', 'boolean', (col) => col.notNull().defaultTo(false))
    .addPrimaryKeyConstraint('pictures_pkey', ['id_profile', 'pic'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('pictures').execute();
}
