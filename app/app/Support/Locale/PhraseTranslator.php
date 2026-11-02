<?php

namespace App\Support\Locale;

use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatRequest;
use App\Ai\Exceptions\AiException;
use App\Ai\ModelCatalog;
use App\Ai\PromptStore;
use App\Ai\ProviderFactory;
use App\Models\Language;

class PhraseTranslator
{
    public function __construct(
        private readonly ModelCatalog $catalog,
        private readonly ProviderFactory $providers,
        private readonly PromptStore $prompts,
    ) {}

    /**
     * @param  array<string, string>  $phrases  key => source text
     * @return array<string, string> key => translated text
     */
    public function translate(Language $language, array $phrases): array
    {
        if ($phrases === []) {
            return [];
        }

        $modelId = $this->catalog->defaultId();

        if ($modelId === '' || ! $this->catalog->has($modelId)) {
            throw new AiException(__('dashboard.No active AI model is configured.'));
        }

        $model = $this->catalog->get($modelId);

        if (! $model->available) {
            throw new AiException(__('dashboard.The active AI model has no API key.'));
        }

        $driver = $this->providers->make($model->provider);
        $response = $driver->complete(new ChatRequest(
            apiModel: $model->apiModel,
            system: $this->prompts->get('translate'),
            messages: [
                ChatMessage::user($this->userPrompt($language, $phrases)),
            ],
            options: [
                'temperature' => 0.2,
                'max_tokens' => 4096,
            ],
        ));

        return self::decodeMap($response->content, array_keys($phrases));
    }

    /**
     * @param  list<string>  $allowedKeys
     * @return array<string, string>
     */
    public static function decodeMap(string $content, array $allowedKeys): array
    {
        $decoded = self::extractObject($content);

        if ($decoded === null) {
            throw new AiException(__('dashboard.The model did not return usable translations.'));
        }

        $allowed = array_fill_keys($allowedKeys, true);
        $mapped = [];

        foreach ($decoded as $key => $value) {
            $key = (string) $key;

            if (! isset($allowed[$key])) {
                continue;
            }

            if (is_scalar($value) || $value === null) {
                $mapped[$key] = (string) $value;
            }
        }

        if ($mapped === []) {
            throw new AiException(__('dashboard.The model did not return usable translations.'));
        }

        return $mapped;
    }

    /**
     * @param  array<string, string>  $phrases
     */
    private function userPrompt(Language $language, array $phrases): string
    {
        $target = $language->name;
        $native = trim((string) $language->native_name);

        if ($native !== '' && $native !== $target) {
            $target .= ' ('.$native.')';
        }

        $payload = json_encode($phrases, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return implode("\n", [
            'Target language: '.$target.' ['.$language->code.']',
            'Translate only the values. Keep every key unchanged.',
            'Return a JSON object and nothing else.',
            '',
            $payload !== false ? $payload : '{}',
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function extractObject(string $content): ?array
    {
        $trimmed = trim($content);

        if ($trimmed === '') {
            return null;
        }

        if (preg_match('/```(?:json)?\s*(\{.*\})\s*```/s', $trimmed, $matches) === 1) {
            $trimmed = $matches[1];
        }

        $decoded = json_decode($trimmed, true);

        if (is_array($decoded) && ! array_is_list($decoded)) {
            return $decoded;
        }

        $start = strpos($trimmed, '{');
        $end = strrpos($trimmed, '}');

        if ($start === false || $end === false || $end <= $start) {
            return null;
        }

        $decoded = json_decode(substr($trimmed, $start, $end - $start + 1), true);

        return is_array($decoded) && ! array_is_list($decoded) ? $decoded : null;
    }
}
