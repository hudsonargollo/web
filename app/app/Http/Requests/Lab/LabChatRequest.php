<?php

namespace App\Http\Requests\Lab;

use App\Ai\Data\AgentStage;
use App\Ai\ModelCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LabChatRequest extends FormRequest
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
        $catalog = app(ModelCatalog::class);
        $ids = array_map(fn ($model) => $model->id, $catalog->all());
        $stages = array_map(static fn (AgentStage $s) => $s->value, AgentStage::cases());

        return [
            'model' => ['nullable', 'string', Rule::in($ids)],
            'project' => ['nullable', 'uuid'],
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'string', Rule::in(['user', 'assistant'])],
            'messages.*.content' => ['present', 'string', 'max:20000'],
            'stage' => ['nullable', 'string', Rule::in($stages)],
            'context_pack' => ['nullable', 'array'],
            'context_pack.version' => ['nullable', 'integer'],
            'context_pack.stage' => ['nullable', 'string', Rule::in($stages)],
            'context_pack.pack' => ['nullable', 'array'],
            'tools' => ['nullable', 'array'],
            'tool_choice' => ['nullable'],
            'persist_user' => ['nullable', 'boolean'],
            'persist_assistant' => ['nullable', 'boolean'],
            'auto_repair' => ['nullable', 'array'],
            'auto_repair.type' => ['nullable', 'string', Rule::in(['AUTO_REPAIR'])],
            'auto_repair.errorType' => ['nullable', 'string', Rule::in(['BUILD_ERROR', 'RUNTIME_ERROR', 'RUNTIME_CONSOLE_ERROR'])],
            'auto_repair.error_type' => ['nullable', 'string', Rule::in(['BUILD_ERROR', 'RUNTIME_ERROR', 'RUNTIME_CONSOLE_ERROR'])],
            'auto_repair.message' => ['nullable', 'string', 'max:4000'],
            'auto_repair.stack' => ['nullable', 'string', 'max:12000'],
            'auto_repair.file' => ['nullable', 'string', 'max:500'],
            'auto_repair.component' => ['nullable', 'string', 'max:200'],
            'auto_repair.line' => ['nullable'],
            'auto_repair.subtitle' => ['nullable', 'string', 'max:300'],
            'auto_repair.targets' => ['nullable', 'array', 'max:20'],
            'auto_repair.targets.*' => ['nullable', 'string', 'max:500'],
            'auto_repair.errors' => ['nullable', 'array', 'max:20'],
            'auto_repair.errors.*.message' => ['nullable', 'string', 'max:4000'],
            'auto_repair.errors.*.stack' => ['nullable', 'string', 'max:12000'],
            'auto_repair.errors.*.file' => ['nullable', 'string', 'max:500'],
            'auto_repair.errors.*.component' => ['nullable', 'string', 'max:200'],
            'auto_repair.errors.*.line' => ['nullable'],
            'preview_edits' => ['nullable', 'array', 'max:8'],
            'preview_edits.*.id' => ['nullable', 'string', 'max:120'],
            'preview_edits.*.kind' => ['nullable', 'string', 'max:32'],
            'preview_edits.*.icon' => ['nullable', 'string', 'max:32'],
            'preview_edits.*.action' => ['nullable', 'string', 'max:40'],
            'preview_edits.*.title' => ['nullable', 'string', 'max:80'],
            'preview_edits.*.snippet' => ['nullable', 'string', 'max:240'],
            'preview_edits.*.element' => ['nullable', 'array'],
            'preview_edits.*.applied' => ['nullable', 'array'],
            'stream' => ['nullable', 'boolean'],
        ];
    }
}
