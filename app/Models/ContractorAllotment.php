<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContractorAllotment extends Model
{
    protected $fillable = [
        'contractor',
        'allotted',
        'used',
        'variance',
        'no_shows',
        'trend',
        'period_start',
        'period_end',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'allotted' => 'integer',
            'used' => 'integer',
            'variance' => 'integer',
            'no_shows' => 'integer',
        ];
    }
}
