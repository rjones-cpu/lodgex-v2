<?php

namespace App\Providers;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\AiProviderRegistry;
use App\Services\Authorization\OvertimeApprovalService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AiProviderRegistry::class);
        $this->app->bind(AiProvider::class, function ($app) {
            return $app->make(AiProviderRegistry::class)->driver();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Gate::define('approve-overtime', function ($user) {
            return app(OvertimeApprovalService::class)->canApprove($user);
        });
    }
}
