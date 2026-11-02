<?php

namespace App\Casts;

use Cknow\Money\Casts\MoneyDecimalCast;

final class MoneyDecimal extends MoneyDecimalCast
{
    public function __construct(?string $currency = null)
    {
        parent::__construct($currency, true);
    }
}
