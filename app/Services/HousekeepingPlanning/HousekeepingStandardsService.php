<?php

namespace App\Services\HousekeepingPlanning;

use App\Enums\HkTaskType;
use App\Models\HkCleaningStandard;
use App\Models\HkWorkloadRule;

class HousekeepingStandardsService
{
    public function rules(): HkWorkloadRule
    {
        return HkWorkloadRule::query()->where('is_active', true)->first()
            ?? HkWorkloadRule::create(['name' => 'Default']);
    }

    /**
     * @return array{minutes: int, points: float, inspection_required: bool}
     */
    public function standardFor(HkTaskType $type): array
    {
        $row = HkCleaningStandard::query()->where('task_type', $type->value)->first();

        if ($row) {
            return [
                'minutes' => $row->default_minutes,
                'points' => (float) $row->default_points,
                'inspection_required' => $row->inspection_required,
            ];
        }

        return match ($type) {
            HkTaskType::CheckoutClean => ['minutes' => 30, 'points' => 2.0, 'inspection_required' => true],
            HkTaskType::LinenChange => ['minutes' => 20, 'points' => 1.5, 'inspection_required' => false],
            HkTaskType::ArrivalPrep => ['minutes' => 30, 'points' => 2.0, 'inspection_required' => true],
            HkTaskType::OnHoldDirtyClean => ['minutes' => 30, 'points' => 2.0, 'inspection_required' => false],
            HkTaskType::DeepClean => ['minutes' => 40, 'points' => 3.0, 'inspection_required' => true],
            HkTaskType::Reclean => ['minutes' => 30, 'points' => 2.0, 'inspection_required' => true],
            default => ['minutes' => 13, 'points' => 1.0, 'inspection_required' => false],
        };
    }

    public function seedDefaults(): void
    {
        if (HkCleaningStandard::query()->exists()) {
            return;
        }

        $defaults = [
            [HkTaskType::RegularClean, 13, 1.0, false],
            [HkTaskType::LinenChange, 20, 1.5, false],
            [HkTaskType::CheckoutClean, 30, 2.0, true],
            [HkTaskType::OnHoldDirtyClean, 30, 2.0, false],
            [HkTaskType::ArrivalPrep, 30, 2.0, true],
            [HkTaskType::DeepClean, 40, 3.0, true],
            [HkTaskType::Reclean, 30, 2.0, true],
            [HkTaskType::Inspection, 15, 1.0, false],
            [HkTaskType::LaundryRoom, 30, 3.0, false],
            [HkTaskType::Miscellaneous, 15, 1.0, false],
            [HkTaskType::WalkDown, 30, 3.0, false],
        ];

        foreach ($defaults as [$type, $minutes, $points, $inspection]) {
            HkCleaningStandard::create([
                'task_type' => $type->value,
                'default_minutes' => $minutes,
                'default_points' => $points,
                'inspection_required' => $inspection,
            ]);
        }
    }
}
