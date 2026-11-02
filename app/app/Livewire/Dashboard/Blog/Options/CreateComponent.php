<?php

namespace App\Livewire\Dashboard\Blog\Options;

use App\Livewire\Dashboard\Blog\Traits\ManagesPostForm;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class CreateComponent extends Component
{
    use ManagesPostForm;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.New post'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Blog'), 'href' => route('dashboard.blog.index')],
                ['label' => __('dashboard.New'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('blog.compose');
    }

    public function save(): void
    {
        Gate::authorize('blog.compose');
        $this->persistPost();
        $this->pulseOk(__('dashboard.Post created.'));
        $this->redirect(route('dashboard.blog.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.blog.options.create')->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
