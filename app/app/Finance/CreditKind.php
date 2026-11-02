<?php

namespace App\Finance;

enum CreditKind: string
{
    case Purchase = 'purchase';
    case Grant = 'grant';
    case Adjustment = 'adjustment';
    case Topup = 'topup';
}
