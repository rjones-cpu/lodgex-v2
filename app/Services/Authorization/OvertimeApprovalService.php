<?php

namespace App\Services\Authorization;

use App\Models\User;
use App\Services\Ai\AiAuditLogger;
use Illuminate\Auth\Access\AuthorizationException;

class OvertimeApprovalService
{
    public function __construct(
        private readonly LodgeManagerAuthorizer $lodgeManagers,
        private readonly AiAuditLogger $auditLogger,
    ) {}

    /**
     * Only a Lodge Manager may approve overtime. Fail closed.
     *
     * @throws AuthorizationException
     */
    public function approve(User $user, array $context = []): void
    {
        if (! $this->lodgeManagers->isLodgeManager($user)) {
            $this->auditLogger->log(
                action: 'overtime_denied',
                user: $user,
                notes: 'Overtime approval denied — Lodge Manager role required.',
                context: $context,
            );

            throw new AuthorizationException('Only a Lodge Manager may approve overtime.');
        }

        $this->auditLogger->log(
            action: 'overtime_approved',
            user: $user,
            notes: 'Lodge Manager approved overtime.',
            context: $context,
        );
    }

    public function canApprove(?User $user): bool
    {
        return $this->lodgeManagers->isLodgeManager($user);
    }
}
