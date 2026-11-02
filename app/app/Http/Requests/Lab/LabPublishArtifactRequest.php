<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class LabPublishArtifactRequest extends FormRequest
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
        $maxKilobytes = max(1, (int) ceil(((int) config('lab.publish.artifact_max_bytes', 50 * 1024 * 1024)) / 1024));

        return [
            'artifact' => ['required', 'file', 'max:'.$maxKilobytes, 'mimes:zip,application/zip,application/x-zip-compressed'],
        ];
    }
}
