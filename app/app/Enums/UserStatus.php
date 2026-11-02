<?php

namespace App\Enums;

enum UserStatus: string
{
    case Active = 'active';
    case Invited = 'invited';
    case Disabled = 'disabled';

    public function label(): string
    {
        return match ($this) {
            self::Active => __('dashboard.Active'),
            self::Invited => __('dashboard.Invited'),
            self::Disabled => __('dashboard.Disabled'),
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
