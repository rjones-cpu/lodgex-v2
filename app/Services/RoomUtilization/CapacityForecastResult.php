<?php

namespace App\Services\RoomUtilization;

use Illuminate\Support\Collection;

class CapacityForecastResult
{
    /**
     * @param  Collection<int, array<string, mixed>>  $dailyForecasts
     * @param  array<string, array<string, mixed>>  $outlook
     * @param  list<array<string, mixed>>  $occupancyByDorm
     * @param  list<array<string, mixed>>  $occupancyByContractor
     */
    public function __construct(
        public readonly Collection $dailyForecasts,
        public readonly array $outlook,
        public readonly array $occupancyByDorm,
        public readonly array $occupancyByContractor,
        public readonly int $peakShortage,
        public readonly ?string $peakShortageDate,
        public readonly int $peakOverflowRooms,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'dailyForecasts' => $this->dailyForecasts->values()->all(),
            'outlook' => $this->outlook,
            'occupancyByDorm' => $this->occupancyByDorm,
            'occupancyByContractor' => $this->occupancyByContractor,
            'peakShortage' => $this->peakShortage,
            'peakShortageDate' => $this->peakShortageDate,
            'peakOverflowRooms' => $this->peakOverflowRooms,
        ];
    }
}
