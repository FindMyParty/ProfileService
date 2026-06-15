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

  await db.schema
    .createTable('themes')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
    .execute();

  await db.schema
    .createTable('profile_themes')
    .ifNotExists()
    .addColumn('id_profile', 'uuid', (col) =>
      col.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('id_themes', 'uuid', (col) =>
      col.notNull().references('themes.id').onDelete('cascade'),
    )
    .addPrimaryKeyConstraint('profile_themes_pkey', ['id_profile', 'id_themes'])
    .execute();

  await db.schema
    .createTable('characters')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('id_profile', 'uuid', (col) =>
      col.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('background', 'varchar(500)')
    .addColumn('level', 'int2', (col) => col.notNull().defaultTo(1))
    .addColumn('is_alive', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();

  await db.schema
    .createTable('classes')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
    .execute();

  await db.schema
    .createTable('characters_classes')
    .ifNotExists()
    .addColumn('id_characters', 'uuid', (col) =>
      col.notNull().references('characters.id').onDelete('cascade'),
    )
    .addColumn('id_classes', 'uuid', (col) =>
      col.notNull().references('classes.id').onDelete('cascade'),
    )
    .addPrimaryKeyConstraint('characters_classes_pkey', [
      'id_characters',
      'id_classes',
    ])
    .execute();

  await db.schema
    .createTable('profile_classes')
    .ifNotExists()
    .addColumn('id_profile', 'uuid', (col) =>
      col.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('id_classes', 'uuid', (col) =>
      col.notNull().references('classes.id').onDelete('cascade'),
    )
    .addPrimaryKeyConstraint('profile_classes_pkey', ['id_profile', 'id_classes'])
    .execute();

  await db.schema
    .createTable('systems')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
    .execute();

  await db.schema
    .createTable('characters_systems')
    .ifNotExists()
    .addColumn('id_characters', 'uuid', (col) =>
      col.notNull().references('characters.id').onDelete('cascade'),
    )
    .addColumn('id_systems', 'uuid', (col) =>
      col.notNull().references('systems.id').onDelete('cascade'),
    )
    .addPrimaryKeyConstraint('characters_systems_pkey', [
      'id_characters',
      'id_systems',
    ])
    .execute();

  await db.schema
    .createTable('profile_systems')
    .ifNotExists()
    .addColumn('id_profile', 'uuid', (col) =>
      col.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('id_systems', 'uuid', (col) =>
      col.notNull().references('systems.id').onDelete('cascade'),
    )
    .addPrimaryKeyConstraint('profile_systems_pkey', ['id_profile', 'id_systems'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_systems').execute();
  await db.schema.dropTable('characters_systems').execute();
  await db.schema.dropTable('systems').execute();
  await db.schema.dropTable('profile_classes').execute();
  await db.schema.dropTable('characters_classes').execute();
  await db.schema.dropTable('classes').execute();
  await db.schema.dropTable('characters').execute();
  await db.schema.dropTable('profile_themes').execute();
  await db.schema.dropTable('themes').execute();
  await db.schema.dropTable('pictures').execute();
}
