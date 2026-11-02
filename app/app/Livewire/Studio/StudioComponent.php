<?php

namespace App\Livewire\Studio;

use App\Livewire\Studio\Traits\HasStudioChrome;
use App\Livewire\Studio\Traits\ManagesStudioProjects;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class StudioComponent extends Component
{
    use HasStudioChrome;
    use ManagesStudioProjects;

    public string $brief = '';

    public function mount(PageSeo $seo): void
    {
        abort_unless(auth()->check(), 403);

        $seo->page([
            'title' => __('studio.Home'),
        ]);
    }

    public function openLab(?string $seed = null, mixed $hasFiles = false)
    {
        $brief = trim($seed ?: $this->brief);
        $withFiles = filter_var($hasFiles, FILTER_VALIDATE_BOOLEAN);
        $query = [];

        if ($brief !== '') {
            $query['brief'] = $brief;
        }

        if ($withFiles) {
            $query['files'] = '1';
        }

        if ($brief !== '' || $withFiles) {
            $query['send'] = '1';
        }

        return $this->redirect(route('lab', $query), navigate: false);
    }

    public function render(): View
    {
        $opened = $this->projectShelf('opened_at', 3);
        $edited = $this->projectShelf('updated_at', 3);

        return view('livewire.studio.studio', [
            ...$this->chromeData(),
            'openedProjects' => $opened,
            'editedProjects' => $edited,
            'paginateShelves' => false,
            'isEmpty' => $opened->isEmpty() && $edited->isEmpty(),
        ]);
    }
}
