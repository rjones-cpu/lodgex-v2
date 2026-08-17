<?php

namespace App\Services\Scorecard;

use InvalidArgumentException;

class ScorecardGradeCalculator
{
    /**
     * Official order: lowest applicable component wins. Never average.
     *
     * @var list<string>
     */
    public const ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

    /**
     * @param  array<string, string|null>  $components
     */
    public function grade(array $components): string
    {
        $applicable = [];

        foreach ($components as $value) {
            if ($value === null) {
                continue;
            }

            $normalized = strtoupper(trim((string) $value));
            if ($normalized === '' || $normalized === 'N/A' || $normalized === 'NA') {
                continue;
            }

            if (! in_array($normalized, self::ORDER, true)) {
                throw new InvalidArgumentException("Unknown scorecard component grade [{$normalized}].");
            }

            $applicable[] = $normalized;
        }

        if ($applicable === []) {
            throw new InvalidArgumentException('Scorecard grade requires at least one applicable component.');
        }

        $lowest = $applicable[0];
        foreach ($applicable as $grade) {
            if ($this->rank($grade) > $this->rank($lowest)) {
                $lowest = $grade;
            }
        }

        return $lowest;
    }

    private function rank(string $grade): int
    {
        $index = array_search($grade, self::ORDER, true);

        return $index === false ? PHP_INT_MAX : $index;
    }
}
