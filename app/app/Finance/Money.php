<?php

namespace App\Finance;

use App\Support\Site\SiteSettings;
use Cknow\Money\Money as MoneyValue;
use NumberFormatter;
use Throwable;

final class Money
{
    public static function defaultCurrency(): string
    {
        if (app()->bound(SiteSettings::class)) {
            $code = app(SiteSettings::class)->currency();

            if ($code !== '' && MoneyValue::isValidCurrency($code)) {
                if (MoneyValue::getDefaultCurrency() !== $code) {
                    MoneyValue::setDefaultCurrency($code);
                }

                return $code;
            }
        }

        return MoneyValue::getDefaultCurrency();
    }

    public static function symbol(?string $currency = null): string
    {
        $formatter = new NumberFormatter(
            (string) config('money.locale', 'en_US'),
            NumberFormatter::CURRENCY
        );
        $formatter->setTextAttribute(
            NumberFormatter::CURRENCY_CODE,
            strtoupper($currency ?: self::defaultCurrency())
        );

        return $formatter->getSymbol(NumberFormatter::CURRENCY_SYMBOL);
    }

    public static function parseDecimal(mixed $value, ?string $currency = null): ?MoneyValue
    {
        if ($value instanceof MoneyValue) {
            return $value;
        }

        if ($value === null || $value === '') {
            return null;
        }

        $currency = strtoupper($currency ?: self::defaultCurrency());
        $raw = is_int($value) || is_float($value)
            ? number_format((float) $value, 2, '.', '')
            : trim((string) $value);

        if ($raw === '') {
            return null;
        }

        if (preg_match('/^-?\d+(\.\d+)?$/', $raw) === 1) {
            return MoneyValue::parseByDecimal(
                str_contains($raw, '.') ? $raw : number_format((float) $raw, 2, '.', ''),
                $currency
            );
        }

        return MoneyValue::parse($raw, $currency, true);
    }

    public static function major(MoneyValue|float|int|string|null $amount): float
    {
        if ($amount instanceof MoneyValue) {
            return (float) $amount->formatByDecimal();
        }

        return (float) ($amount ?? 0);
    }

    public static function format(float|int|string|null $amount, string $currency = 'USD'): string
    {
        $currency = strtoupper($currency !== '' ? $currency : self::defaultCurrency());

        try {
            return self::parseDecimal($amount ?? 0, $currency)?->format()
                ?? $currency.' '.number_format((float) ($amount ?? 0), 2, '.', ',');
        } catch (Throwable) {
            return $currency.' '.number_format((float) ($amount ?? 0), 2, '.', ',');
        }
    }

    public static function fromStripeCents(mixed $cents): float
    {
        return round(((int) $cents) / 100, 2);
    }
}
