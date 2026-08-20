<?php

namespace App\Services\Ai\Housekeeping;

/**
 * AI is not a source of truth for room or worker status.
 * Every labelled field carries one of these classes.
 */
class EvidenceClass
{
    public const SOURCE_FACT = 'source_fact';

    public const DETERMINISTIC_CALC = 'deterministic_calc';

    public const ASSUMPTION = 'assumption';

    public const RECOMMENDATION = 'recommendation';

    /**
     * Untrusted inputs: notes, uploads, free-text messages.
     */
    public static function isUntrusted(?string $source): bool
    {
        $source = strtolower(trim((string) $source));

        return in_array($source, ['note', 'notes', 'upload', 'message', 'unstructured', 'chat'], true);
    }
}
