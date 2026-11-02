<?php

namespace App\Support\Geography;

use DateTimeZone;

final class Timezones
{
    /**
     * @return list<string>
     */
    public static function identifiers(): array
    {
        return DateTimeZone::listIdentifiers();
    }
}
