<?php

namespace App\Mail;

use App\Models\Contact;
use App\Support\Site\SiteSettings;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ContactReplyMail extends Mailable
{
    public function __construct(
        public Contact $contact,
        public string $reply,
    ) {}

    public function envelope(): Envelope
    {
        $name = app(SiteSettings::class)->name();

        return new Envelope(
            subject: __('dashboard.Re: your note to :name', ['name' => $name]),
        );
    }

    public function content(): Content
    {
        $paragraphs = collect(preg_split("/\R{2,}/", trim($this->reply)) ?: [])
            ->map(fn (string $block): string => '<p>'.nl2br(e(trim($block))).'</p>')
            ->implode('');

        return new Content(
            htmlString: $paragraphs !== '' ? $paragraphs : '<p>'.e($this->reply).'</p>',
        );
    }
}
