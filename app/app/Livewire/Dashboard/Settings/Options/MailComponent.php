<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Mail\WorkspaceProbeMail;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Throwable;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class MailComponent extends Component
{
    use HasSettingsChrome;

    public string $mailer = 'log';

    public string $fromName = '';

    public string $fromAddress = '';

    public string $replyTo = '';

    public string $host = '';

    public string $port = '587';

    public string $encryption = 'tls';

    public string $username = '';

    public string $password = '';

    public bool $clearPassword = false;

    public string $testRecipient = '';

    public function mount(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->hydrateMail($site);
    }

    public function save(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->persistMail($site);
        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    public function sendTest(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->persistMail($site);

        $this->validate([
            'testRecipient' => ['required', 'email', 'max:255'],
        ]);

        $site->applyMailConfig();

        try {
            Mail::to($this->testRecipient)->send(new WorkspaceProbeMail);
        } catch (Throwable $exception) {
            $this->addError('testRecipient', $exception->getMessage());

            return;
        }

        $this->pulseOk(__('dashboard.Test email sent.'));
    }

    public function render(SiteSettings $site): View
    {
        return view('livewire.dashboard.settings.options.mail', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
            'hasPassword' => $site->hasMailPassword(),
            'mailers' => [
                'smtp' => __('dashboard.SMTP'),
                'log' => __('dashboard.Log (development)'),
                'sendmail' => __('dashboard.Sendmail'),
            ],
            'encryptions' => [
                'tls' => __('dashboard.TLS'),
                'ssl' => __('dashboard.SSL'),
                'none' => __('dashboard.None'),
            ],
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'mail';
    }

    private function persistMail(SiteSettings $site): void
    {
        $validated = $this->validate($this->rules());

        $payload = [
            'mailer' => $validated['mailer'],
            'from_name' => trim((string) $validated['fromName']),
            'from_address' => trim((string) $validated['fromAddress']),
            'reply_to' => trim((string) $validated['replyTo']),
            'host' => trim((string) $validated['host']),
            'port' => (string) $validated['port'],
            'encryption' => $validated['encryption'],
            'username' => trim((string) $validated['username']),
        ];

        if ($this->clearPassword) {
            $payload['password'] = null;
        } elseif (filled($validated['password'] ?? null)) {
            $payload['password'] = Crypt::encryptString((string) $validated['password']);
        }

        $site->put('mail', $payload);
        $site->applyMailConfig();
        $this->hydrateMail($site);
    }

    /**
     * @return array<string, list<mixed>>
     */
    private function rules(): array
    {
        $smtp = $this->mailer === 'smtp';

        return [
            'mailer' => ['required', 'string', Rule::in(['smtp', 'log', 'sendmail'])],
            'fromName' => ['nullable', 'string', 'max:120'],
            'fromAddress' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->fromAddress) ? 'email' : null])),
            'replyTo' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->replyTo) ? 'email' : null])),
            'host' => [$smtp ? 'required' : 'nullable', 'string', 'max:255'],
            'port' => [$smtp ? 'required' : 'nullable', 'integer', 'min:1', 'max:65535'],
            'encryption' => ['required', 'string', Rule::in(['tls', 'ssl', 'none'])],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:400'],
        ];
    }

    private function hydrateMail(SiteSettings $site): void
    {
        $mail = $site->mail();
        $this->mailer = $mail['mailer'];
        $this->fromName = $mail['from_name'];
        $this->fromAddress = $mail['from_address'];
        $this->replyTo = $mail['reply_to'];
        $this->host = $mail['host'];
        $this->port = $mail['port'] !== '' ? $mail['port'] : '587';
        $this->encryption = $mail['encryption'];
        $this->username = $mail['username'];
        $this->password = '';
        $this->clearPassword = false;
    }
}
