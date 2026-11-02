<?php

namespace App\Livewire\Dashboard\Blog\Options;

use App\Livewire\Dashboard\Blog\Traits\ManagesPostForm;
use App\Models\BlogPost;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EditComponent extends Component
{
    use ManagesPostForm;

    public BlogPost $post;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $label = isset($this->post) ? $this->post->title : __('dashboard.Post');

        return [
            'title' => __('dashboard.Edit').' '.$label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Blog'), 'href' => route('dashboard.blog.index')],
                ['label' => __('dashboard.Edit'), 'current' => true],
            ],
        ];
    }

    public function mount(BlogPost $post): void
    {
        Gate::authorize('blog.revise');
        $this->post = $post;
        $this->fillFromPost($post);
    }

    public function save(): void
    {
        Gate::authorize('blog.revise');
        $this->post = $this->persistPost($this->post);
        $this->pulseOk(__('dashboard.Post updated.'));
        $this->redirect(route('dashboard.blog.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.blog.options.edit', [
            'publicUrl' => $this->post->isReleased() ? route('blog.entry', $this->post->slug) : null,
        ])->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
