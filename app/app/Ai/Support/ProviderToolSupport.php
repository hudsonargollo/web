<?php

namespace App\Ai\Support;

/**
 * Normalize Lab tool defs / tool_choice across Anthropic, OpenAI-compatible, and Gemini.
 */
final class ProviderToolSupport
{
    /**
     * Extract a forced tool name from OpenAI/Anthropic-style tool_choice arrays.
     *
     * @param  string|array<string, mixed>|null  $toolChoice
     */
    public static function forcedToolName(string|array|null $toolChoice): ?string
    {
        if (! is_array($toolChoice)) {
            return null;
        }

        $type = (string) ($toolChoice['type'] ?? '');

        if ($type === 'function') {
            $name = (string) data_get($toolChoice, 'function.name', '');

            return $name !== '' ? $name : null;
        }

        if ($type === 'tool') {
            $name = (string) ($toolChoice['name'] ?? '');

            return $name !== '' ? $name : null;
        }

        $nested = (string) data_get($toolChoice, 'function.name', '');

        return $nested !== '' ? $nested : null;
    }

    /**
     * True when the client is forcing a specific tool (e.g. write_file after patch miss).
     *
     * @param  string|array<string, mixed>|null  $toolChoice
     */
    public static function isForcedToolChoice(string|array|null $toolChoice): bool
    {
        return self::forcedToolName($toolChoice) !== null;
    }

    /**
     * @param  string|array<string, mixed>|null  $toolChoice
     */
    public static function openAiToolChoice(string|array|null $toolChoice): string|array
    {
        $forced = self::forcedToolName($toolChoice);
        if ($forced !== null) {
            return [
                'type' => 'function',
                'function' => ['name' => $forced],
            ];
        }

        if (is_array($toolChoice)) {
            return 'required';
        }

        return match ($toolChoice) {
            'none' => 'none',
            'auto' => 'auto',
            // Executor builds: require at least one tool call (prose-only leaves VFS empty).
            'required', 'any', null => 'required',
            default => 'required',
        };
    }

    /**
     * @param  string|array<string, mixed>|null  $toolChoice
     * @return array{type: string, name?: string}
     */
    public static function anthropicToolChoice(string|array|null $toolChoice): array
    {
        $forced = self::forcedToolName($toolChoice);
        if ($forced !== null) {
            return ['type' => 'tool', 'name' => $forced];
        }

        if (is_array($toolChoice) && isset($toolChoice['type'])) {
            $type = (string) $toolChoice['type'];

            return ['type' => $type === 'required' ? 'any' : $type];
        }

        return match ($toolChoice) {
            'none' => ['type' => 'none'],
            'auto' => ['type' => 'auto'],
            'required', 'any', null => ['type' => 'any'],
            default => ['type' => 'any'],
        };
    }

    /**
     * @param  string|array<string, mixed>|null  $toolChoice
     */
    public static function geminiToolMode(string|array|null $toolChoice): string
    {
        if (self::forcedToolName($toolChoice) !== null) {
            return 'ANY';
        }

        if (is_array($toolChoice)) {
            $type = (string) ($toolChoice['type'] ?? '');
            if ($type === 'none') {
                return 'NONE';
            }
            if ($type === 'auto') {
                return 'AUTO';
            }
            if ($type === 'any' || $type === 'required') {
                return 'ANY';
            }
        }

        return match ($toolChoice) {
            'none' => 'NONE',
            'auto' => 'AUTO',
            'required', 'any', null => 'ANY',
            default => 'ANY',
        };
    }

    /**
     * Full Gemini functionCallingConfig (supports allowed_function_names for forced tools).
     *
     * @param  string|array<string, mixed>|null  $toolChoice
     * @return array{mode: string, allowed_function_names?: list<string>}
     */
    public static function geminiFunctionCallingConfig(string|array|null $toolChoice): array
    {
        $config = [
            'mode' => self::geminiToolMode($toolChoice),
        ];

        $forced = self::forcedToolName($toolChoice);
        if ($forced !== null) {
            $config['mode'] = 'ANY';
            $config['allowed_function_names'] = [$forced];
        }

        return $config;
    }

    /**
     * OpenAI tools → Anthropic tools[].
     *
     * @param  list<array<string, mixed>>  $tools
     * @return list<array<string, mixed>>
     */
    public static function toAnthropicTools(array $tools): array
    {
        $out = [];
        foreach ($tools as $tool) {
            $fn = $tool['function'] ?? null;
            if (! is_array($fn) || ($fn['name'] ?? '') === '') {
                continue;
            }
            $out[] = [
                'name' => (string) $fn['name'],
                'description' => (string) ($fn['description'] ?? ''),
                'input_schema' => self::normalizeToolParameters($fn['parameters'] ?? null),
            ];
        }

        return $out;
    }

    /**
     * OpenAI tools → Gemini functionDeclarations.
     *
     * @param  list<array<string, mixed>>  $tools
     * @return list<array<string, mixed>>
     */
    public static function toGeminiDeclarations(array $tools): array
    {
        $out = [];
        foreach ($tools as $tool) {
            $fn = $tool['function'] ?? null;
            if (! is_array($fn) || ($fn['name'] ?? '') === '') {
                continue;
            }
            $out[] = [
                'name' => (string) $fn['name'],
                'description' => (string) ($fn['description'] ?? ''),
                'parameters' => self::normalizeToolParameters($fn['parameters'] ?? null),
            ];
        }

        return $out;
    }

    /**
     * JSON Schema `properties` must be an object `{}`. PHP `[]` encodes as an
     * array and Anthropic rejects it (HTTP 400: input_schema.properties).
     *
     * @param  array<string, mixed>|null  $parameters
     * @return array<string, mixed>
     */
    public static function normalizeToolParameters(?array $parameters): array
    {
        $schema = is_array($parameters) ? $parameters : [];
        if (($schema['type'] ?? '') === '') {
            $schema['type'] = 'object';
        }
        $schema['properties'] = self::jsonSchemaPropertyMap($schema['properties'] ?? null);

        if (array_key_exists('required', $schema) && is_array($schema['required']) && $schema['required'] === []) {
            unset($schema['required']);
        }

        return $schema;
    }

    /**
     * @return array<string, mixed>|\stdClass
     */
    public static function jsonSchemaPropertyMap(mixed $properties): array|\stdClass
    {
        if ($properties instanceof \stdClass) {
            return $properties;
        }
        if (! is_array($properties) || $properties === [] || array_is_list($properties)) {
            return new \stdClass;
        }

        return $properties;
    }
}
