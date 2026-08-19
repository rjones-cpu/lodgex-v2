<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Nightly clone of the staging database into the live smart_lodge database.
 *
 * Dumps the source ("staging") connection with mysqldump and imports it into
 * the target ("mysql") connection. Credentials are passed to the CLI tools via
 * a temporary --defaults-extra-file so they never appear in the process list.
 *
 * WARNING: this is destructive for the target database — every run replaces the
 * target's contents with the staging snapshot.
 */
class SyncStagingDatabaseCommand extends Command
{
    protected $signature = 'db:sync-staging
        {--source=staging : Source connection name (config/database.php)}
        {--target=mysql : Target connection name (config/database.php)}
        {--keep-dump : Keep the temporary .sql dump file instead of deleting it}';

    protected $description = 'Dump the staging database and import it into the live smart_lodge database';

    /**
     * Migrations re-applied after every import.
     *
     * The dump replaces the target's FK definitions and camp rows *and* its
     * `migrations` table, which reverts these fixes and leaves room assignment
     * and /room-inventory broken until they run again. All are idempotent, so
     * re-running them each sync is safe.
     *
     * @var list<string>
     */
    private const POST_IMPORT_MIGRATIONS = [
        'database/migrations/2026_08_03_210000_retarget_rooms_old_inventory_fk.php',
        'database/migrations/2026_08_03_211000_retarget_room_fks_to_rooms_old.php',
        'database/migrations/2026_08_11_120000_retarget_out_of_service_inventory_fk.php',
        'database/migrations/2026_08_16_090000_rekey_legacy_camp_to_operational_camp.php',
    ];

    public function handle(): int
    {
        $sourceName = (string) $this->option('source');
        $targetName = (string) $this->option('target');

        Log::info('db:sync-staging started', [
            'source' => $sourceName,
            'target' => $targetName,
            'at' => now()->toIso8601String(),
        ]);

        $source = Config::get("database.connections.{$sourceName}");
        $target = Config::get("database.connections.{$targetName}");

        if (! $source || ! $target) {
            $this->error("Unknown connection. source='{$sourceName}', target='{$targetName}'.");
            Log::error('db:sync-staging aborted: unknown connection', compact('sourceName', 'targetName'));

            return self::FAILURE;
        }

        if (($source['driver'] ?? null) !== 'mysql' || ($target['driver'] ?? null) !== 'mysql') {
            $this->error('Both source and target connections must use the mysql driver.');
            Log::error('db:sync-staging aborted: non-mysql driver');

            return self::FAILURE;
        }

        $mysqldumpBin = (string) env('MYSQLDUMP_PATH', 'mysqldump');
        $mysqlBin = (string) env('MYSQL_PATH', 'mysql');

        $dumpFile = storage_path('app/staging-sync-'.now()->format('Ymd_His').'.sql');
        $sourceCnf = $this->writeDefaultsFile($source);
        $targetCnf = $this->writeDefaultsFile($target);

        try {
            $this->info("Dumping '{$source['database']}' from '{$sourceName}'...");
            $this->dump($mysqldumpBin, $sourceCnf, $source['database'], $dumpFile);

            $this->info("Importing into '{$target['database']}' on '{$targetName}'...");
            $this->import($mysqlBin, $targetCnf, $target['database'], $dumpFile);

            $this->info('Re-applying schema retargets removed by the import...');
            $failedMigrations = $this->reapplyPostImportMigrations($targetName);

            if ($failedMigrations !== []) {
                $this->error('Import succeeded but these migrations failed: '.implode(', ', $failedMigrations));
                Log::error('db:sync-staging post-import migrations failed', [
                    'target_db' => $target['database'],
                    'failed' => $failedMigrations,
                ]);

                return self::FAILURE;
            }

            $this->info('Staging database synced successfully.');
            Log::info('db:sync-staging finished successfully', [
                'source_db' => $source['database'],
                'target_db' => $target['database'],
            ]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Sync failed: '.$e->getMessage());
            Log::error('db:sync-staging failed', [
                'message' => $e->getMessage(),
                'mysqldump' => $mysqldumpBin,
                'mysql' => $mysqlBin,
            ]);

            return self::FAILURE;
        } finally {
            @unlink($sourceCnf);
            @unlink($targetCnf);

            if (! $this->option('keep-dump')) {
                @unlink($dumpFile);
            } elseif (is_file($dumpFile)) {
                $this->line("Dump kept at: {$dumpFile}");
            }
        }
    }

    /**
     * Re-apply the FK retarget migrations against the freshly imported database.
     *
     * @return list<string> paths that failed
     */
    private function reapplyPostImportMigrations(string $targetName): array
    {
        $failed = [];

        foreach (self::POST_IMPORT_MIGRATIONS as $path) {
            $this->line("  {$path}");

            // --database also sets the default connection for the migration run,
            // so the DB::statement() calls inside each migration hit the target.
            $exitCode = Artisan::call('migrate', [
                '--path' => $path,
                '--database' => $targetName,
                '--force' => true,
            ]);

            $this->output->write(Artisan::output());

            if ($exitCode !== self::SUCCESS) {
                $failed[] = $path;
            }
        }

        return $failed;
    }

    /**
     * Run mysqldump, streaming stdout into the dump file.
     *
     * @param  array<string, mixed>  ...$unused
     */
    private function dump(string $bin, string $cnf, string $database, string $dumpFile): void
    {
        $process = new Process([
            $bin,
            '--defaults-extra-file='.$cnf,
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            '--events',
            '--no-tablespaces',
            '--skip-lock-tables',
            $database,
        ]);
        $process->setTimeout(null);

        $handle = fopen($dumpFile, 'wb');
        if ($handle === false) {
            throw new \RuntimeException("Unable to open dump file for writing: {$dumpFile}");
        }

        try {
            $process->run(function (string $type, string $buffer) use ($handle): void {
                if ($type === Process::OUT) {
                    fwrite($handle, $buffer);
                } else {
                    $this->output->write($buffer);
                }
            });
        } finally {
            fclose($handle);
        }

        if (! $process->isSuccessful()) {
            throw new \RuntimeException('mysqldump exited with code '.$process->getExitCode());
        }

        if (! is_file($dumpFile) || filesize($dumpFile) === 0) {
            throw new \RuntimeException('mysqldump produced an empty dump.');
        }
    }

    /**
     * Import the dump file into the target database by streaming it into mysql.
     */
    private function import(string $bin, string $cnf, string $database, string $dumpFile): void
    {
        $input = fopen($dumpFile, 'rb');
        if ($input === false) {
            throw new \RuntimeException("Unable to read dump file: {$dumpFile}");
        }

        $process = new Process([
            $bin,
            '--defaults-extra-file='.$cnf,
            $database,
        ]);
        $process->setTimeout(null);
        $process->setInput($input);

        $process->run(function (string $type, string $buffer): void {
            $this->output->write($buffer);
        });

        if (is_resource($input)) {
            fclose($input);
        }

        if (! $process->isSuccessful()) {
            throw new \RuntimeException('mysql import exited with code '.$process->getExitCode());
        }
    }

    /**
     * Write a temporary MySQL defaults-extra-file so credentials stay off the CLI.
     *
     * @param  array<string, mixed>  $conn
     */
    private function writeDefaultsFile(array $conn): string
    {
        $path = tempnam(sys_get_temp_dir(), 'dbcnf_');
        if ($path === false) {
            throw new \RuntimeException('Unable to create temporary credentials file.');
        }

        $contents = "[client]\n"
            .'host="'.($conn['host'] ?? '127.0.0.1')."\"\n"
            .'port="'.($conn['port'] ?? '3306')."\"\n"
            .'user="'.($conn['username'] ?? '')."\"\n"
            .'password="'.($conn['password'] ?? '')."\"\n";

        file_put_contents($path, $contents);
        @chmod($path, 0600);

        return $path;
    }
}
