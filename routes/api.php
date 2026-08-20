<?php

use App\Http\Controllers\Ai\RoomInventoryMcpController;
use Illuminate\Support\Facades\Route;

Route::middleware('mcp.token')->prefix('ai/room-inventory')->group(function () {
    Route::get('/rooms', [RoomInventoryMcpController::class, 'listRooms']);
    Route::get('/occupancy', [RoomInventoryMcpController::class, 'occupancy']);
    Route::get('/reservations', [RoomInventoryMcpController::class, 'reservations']);
    Route::get('/availability', [RoomInventoryMcpController::class, 'availability']);
    Route::post('/proposals', [RoomInventoryMcpController::class, 'createProposal']);

    Route::match(['post', 'put', 'patch', 'delete'], '/assign', [RoomInventoryMcpController::class, 'refuseWrite'])
        ->defaults('action', 'assign');
    Route::match(['post', 'put', 'patch', 'delete'], '/hold', [RoomInventoryMcpController::class, 'refuseWrite'])
        ->defaults('action', 'hold');
    Route::match(['post', 'put', 'patch', 'delete'], '/release', [RoomInventoryMcpController::class, 'refuseWrite'])
        ->defaults('action', 'release');
    Route::match(['post', 'put', 'patch', 'delete'], '/check-in', [RoomInventoryMcpController::class, 'refuseWrite'])
        ->defaults('action', 'check_in');
});
