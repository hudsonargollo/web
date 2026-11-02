<?php

namespace App\Livewire\Dashboard\Contacts\Options;

use App\Mail\ContactReplyMail;
use App\Models\Contact;
use App\Support\Site\SiteSettings;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Throwable;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class ShowComponent extends Component
{
    public Contact $contact;

    public string $reply = '';

    public string $confirmPublicId = '';

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => $this->contact->name,
            'breadcrumbs' => [
                ['label' => __('dashboard.Contacts'), 'href' => route('dashboard.contacts.index')],
                ['label' => $this->contact->name, 'current' => true],
            ],
        ];
    }

    public function mount(Contact $contact): void
    {
        Gate::authorize('contacts.browse');
        $this->contact = $contact->load(['plan', 'user', 'repliedBy']);

        if ($this->contact->read_at === null) {
            $this->contact->forceFill(['read_at' => now()])->save();
        }
    }

    public function send(): void
    {
        Gate::authorize('contacts.revise');

        $this->validate([
            'reply' => ['required', 'string', 'max:5000'],
        ]);

        $copy = trim($this->reply);
        $site = app(SiteSettings::class);

        try {
            $site->applyMailConfig();
            Mail::to($this->contact->email)->send(new ContactReplyMail($this->contact, $copy));
        } catch (Throwable $e) {
            report($e);
            Pulse::fail(__('dashboard.The reply could not be sent.'));

            return;
        }

        $this->contact->forceFill([
            'reply_body' => $copy,
            'replied_at' => now(),
            'replied_by' => Auth::id(),
            'read_at' => $this->contact->read_at ?? now(),
        ])->save();

        $this->contact = $this->contact->fresh(['plan', 'user', 'repliedBy']);
        $this->reply = '';
        Pulse::ok(__('dashboard.Reply sent.'));
    }

    public function askRemove(): void
    {
        Gate::authorize('contacts.revise');
        $this->confirmPublicId = $this->contact->public_id;
        $this->dispatch('krikkit-modal-open', 'remove-contact');
    }

    public function confirmPending(): void
    {
        Gate::authorize('contacts.revise');
        $this->reset('confirmPublicId');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'remove-contact' }))");
        $this->contact->delete();
        Pulse::ok(__('dashboard.Contact removed.'));
        $this->redirect(route('dashboard.contacts.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.contacts.options.show')
            ->layoutData($this->layoutData());
    }
}
