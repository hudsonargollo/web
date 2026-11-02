{{-- Decorative ceramic landing. Not a browser chrome. --}}
<div class="flex h-full min-h-0 flex-col justify-between gap-3 p-3">
    <div class="space-y-2.5">
        <div class="flex items-center justify-between gap-2">
            <span class="truncate text-[11px] font-medium leading-none text-krikkit-fg">{{ __('home.Ceramic studio') }}</span>
            <span class="shrink-0 text-[10px] leading-none text-krikkit-muted">{{ __('home.Visit') }}</span>
        </div>
        <p class="text-[15px] font-medium leading-snug tracking-tight text-krikkit-fg">{{ __('home.Warm vessels for the table.') }}</p>
        <p class="text-[11px] leading-snug text-krikkit-muted">{{ __('home.A short about, large photography, and a visit form — from one brief.') }}</p>
    </div>
    <div class="grid grid-cols-2 gap-1.5">
        <div class="rounded-md border border-krikkit-line px-2 py-2">
            <p class="text-[10px] leading-none text-krikkit-subtle">{{ __('home.Hours') }}</p>
            <p class="mt-1.5 text-[11px] leading-none text-krikkit-fg">{{ __('home.Tue–Sat · 11–18') }}</p>
        </div>
        <div class="rounded-md border border-krikkit-line px-2 py-2">
            <p class="text-[10px] leading-none text-krikkit-subtle">{{ __('home.Collection') }}</p>
            <p class="mt-1.5 truncate text-[11px] leading-none text-krikkit-fg">{{ __('home.Bowls · Cups · Lamps') }}</p>
        </div>
    </div>
    <div class="space-y-1.5">
        <div class="flex h-7 items-center rounded-md border border-krikkit-line bg-krikkit-canvas px-2 text-[10px] leading-none text-krikkit-subtle">{{ __('messages.Name') }}</div>
        <div class="flex h-7 items-center rounded-md border border-krikkit-line bg-krikkit-canvas px-2 text-[10px] leading-none text-krikkit-subtle">{{ __('messages.Email') }}</div>
        <div class="flex h-7 items-center justify-center rounded-md bg-accent text-[10px] font-medium leading-none text-accent-foreground">{{ __('home.Visit') }}</div>
    </div>
</div>
