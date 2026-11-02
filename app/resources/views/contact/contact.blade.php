<x-layouts.app>
    <div
        x-data="{ menu: false }"
        x-on:keydown.escape.window="menu = false"
        class="min-h-screen bg-krikkit-canvas text-krikkit-fg"
    >
        @include('home.partials.header')
        <main>
            <section class="border-b border-krikkit-line">
                <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
                    <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
                    <div class="relative grid gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-12 lg:px-12 lg:py-32">
                        <div class="lg:col-span-5">
                            <span class="inline-flex items-center gap-2 border border-krikkit-line bg-krikkit-soft px-3 py-1.5">
                                <span class="size-1.5 bg-accent"></span>
                                <span class="text-[11px] font-semibold uppercase tracking-[0.15em] text-krikkit-fg-soft">{{ __('home.Contact') }}</span>
                            </span>
                            <h1 class="mt-6 max-w-md text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg sm:text-5xl">
                                {{ __('home.Tell us what you need') }}
                            </h1>
                            <p class="mt-5 max-w-md text-sm leading-relaxed text-krikkit-muted sm:text-base">
                                {{ __('home.Write to us about Agency, custom packs, or anything else on the desk.') }}
                            </p>
                            @if ($pack)
                                <p class="mt-6 max-w-md border border-krikkit-line bg-krikkit-soft px-4 py-3 text-sm text-krikkit-fg-soft">
                                    {{ __('home.This note is about the :pack pack.', ['pack' => $pack->title]) }}
                                </p>
                            @endif
                        </div>
                        <div class="lg:col-span-7">
                            @if (session('contact') === 'ok')
                                <p class="border border-krikkit-line bg-krikkit-soft px-5 py-4 text-sm text-krikkit-fg/80">
                                    {{ __('home.Thanks — we will write back.') }}
                                </p>
                            @else
                                <form method="post" action="{{ route('contact.store') }}" class="space-y-5">
                                    @csrf
                                    <div class="hidden" aria-hidden="true">
                                        <label for="contact-website">{{ __('home.Company') }}</label>
                                        <input id="contact-website" type="text" name="website" tabindex="-1" autocomplete="off">
                                    </div>
                                    @if ($pack)
                                        <input type="hidden" name="pack" value="{{ $pack->public_id }}">
                                    @endif
                                    <div>
                                        <label for="contact-name" class="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-muted">{{ __('messages.Name') }}</label>
                                        <input
                                            id="contact-name"
                                            type="text"
                                            name="name"
                                            value="{{ $name }}"
                                            required
                                            maxlength="120"
                                            autocomplete="name"
                                            class="w-full border border-krikkit-line bg-transparent px-4 py-3 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle focus:border-krikkit-muted"
                                        >
                                        @error('name')
                                            <p class="mt-2 text-sm text-red-400">{{ $message }}</p>
                                        @enderror
                                    </div>
                                    <div>
                                        <label for="contact-email" class="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-muted">{{ __('dashboard.Email') }}</label>
                                        <input
                                            id="contact-email"
                                            type="email"
                                            name="email"
                                            value="{{ $email }}"
                                            required
                                            maxlength="255"
                                            autocomplete="email"
                                            class="w-full border border-krikkit-line bg-transparent px-4 py-3 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle focus:border-krikkit-muted"
                                        >
                                        @error('email')
                                            <p class="mt-2 text-sm text-red-400">{{ $message }}</p>
                                        @enderror
                                    </div>
                                    <div>
                                        <label for="contact-body" class="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-muted">{{ __('dashboard.Message') }}</label>
                                        <textarea
                                            id="contact-body"
                                            name="body"
                                            required
                                            maxlength="5000"
                                            rows="8"
                                            class="w-full resize-y border border-krikkit-line bg-transparent px-4 py-3 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle focus:border-krikkit-muted"
                                        >{{ $body }}</textarea>
                                        @error('body')
                                            <p class="mt-2 text-sm text-red-400">{{ $message }}</p>
                                        @enderror
                                    </div>
                                    <button type="submit" class="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90">
                                        {{ __('home.Send message') }}
                                        <krikkit:icon name="chevron-right" class="size-3.5" />
                                    </button>
                                </form>
                            @endif
                        </div>
                    </div>
                </div>
            </section>
        </main>
        @include('home.partials.footer')
    </div>
</x-layouts.app>
