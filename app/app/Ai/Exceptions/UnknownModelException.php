<?php

namespace App\Ai\Exceptions;

final class UnknownModelException extends AiException
{
    public static function for(string $modelId): self
    {
        return new self("Unknown AI model [{$modelId}]. Add it under config/ai.php → models.");
    }
}
