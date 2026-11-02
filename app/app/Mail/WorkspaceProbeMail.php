<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WorkspaceProbeMail extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('dashboard.Krikkit test email'),
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: '<p>'.e(__('dashboard.If you received this, workspace mail is working.')).'</p>',
        );
    }
}
