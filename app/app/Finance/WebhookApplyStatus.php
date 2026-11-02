<?php

namespace App\Finance;

enum WebhookApplyStatus: string
{
    case Received = 'received';
    case Applied = 'applied';
    case Ignored = 'ignored';
    case Failed = 'failed';
}
