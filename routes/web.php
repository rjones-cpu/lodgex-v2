<?php

use App\Http\Controllers\AccommodationWorkforceController;
use App\Http\Controllers\CommandCenterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ForecastingController;
use App\Http\Controllers\HousekeepingPlanningController;
use App\Http\Controllers\PolicyController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\ReservationManagerController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoomInventoryController;
use App\Http\Controllers\RoomUtilizationController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/modules/reservations', [ReservationManagerController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('reservations');

Route::get('/accomodation-workforce', [AccommodationWorkforceController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('accommodation-workforce');

Route::post('/accomodation-workforce/login-url', [AccommodationWorkforceController::class, 'loginUrl'])
    ->middleware(['auth', 'verified'])
    ->name('accommodation-workforce.login-url');

Route::post('/accomodation-workforce/sync-reservations', [AccommodationWorkforceController::class, 'syncReservations'])
    ->middleware(['auth', 'verified'])
    ->name('accommodation-workforce.sync-reservations');

Route::get('/add-single-worker', [AccommodationWorkforceController::class, 'addSingleWorker'])
    ->middleware(['auth', 'verified'])
    ->name('add-single-worker');

Route::get('/command-center', [CommandCenterController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('command-center');

Route::get('/command-center/{view}', [CommandCenterController::class, 'show'])
    ->middleware(['auth', 'verified'])
    ->where('view', 'executive-dashboards|predictive-analytics|alerts|scenario-planning|strategic-recommendations|ai-recommendations|module-health|integrations|consumables-intelligence|labour-forecaster|guest-profile|events-director|guest-portal|food-preferences|communication-engine|guest-concerns|guest-experience')
    ->name('command-center.show');

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::post('/dashboard/assign-room', [DashboardController::class, 'assignRoom'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard.assign-room');

Route::post('/dashboard/ai-assign-room', [DashboardController::class, 'aiAssignRoom'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard.ai-assign-room');

Route::post('/dashboard/approve', [DashboardController::class, 'approve'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard.approve');

Route::post('/dashboard/check-in', [DashboardController::class, 'checkInWorker'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard.check-in');

Route::post('/dashboard/extend-stay', [DashboardController::class, 'extendStay'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard.extend-stay');

Route::get('/policies', [PolicyController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('policies');

Route::put('/policies', [PolicyController::class, 'update'])
    ->middleware(['auth', 'verified'])
    ->name('policies.update');

Route::get('/policies/guest-search', [PolicyController::class, 'searchOnHoldExemptGuests'])
    ->middleware(['auth', 'verified'])
    ->name('policies.guest-search');

Route::get('/room-utilization', [RoomUtilizationController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization');

Route::get('/forecasting', [ForecastingController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('forecasting');

Route::get('/reports', [ReportsController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('reports');

Route::post('/reports/create', [ReportsController::class, 'create'])
    ->middleware(['auth', 'verified'])
    ->name('reports.create');

Route::get('/housekeeping-planning', [HousekeepingPlanningController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('housekeeping-planning');

Route::get('/housekeeping-planning/publish-sheet', [HousekeepingPlanningController::class, 'publishSheet'])
    ->middleware(['auth', 'verified'])
    ->name('housekeeping-planning.publish-sheet');

Route::post('/housekeeping-planning/recommendations/{recommendation}/approve', [HousekeepingPlanningController::class, 'approveRecommendation'])
    ->middleware(['auth', 'verified'])
    ->name('housekeeping-planning.recommendations.approve');

Route::post('/housekeeping-planning/recommendations/{recommendation}/dismiss', [HousekeepingPlanningController::class, 'dismissRecommendation'])
    ->middleware(['auth', 'verified'])
    ->name('housekeeping-planning.recommendations.dismiss');

Route::post('/housekeeping-planning/assignments/publish', [HousekeepingPlanningController::class, 'publishAssignments'])
    ->middleware(['auth', 'verified'])
    ->name('housekeeping-planning.assignments.publish');

Route::post('/housekeeping-planning/assignments/reassign', [HousekeepingPlanningController::class, 'reassignTasks'])
    ->middleware(['auth', 'verified'])
    ->name('housekeeping-planning.assignments.reassign');

Route::post('/housekeeping-planning/scenarios/run', [HousekeepingPlanningController::class, 'runScenario'])
    ->middleware(['auth', 'verified'])
    ->name('housekeeping-planning.scenarios.run');

Route::post('/room-utilization/recommendations/{recommendation}/approve', [RoomUtilizationController::class, 'approveRecommendation'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization.recommendations.approve');

Route::post('/room-utilization/recommendations/{recommendation}/dismiss', [RoomUtilizationController::class, 'dismissRecommendation'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization.recommendations.dismiss');

Route::post('/room-utilization/approvals/release-list', [RoomUtilizationController::class, 'submitReleaseList'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization.approvals.release-list');

Route::post('/room-utilization/approvals/overflow', [RoomUtilizationController::class, 'submitOverflowEscalation'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization.approvals.overflow');

Route::post('/room-utilization/report/daily', [RoomUtilizationController::class, 'generateDailyReport'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization.report.daily');

Route::post('/room-utilization/approvals/{approval}/approve', [RoomUtilizationController::class, 'approveRequest'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization.approvals.approve');

Route::post('/room-utilization/approvals/{approval}/reject', [RoomUtilizationController::class, 'rejectRequest'])
    ->middleware(['auth', 'verified'])
    ->name('room-utilization.approvals.reject');

// Room Inventory — ported from camp-reservations.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/room-inventory', [RoomInventoryController::class, 'index'])
        ->name('room-inventory');

    Route::post('/room-inventory/locations', [RoomInventoryController::class, 'storeLocation'])
        ->name('room-inventory.locations.store');
    Route::put('/room-inventory/locations/{id}', [RoomInventoryController::class, 'updateLocation'])
        ->name('room-inventory.locations.update');
    Route::delete('/room-inventory/locations/{id}', [RoomInventoryController::class, 'destroyLocation'])
        ->name('room-inventory.locations.destroy');
    Route::get('/room-inventory/locations/{id}/rooms', [RoomInventoryController::class, 'roomsForLocation'])
        ->name('room-inventory.locations.rooms');

    Route::post('/room-inventory/out-of-service', [RoomInventoryController::class, 'storeOutOfService'])
        ->name('room-inventory.oos.store');
    Route::post('/room-inventory/out-of-service/{id}/return', [RoomInventoryController::class, 'returnToService'])
        ->name('room-inventory.oos.return');

    Route::post('/room-inventory/dorms/off-market', [RoomInventoryController::class, 'storeDormOffMarket'])
        ->name('room-inventory.dorms.off-market.store');
    Route::post('/room-inventory/dorms/off-market/{id}/return', [RoomInventoryController::class, 'returnDormToMarket'])
        ->name('room-inventory.dorms.off-market.return');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
