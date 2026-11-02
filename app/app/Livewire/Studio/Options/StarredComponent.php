<?php

namespace App\Livewire\Studio\Options;

use App\Livewire\Studio\Traits\HasStudioChrome;
use App\Livewire\Studio\Traits\ManagesStudioProjects;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class StarredComponent extends Component
{
    use HasStudioChrome;
    use ManagesStudioProjects;

    public function mount(PageSeo $seo): void
    {
        abort_unless(auth()->check(), 403);

        $seo->page([
            'title' => __('studio.Starred'),
            'index' => false,
            'follow' => false,
        ]);
    }

    public function render(): View
    {
        $starred = $this->projectShelf('starred_at', 60, true);

        return view('livewire.studio.options.starred', [
            ...$this->chromeData(),
            'starredProjects' => $starred,
        ]);
    }
}
