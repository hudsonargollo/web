<?php

namespace App\Livewire\Studio\Options;

use App\Livewire\Studio\Traits\HasStudioChrome;
use App\Livewire\Studio\Traits\ManagesStudioProjects;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class ProjectsComponent extends Component
{
    use HasStudioChrome;
    use ManagesStudioProjects;

    public const SHELF_PAGE = 9;

    public string $query = '';

    public int $openedLimit = self::SHELF_PAGE;

    public int $editedLimit = self::SHELF_PAGE;

    public function mount(PageSeo $seo): void
    {
        abort_unless(auth()->check(), 403);

        $seo->page([
            'title' => __('studio.Projects'),
            'index' => false,
            'follow' => false,
        ]);
    }

    public function updatedQuery(): void
    {
        $this->openedLimit = self::SHELF_PAGE;
        $this->editedLimit = self::SHELF_PAGE;
    }

    public function loadMoreOpened(): void
    {
        $this->openedLimit += self::SHELF_PAGE;
    }

    public function loadMoreEdited(): void
    {
        $this->editedLimit += self::SHELF_PAGE;
    }

    public function render(): View
    {
        $term = $this->query;
        $opened = $this->projectShelf('opened_at', $this->openedLimit + 1, false, $term);
        $edited = $this->projectShelf('updated_at', $this->editedLimit + 1, false, $term);
        $openedHasMore = $opened->count() > $this->openedLimit;
        $editedHasMore = $edited->count() > $this->editedLimit;

        return view('livewire.studio.options.projects', [
            ...$this->chromeData(),
            'openedProjects' => $opened->take($this->openedLimit),
            'editedProjects' => $edited->take($this->editedLimit),
            'openedHasMore' => $openedHasMore,
            'editedHasMore' => $editedHasMore,
            'paginateShelves' => true,
            'isEmpty' => $opened->isEmpty() && $edited->isEmpty(),
        ]);
    }
}
