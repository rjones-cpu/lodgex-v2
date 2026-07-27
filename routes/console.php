<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Nightly staging → live DB clone at 00:00 app timezone (UTC by default).
//
// Intentionally NOT using runInBackground() / onOneServer() / withoutOverlapping():
// - runInBackground often fails silently on cPanel shared hosting
// - onOneServer / withoutOverlapping need atomic cache locks; live uses
//   CACHE_STORE=database, and this command replaces that same database, so
//   mutexes in `cache` / `cache_locks` are unreliable for this job
// - Single app server: onOneServer is unnecessary
$sync = Schedule::command('db:sync-staging')
    ->dailyAt('00:00')
    ->name('db-sync-staging')
    ->appendOutputTo(storage_path('logs/db-sync-staging.log'));

if ($failureEmail = env('SCHEDULE_FAILURE_EMAIL')) {
    $sync->emailOutputOnFailure($failureEmail);
}
