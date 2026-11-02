<?php

namespace App\Finance;

use Cknow\Money\Money;

final class Currencies
{
    /**
     * @return array<string, string>
     */
    public static function options(): array
    {
        $options = [];

        foreach (Money::getISOCurrencies() as $code => $meta) {
            $name = is_array($meta) ? trim((string) ($meta['currency'] ?? '')) : '';
            $options[$code] = $name !== '' ? $code.' — '.$name : $code;
        }

        ksort($options);

        return $options;
    }

    /**
     * @return list<string>
     */
    public static function codes(): array
    {
        return array_keys(self::options());
    }
}
