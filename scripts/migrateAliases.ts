import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration script to transfer existing alias data to the new UserAlias table
 * This should be run after the database schema has been updated
 */
async function migrateExistingAliases() {
  console.log('Starting alias migration...');

  try {
    // Get all users who have aliases
    const usersWithAliases = await prisma.user.findMany({
      where: {
        alias: {
          not: null
        }
      },
      select: {
        id: true,
        alias: true,
        aliasCreatedAt: true,
        isAliasPublic: true
      }
    });

    console.log(`Found ${usersWithAliases.length} users with existing aliases`);

    // Process each user
    for (const user of usersWithAliases) {
      if (!user.alias) continue;

      try {
        // Check if this alias already exists in the new table
        const existingAlias = await prisma.userAlias.findFirst({
          where: {
            userId: user.id,
            alias: user.alias
          }
        });

        if (existingAlias) {
          console.log(`Alias '${user.alias}' already exists for user ${user.id}, updating user reference...`);
          
          // Just update the user's currentAliasId to point to the existing alias
          await prisma.user.update({
            where: { id: user.id },
            data: {
              currentAliasId: existingAlias.id
            }
          });
          continue;
        }

        // Create the alias record in the new table
        const newAlias = await prisma.userAlias.create({
          data: {
            userId: user.id,
            alias: user.alias,
            isCurrentlyActive: true,
            createdAt: user.aliasCreatedAt || new Date()
          }
        });

        // Update the user's currentAliasId to point to the new alias
        await prisma.user.update({
          where: { id: user.id },
          data: {
            currentAliasId: newAlias.id
          }
        });

        console.log(`Migrated alias '${user.alias}' for user ${user.id}`);
      } catch (error) {
        console.error(`Error migrating alias for user ${user.id}:`, error);
        // Continue with next user
      }
    }

    console.log('Alias migration completed successfully!');
  } catch (error) {
    console.error('Error during alias migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Validate the migration by checking data consistency
 */
async function validateMigration() {
  console.log('Validating migration...');

  try {
    // Check that all users with aliases have corresponding UserAlias records
    const usersWithAliases = await prisma.user.findMany({
      where: {
        alias: {
          not: null
        }
      },
      include: {
        currentAlias: true,
        aliases: true
      }
    });

    let inconsistencies = 0;

    for (const user of usersWithAliases) {
      // Check if user has a current alias set
      if (!user.currentAlias) {
        console.warn(`User ${user.id} has alias '${user.alias}' but no currentAlias set`);
        inconsistencies++;
        continue;
      }

      // Check if the current alias matches the legacy alias field
      if (user.currentAlias.alias !== user.alias) {
        console.warn(`User ${user.id} has alias mismatch: legacy='${user.alias}', current='${user.currentAlias.alias}'`);
        inconsistencies++;
      }

      // Check if only one alias is marked as currently active
      const activeAliases = user.aliases.filter(alias => alias.isCurrentlyActive);
      if (activeAliases.length !== 1) {
        console.warn(`User ${user.id} has ${activeAliases.length} active aliases, should be exactly 1`);
        inconsistencies++;
      }
    }

    if (inconsistencies === 0) {
      console.log('Migration validation passed - no inconsistencies found!');
    } else {
      console.warn(`Migration validation found ${inconsistencies} inconsistencies`);
    }

    return inconsistencies === 0;
  } catch (error) {
    console.error('Error during migration validation:', error);
    return false;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateExistingAliases()
    .then(() => validateMigration())
    .then((isValid) => {
      if (isValid) {
        console.log('Migration completed and validated successfully!');
        process.exit(0);
      } else {
        console.error('Migration completed but validation failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateExistingAliases, validateMigration };
