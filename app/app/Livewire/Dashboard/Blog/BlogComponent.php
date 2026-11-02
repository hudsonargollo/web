<?php

namespace App\Livewire\Dashboard\Blog;

use App\Models\BlogPost;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class BlogComponent extends Component
{
    public string $confirmPublicId = '';

    /**
     * @return array{title: string}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Blog'),
        ];
    }

    public function mount(): void
    {
        Gate::authorize('blog.browse');
    }

    public function askRetire(string $publicId): void
    {
        Gate::authorize('blog.retire');
        $this->confirmPublicId = $publicId;
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'retire-post' }))");
    }

    public function confirmPending(): void
    {
        Gate::authorize('blog.retire');

        $publicId = $this->confirmPublicId;
        $this->reset('confirmPublicId');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'retire-post' }))");

        $post = BlogPost::query()->where('public_id', $publicId)->firstOrFail();
        $post->delete();
        $this->pulseOk(__('dashboard.Post retired.'));
    }

    public function render(): View
    {
        return view('livewire.dashboard.blog.blog', [
            'posts' => BlogPost::query()->latest('updated_at')->get(),
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
