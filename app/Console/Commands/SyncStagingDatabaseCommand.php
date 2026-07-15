<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
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

    public function handle(): int
    {
        $sourceName = (string) $this->option('source');
        $targetName = (string) $this->option('target');

        $source = Config::get("database.connections.{$sourceName}");
        $target = Config::get("database.connections.{$targetName}");

        if (! $source || ! $target) {
            $this->error("Unknown connection. source='{$sourceName}', target='{$targetName}'.");

            return self::FAILURE;
        }

        if (($source['driver'] ?? null) !== 'mysql' || ($target['driver'] ?? null) !== 'mysql') {
            $this->error('Both source and target connections must use the mysql driver.');

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

            $this->info('Staging database synced successfully.');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Sync failed: '.$e->getMessage());

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
