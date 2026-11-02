@php
    $brands = [
        ['id' => 'claude', 'label' => 'Claude'],
        ['id' => 'openai', 'label' => 'OpenAI'],
        ['id' => 'github', 'label' => 'GitHub'],
        ['id' => 'deepseek', 'label' => 'DeepSeek'],
        ['id' => 'xai', 'label' => 'xAI'],
        ['id' => 'mistral', 'label' => 'Mistral'],
        ['id' => 'zhipu', 'label' => 'Zhipu'],
        ['id' => 'gemini', 'label' => 'Google AI Studio'],
        ['id' => 'groq', 'label' => 'Groq'],
    ];
@endphp

<div class="relative border-t border-krikkit-line">
    <div class="krikkit-home-pinstripe h-7" aria-hidden="true"></div>
    <div class="krikkit-home-dots relative overflow-hidden border-y border-krikkit-line">
        <div class="krikkit-home-marquee flex w-max select-none items-center">
            @foreach ([0, 1] as $copy)
                <ul class="flex items-center" @if ($copy === 1) aria-hidden="true" @endif>
                    @foreach ($brands as $brand)
                        <li class="flex h-[4.75rem] items-center gap-2.5 px-8 text-krikkit-muted">
                            @include('home.partials.brand', ['name' => $brand['id']])
                            <span class="text-sm font-medium tracking-wide">{{ $brand['label'] }}</span>
                        </li>
                    @endforeach
                </ul>
            @endforeach
        </div>
    </div>
    <div class="krikkit-home-pinstripe h-7" aria-hidden="true"></div>
</div>
