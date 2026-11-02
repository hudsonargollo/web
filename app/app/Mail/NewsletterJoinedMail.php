<?php

namespace App\Mail;

use App\Models\NewsletterSubscriber;
use App\Support\Site\SiteSettings;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class NewsletterJoinedMail extends Mailable
{
    public function __construct(
        public NewsletterSubscriber $subscriber,
    ) {}

    public function envelope(): Envelope
    {
        $name = app(SiteSettings::class)->name();

        return new Envelope(
            subject: __('home.You are on the :name list', ['name' => $name]),
        );
    }

    public function content(): Content
    {
        $name = app(SiteSettings::class)->name();

        return new Content(
            htmlString: '<p>'.e(__('home.Thanks — we will write when there is news from :name.', ['name' => $name])).'</p>',
        );
    }
}
