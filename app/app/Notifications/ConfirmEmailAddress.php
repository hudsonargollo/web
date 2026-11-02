<?php

namespace App\Notifications;

use App\Support\OpaqueEmailToken;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class ConfirmEmailAddress extends Notification
{
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes((int) config('auth.verification.expire', 60)),
            [
                'token' => OpaqueEmailToken::seal([
                    'id' => $notifiable->getKey(),
                    'email' => sha1($notifiable->getEmailForVerification()),
                ]),
            ]
        );

        return (new MailMessage)
            ->subject('Confirm your email')
            ->line('Confirm your email address to finish setting up your account.')
            ->action('Confirm email', $url)
            ->line('If you did not create an account, no further action is required.');
    }
}
