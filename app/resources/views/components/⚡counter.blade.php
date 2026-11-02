<?php

use Livewire\Component;

new class extends Component
{
    public int $count = 0;

    public function increment(): void
    {
        $this->count++;
    }

    public function decrement(): void
    {
        $this->count--;
    }
};
?>

<div class="flex flex-col items-center gap-6">
    <p class="text-6xl font-semibold tabular-nums tracking-tight text-krikkit-fg">
        {{ $count }}
    </p>

    <div class="flex items-center gap-3">
        <krikkit:button type="button" variant="outline" wire:click="decrement">−</krikkit:button>
        <krikkit:button type="button" wire:click="increment">+</krikkit:button>
    </div>
</div>
