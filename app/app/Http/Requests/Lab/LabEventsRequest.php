<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class LabEventsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'events' => ['required', 'array', 'min:1', 'max:40'],
            'events.*.type' => ['required', 'string', 'max:120'],
            'events.*.path' => ['nullable', 'string', 'max:500'],
            'events.*.status' => ['nullable', 'string', 'max:64'],
            'events.*.hint' => ['nullable', 'string', 'max:120'],
            'events.*.errorClass' => ['nullable', 'string', 'max:120'],
            'events.*.summary' => ['nullable', 'string', 'max:500'],
            'events.*.artifacts' => ['nullable', 'array'],
            // Brick\Math rejects underscored numeric max (50_000_000) — use plain digits.
            'events.*.contentBytes' => ['nullable', 'integer', 'min:0', 'max:50000000'],
            'events.*.beforeBytes' => ['nullable', 'integer', 'min:0', 'max:50000000'],
            'events.*.contentHead' => ['nullable', 'string', 'max:200'],
            'events.*.contentTail' => ['nullable', 'string', 'max:120'],
            'events.*.contentFingerprint' => ['nullable', 'string', 'max:64'],
            'events.*.tool' => ['nullable', 'string', 'max:64'],
            'events.*.meta' => ['nullable', 'array'],
        ];
    }
}
