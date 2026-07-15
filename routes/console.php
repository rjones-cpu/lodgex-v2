<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Clone the staging database into the live smart_lodge database every night at 00:00.
Schedule::command('db:sync-staging')
    ->dailyAt('00:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->onOneServer();
