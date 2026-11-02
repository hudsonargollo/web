<?php

namespace App\Finance;

enum InvoiceStatus: string
{
    case Paid = 'paid';
    case Open = 'open';
    case Failed = 'failed';
    case Refunded = 'refunded';
}
