<?php

namespace App\Ai\Contracts;

use App\Ai\Data\ChatRequest;
use App\Ai\Data\ChatResponse;

interface ChatDriver
{
    public function complete(ChatRequest $request): ChatResponse;
}
