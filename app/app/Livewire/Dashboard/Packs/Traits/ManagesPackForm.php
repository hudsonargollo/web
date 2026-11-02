<?php

namespace App\Livewire\Dashboard\Packs\Traits;

use App\Ai\Data\ToolCall;
use App\Entitlement\EntitlementCatalog;
use App\Entitlement\GrantKind;
use App\Entitlement\LabCreditMeter;
use App\Entitlement\UsageWindow;
use App\Finance\Money as MoneyAmount;
use App\Models\EntitlementPlan;
use Cknow\Money\Money;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Money\Exception\ParserException;

trait ManagesPackForm
{
    public string $title = '';

    public string $slug = '';

    public string $summary = '';

    public string $rank = '10';

    public ?string $priceMonthly = null;

    public ?string $priceYearly = null;

    public bool $isDefault = false;

    public bool $isActive = true;

    /**
     * @var array<string, array{allowed?: bool, unlimited?: bool, ceiling?: string}>
     */
    public array $grants = [];

    /**
     * @return list<array{code: string, kind: GrantKind, window: UsageWindow, meter: string, title: string}>
     */
    protected function catalog(): array
    {
        return EntitlementCatalog::definitions();
    }

    /**
     * Worked examples of how Lab usage becomes credits. Numbers come from LabCreditMeter.
     *
     * @return list<array{scenario: string, model: string, input: string, output: string, credits: int}>
     */
    protected function creditExamples(): array
    {
        $meter = app(LabCreditMeter::class);
        $empty = ['cached_tokens' => 0, 'cache_creation_tokens' => 0];
        $short = ['input_tokens' => 800, 'output_tokens' => 200, ...$empty];
        $followUp = ['input_tokens' => 12_000, 'output_tokens' => 8_000, ...$empty];
        $codegen = ['input_tokens' => 45_000, 'output_tokens' => 70_000, ...$empty];
        $write = [new ToolCall('example', 'write_file', [
            'path' => 'src/App.jsx',
            'content' => str_repeat('a', 200_000),
        ])];

        return [
            [
                'scenario' => __('dashboard.Short chat'),
                'model' => 'Haiku',
                'input' => number_format(800),
                'output' => number_format(200),
                'credits' => $meter->quote($short, 'claude-haiku-4-5'),
            ],
            [
                'scenario' => __('dashboard.Short chat'),
                'model' => 'Sonnet',
                'input' => number_format(800),
                'output' => number_format(200),
                'credits' => $meter->quote($short, 'claude-sonnet-4-5'),
            ],
            [
                'scenario' => __('dashboard.Follow-up turn'),
                'model' => 'Haiku',
                'input' => number_format(12_000),
                'output' => number_format(8_000),
                'credits' => $meter->quote($followUp, 'claude-haiku-4-5'),
            ],
            [
                'scenario' => __('dashboard.Follow-up turn'),
                'model' => 'Sonnet',
                'input' => number_format(12_000),
                'output' => number_format(8_000),
                'credits' => $meter->quote($followUp, 'claude-sonnet-4-5'),
            ],
            [
                'scenario' => __('dashboard.Large codegen'),
                'model' => 'Haiku',
                'input' => number_format(45_000),
                'output' => number_format(70_000),
                'credits' => $meter->quote($codegen, 'claude-haiku-4-5'),
            ],
            [
                'scenario' => __('dashboard.Large codegen + file write'),
                'model' => 'Haiku',
                'input' => number_format(45_000),
                'output' => number_format(70_000),
                'credits' => $meter->quote($codegen, 'claude-haiku-4-5', $write),
            ],
            [
                'scenario' => __('dashboard.Large codegen'),
                'model' => 'Sonnet',
                'input' => number_format(45_000),
                'output' => number_format(70_000),
                'credits' => $meter->quote($codegen, 'claude-sonnet-4-5'),
            ],
        ];
    }

    protected function seedGrantDefaults(): void
    {
        foreach ($this->catalog() as $definition) {
            $code = $definition['code'];

            if ($definition['kind'] === GrantKind::Feature) {
                $this->grants[$code] = ['allowed' => false];

                continue;
            }

            $this->grants[$code] = [
                'unlimited' => false,
                'ceiling' => '0',
            ];
        }
    }

    protected function fillFromPlan(EntitlementPlan $plan): void
    {
        $plan->loadMissing('grants');

        $this->title = (string) $plan->title;
        $this->slug = (string) $plan->slug;
        $this->summary = (string) ($plan->summary ?: '');
        $this->rank = (string) $plan->rank;
        $this->priceMonthly = $this->priceInput($plan->price_monthly);
        $this->priceYearly = $this->priceInput($plan->price_yearly);
        $this->isDefault = (bool) $plan->is_default;
        $this->isActive = (bool) $plan->is_active;
        $this->seedGrantDefaults();

        foreach ($plan->grants as $grant) {
            if ($grant->kind === GrantKind::Feature) {
                $this->grants[$grant->code] = ['allowed' => (bool) $grant->allowed];

                continue;
            }

            $this->grants[$grant->code] = [
                'unlimited' => $grant->isUnlimited(),
                'ceiling' => $grant->isUnlimited() ? '' : (string) $grant->ceiling,
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function packRules(?EntitlementPlan $plan = null): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:80'],
            'slug' => [
                'required',
                'string',
                'max:40',
                'alpha_dash',
                Rule::unique('entitlement_plans', 'slug')->ignore($plan?->id),
            ],
            'summary' => ['nullable', 'string', 'max:180'],
            'rank' => ['required', 'integer', 'min:0', 'max:999'],
            'priceMonthly' => $this->priceRules(),
            'priceYearly' => $this->priceRules(),
            'isDefault' => ['boolean'],
            'isActive' => ['boolean'],
        ];

        foreach ($this->catalog() as $definition) {
            $code = $definition['code'];

            if ($definition['kind'] === GrantKind::Feature) {
                $rules["grants.$code.allowed"] = ['boolean'];

                continue;
            }

            $rules["grants.$code.unlimited"] = ['boolean'];
            $rules["grants.$code.ceiling"] = ['nullable', 'integer', 'min:0', 'max:1000000'];
        }

        return $rules;
    }

    protected function persistPack(?EntitlementPlan $plan = null): EntitlementPlan
    {
        if ($plan !== null && $plan->isBuiltIn()) {
            $this->slug = $plan->slug;
        } elseif (blank($this->slug)) {
            $this->slug = Str::slug($this->title);
        }

        $this->normalizeGrants();
        $this->normalizePrices();

        $validated = $this->validate($this->packRules($plan));

        if (! $validated['isActive'] && $validated['isDefault']) {
            throw ValidationException::withMessages([
                'isActive' => __('dashboard.The default pack cannot be locked.'),
            ]);
        }

        if ($plan?->is_default && ! $validated['isDefault']) {
            $otherDefault = EntitlementPlan::query()
                ->where('is_default', true)
                ->whereKeyNot($plan->id)
                ->exists();

            if (! $otherDefault) {
                throw ValidationException::withMessages([
                    'isDefault' => __('dashboard.Keep one default pack.'),
                ]);
            }
        }

        $row = $plan ?? new EntitlementPlan;
        $row->fill([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'summary' => filled($validated['summary'] ?? null) ? $validated['summary'] : null,
            'rank' => (int) $validated['rank'],
            'price_monthly' => $this->toMoney($validated['priceMonthly'] ?? null),
            'price_yearly' => $this->toMoney($validated['priceYearly'] ?? null),
            'is_default' => (bool) $validated['isDefault'],
            'is_active' => (bool) $validated['isActive'],
        ])->save();

        if ($row->is_default) {
            EntitlementPlan::query()
                ->whereKeyNot($row->id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        foreach ($this->catalog() as $definition) {
            $code = $definition['code'];
            $input = $validated['grants'][$code] ?? [];

            if ($definition['kind'] === GrantKind::Feature) {
                $row->grants()->updateOrCreate(
                    ['code' => $code],
                    [
                        'kind' => GrantKind::Feature->value,
                        'allowed' => (bool) ($input['allowed'] ?? false),
                        'ceiling' => null,
                        'window' => UsageWindow::None->value,
                    ]
                );

                continue;
            }

            $unlimited = (bool) ($input['unlimited'] ?? false);

            $row->grants()->updateOrCreate(
                ['code' => $code],
                [
                    'kind' => GrantKind::Quota->value,
                    'allowed' => true,
                    'ceiling' => $unlimited ? null : (int) ($input['ceiling'] ?? 0),
                    'window' => $definition['window']->value,
                ]
            );
        }

        return $row->fresh(['grants']);
    }

    public function packCurrency(): string
    {
        return MoneyAmount::defaultCurrency();
    }

    public function packCurrencySymbol(): string
    {
        return MoneyAmount::symbol($this->packCurrency());
    }

    /**
     * @return list<mixed>
     */
    protected function priceRules(): array
    {
        return [
            'nullable',
            function (string $attribute, mixed $value, \Closure $fail): void {
                if (! filled($value)) {
                    return;
                }

                try {
                    $money = $this->toMoney($value);
                } catch (ParserException|InvalidArgumentException) {
                    $fail(__('dashboard.Enter a valid amount.'));

                    return;
                }

                if ($money === null) {
                    return;
                }

                if ($money->isNegative()) {
                    $fail(__('dashboard.Price cannot be negative.'));

                    return;
                }

                $ceiling = Money::parseByDecimal('999999.99', $this->packCurrency());

                if ($money->greaterThan($ceiling)) {
                    $fail(__('dashboard.Price is too large.'));
                }
            },
        ];
    }

    protected function priceInput(mixed $amount): ?string
    {
        if ($amount instanceof Money) {
            return $amount->formatByDecimal();
        }

        return filled($amount) ? (string) $amount : null;
    }

    protected function toMoney(mixed $value): ?Money
    {
        return MoneyAmount::parseDecimal($value, $this->packCurrency());
    }

    protected function normalizePrices(): void
    {
        $this->priceMonthly = filled($this->priceMonthly) ? trim((string) $this->priceMonthly) : null;
        $this->priceYearly = filled($this->priceYearly) ? trim((string) $this->priceYearly) : null;
    }

    protected function normalizeGrants(): void
    {
        foreach ($this->catalog() as $definition) {
            if ($definition['kind'] !== GrantKind::Quota) {
                continue;
            }

            $code = $definition['code'];
            $unlimited = (bool) ($this->grants[$code]['unlimited'] ?? false);

            if ($unlimited) {
                $this->grants[$code]['ceiling'] = null;

                continue;
            }

            if (($this->grants[$code]['ceiling'] ?? '') === '') {
                $this->grants[$code]['ceiling'] = '0';
            }
        }
    }
}
