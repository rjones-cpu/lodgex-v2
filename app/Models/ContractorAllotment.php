<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

class ContractorAllotment extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
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
