<?php

namespace App\Entitlement;

enum GrantKind: string
{
    case Feature = 'feature';
    case Quota = 'quota';
}
