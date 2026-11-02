<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class LabTurnStateRequest extends FormRequest
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
            'message_id' => ['nullable', 'integer', 'min:1'],
            'content' => ['nullable', 'string', 'max:20000'],
            'metadata' => ['required', 'array'],
            'metadata.thinking' => ['nullable', 'array'],
            'metadata.thinking.status' => ['nullable', 'string', 'max:32'],
            'metadata.thinking.text' => ['nullable', 'string', 'max:50000'],
            'metadata.thinking.durationSec' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'metadata.todos' => ['nullable', 'array'],
            'metadata.todos.status' => ['nullable', 'string', 'max:32'],
            'metadata.todos.items' => ['nullable', 'array', 'max:100'],
            'metadata.toolActivity' => ['nullable', 'array'],
            'metadata.toolActivity.status' => ['nullable', 'string', 'max:32'],
            'metadata.toolActivity.label' => ['nullable', 'string', 'max:200'],
            'metadata.toolActivity.entries' => ['nullable', 'array', 'max:40'],
            'metadata.listDir' => ['nullable', 'array'],
            'metadata.fileSearch' => ['nullable', 'array'],
            'metadata.grep' => ['nullable', 'array'],
            'metadata.readFile' => ['nullable', 'array'],
            'metadata.editFile' => ['nullable', 'array'],
            'metadata.shell' => ['nullable', 'array'],
            'metadata.fetch' => ['nullable', 'array'],
            'metadata.writeFile' => ['nullable', 'array'],
            'metadata.tool_calls' => ['nullable', 'array', 'max:100'],
            'metadata.checklist' => ['nullable', 'array'],
            'metadata.buildGate' => ['nullable', 'string', 'max:32'],
            'metadata.callouts' => ['nullable', 'array', 'max:20'],
            'metadata.botFollowUp' => ['nullable', 'string', 'max:20000'],
            'metadata.skipDivider' => ['nullable', 'boolean'],
            'metadata.turnStatus' => ['nullable', 'string', 'max:80'],
            'metadata.waitStartedAt' => ['nullable'],
        ];
    }
}
