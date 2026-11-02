<?php

namespace App\Livewire\Dashboard\Languages\Traits;

use App\Models\Language;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

trait ManagesLanguageForm
{
    public string $code = '';

    public string $name = '';

    public string $nativeName = '';

    public string $direction = 'ltr';

    public bool $enabled = true;

    public bool $isDefault = false;

    /**
     * @return array<string, mixed>
     */
    protected function languageRules(?Language $language = null): array
    {
        return [
            'code' => [
                $language === null ? 'required' : 'nullable',
                'string',
                'max:16',
                'regex:/^[A-Za-z]{2}(?:-[A-Za-z]{2})?$/',
                Rule::unique('languages', 'code')->ignore($language?->id),
            ],
            'name' => ['required', 'string', 'max:80'],
            'nativeName' => ['nullable', 'string', 'max:80'],
            'direction' => ['required', 'in:ltr,rtl'],
            'enabled' => ['boolean'],
            'isDefault' => ['boolean'],
        ];
    }

    protected function fillFromLanguage(Language $language): void
    {
        $this->code = $language->code;
        $this->name = $language->name;
        $this->nativeName = (string) $language->native_name;
        $this->direction = $language->direction === 'rtl' ? 'rtl' : 'ltr';
        $this->enabled = $language->enabled;
        $this->isDefault = $language->is_default;
    }

    protected function persistLanguage(?Language $language = null): Language
    {
        $validated = $this->validate($this->languageRules($language));
        $isFirst = $language === null && ! Language::query()->exists();
        $isDefault = $isFirst || (bool) $validated['isDefault'];
        $enabled = $isDefault ? true : (bool) $validated['enabled'];

        if ($language !== null && $language->is_default && ! $isDefault) {
            throw ValidationException::withMessages([
                'isDefault' => __('dashboard.Keep one default language.'),
            ]);
        }

        $payload = [
            'name' => trim((string) $validated['name']),
            'native_name' => trim((string) ($validated['nativeName'] ?? '')),
            'direction' => (string) $validated['direction'],
            'enabled' => $enabled,
            'is_default' => $isDefault,
        ];

        if ($language === null) {
            $payload['code'] = Language::normalizeCode((string) $validated['code']);
            $language = Language::query()->create($payload);
        } else {
            $language->fill($payload);
            $language->save();
        }

        return $language->fresh() ?? $language;
    }
}
