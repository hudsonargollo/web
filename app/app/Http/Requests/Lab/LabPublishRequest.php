<?php

namespace App\Http\Requests\Lab;

use App\Models\LabPublication;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LabPublishRequest extends FormRequest
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
            'kind' => ['required', 'string', Rule::in([
                LabPublication::KIND_SUBDOMAIN,
                LabPublication::KIND_CUSTOM,
            ])],
            'subdomain' => ['nullable', 'string', 'max:48'],
            'custom_host' => ['nullable', 'string', 'max:253'],
        ];
    }
}
