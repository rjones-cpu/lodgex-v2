<?php

namespace App\Services\RoomUtilization;

use App\Models\User;
use App\Models\UtilizationApprovalRequest;
use App\Models\UtilizationAuditLog;

class UtilizationAuditLogger
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function log(
        string $subjectType,
        ?int $subjectId,
        string $action,
        ?string $category = null,
        ?User $user = null,
        ?string $notes = null,
        array $context = [],
    ): UtilizationAuditLog {
        return UtilizationAuditLog::create([
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'action' => $action,
            'category' => $category,
            'user_id' => $user?->id,
            'notes' => $notes,
            'context' => $context,
        ]);
    }

    public function logApproval(
        UtilizationApprovalRequest $request,
        string $action,
        ?User $user = null,
        ?string $notes = null,
    ): UtilizationAuditLog {
        return $this->log(
            'approval_request',
            $request->id,
            $action,
            $request->type,
            $user,
            $notes,
            ['title' => $request->title, 'risk_level' => $request->risk_level],
        );
    }
}
