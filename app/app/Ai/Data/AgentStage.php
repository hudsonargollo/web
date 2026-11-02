<?php

namespace App\Ai\Data;

/**
 * Orchestration stage for staged ContextPack injection (Router → Planner → Executor).
 */
enum AgentStage: string
{
    case Router = 'router';
    case Planner = 'planner';
    case Executor = 'executor';
    case Chat = 'chat';
    case Clarify = 'clarify';
}
