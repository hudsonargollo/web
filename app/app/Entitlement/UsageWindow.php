<?php

namespace App\Entitlement;

enum UsageWindow: string
{
    case None = 'none';
    case Monthly = 'monthly';
    case Lifetime = 'lifetime';

    public function periodKey(?\DateTimeInterface $at = null): string
    {
        $moment = $at ?? now();

        return match ($this) {
            self::Monthly => $moment->format('Y-m'),
            self::Lifetime, self::None => 'lifetime',
        };
    }
}
