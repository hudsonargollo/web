<?php

namespace App\Lab;

use App\Models\LabProject;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

/**
 * Lab projects belong to a single account — UUID in the URL is not enough.
 */
final class LabProjectAccess
{
    public static function owns(LabProject $project, ?User $user): bool
    {
        if ($user === null || $project->user_id === null) {
            return false;
        }

        return (int) $project->user_id === (int) $user->id;
    }

    public static function assertOwner(LabProject $project, ?User $user): void
    {
        if (! self::owns($project, $user)) {
            throw new AuthorizationException('You do not own this Lab project.');
        }
    }

    public static function assertWritable(LabProject $project, ?User $user): void
    {
        self::assertOwner($project, $user);

        if ($project->isFrozen()) {
            throw new AuthorizationException('This Lab project is frozen.');
        }
    }
}
