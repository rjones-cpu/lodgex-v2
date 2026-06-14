<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class ReservationManagerController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('ReservationManager', [
            'lastUpdated' => now()->format('M j, Y g:i A'),
            'siteName' => 'Boon Lodge • Main Site',
            'selectedDate' => now()->format('M j, Y'),
        ]);
    }
}
