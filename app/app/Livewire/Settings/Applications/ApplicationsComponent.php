<?php

namespace App\Livewire\Settings\Applications;

use App\Datastore\SupabaseLinkBroker;
use App\Integrations\Github\GithubLinkBroker;
use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class ApplicationsComponent extends Component
{
    use HasAccountChrome;

    protected function deskSection(): string
    {
        return 'applications';
    }

    public function mount(PageSeo $seo): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);
    }

    public function unlinkGithub(GithubLinkBroker $broker): void
    {
        $this->authorizeDesk();
        $broker->unlink(auth()->user());
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'unlink-github' }))");
        $this->pulseOk(__('settings.GitHub disconnected.'));
    }

    public function unlinkSupabase(SupabaseLinkBroker $broker): void
    {
        $this->authorizeDesk();
        $broker->unlink(auth()->user());
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'unlink-supabase' }))");
        $this->pulseOk(__('settings.Supabase disconnected.'));
    }

    public function render(GithubLinkBroker $github, SupabaseLinkBroker $supabase): View
    {
        $user = auth()->user();
        $githubLink = $github->linkFor($user);
        $supabaseLink = $supabase->linkFor($user);
        $return = route('settings.applications', absolute: false);

        return view('livewire.settings.applications.applications', [
            'section' => $this->deskSection(),
            'githubLinked' => $githubLink !== null,
            'githubLogin' => $githubLink?->login,
            'githubConnect' => route('lab.vcs.github.start', ['return' => $return]),
            'supabaseLinked' => $supabaseLink !== null,
            'supabaseConnect' => route('lab.oauth.supabase.start', ['return' => $return]),
        ]);
    }
}
