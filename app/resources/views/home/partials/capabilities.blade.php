<section id="capabilities" class="scroll-mt-20 border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <div class="relative px-6 pt-20 md:px-12 md:pt-28">
            @include('home.partials.badge', ['label' => __('messages.What Lab does')])
            <h2 class="mt-6 max-w-2xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg md:text-5xl">
                {{ __('home.The desk sites run on') }}
            </h2>
        </div>
        <div class="relative mt-12 grid gap-px border-t border-krikkit-line bg-krikkit-line sm:grid-cols-2">
            @foreach ([
                ['icon' => 'document-text', 'title' => __('home.Brief access'), 'copy' => __('home.Every project keeps the prompt, files, and preview together so the next turn has context.')],
                ['icon' => 'computer-desktop', 'title' => __('home.Canvas updates'), 'copy' => __('home.The preview refreshes as files land. No export step to see what changed.')],
                ['icon' => 'folder', 'title' => __('home.File memory'), 'copy' => __('home.Markup stays in the tree. Come back later and pick up the same pages.')],
                ['icon' => 'globe-alt', 'title' => __('home.Publish controls'), 'copy' => __('home.Preview, domain, and GitHub import sit behind the same workspace permissions.')],
            ] as $item)
                <article class="flex flex-col gap-3 bg-krikkit-canvas p-6 md:p-10">
                    <span class="inline-flex size-9 items-center justify-center border border-krikkit-line bg-krikkit-soft/50 text-krikkit-fg">
                        <krikkit:icon :name="$item['icon']" variant="mini" class="block size-4" />
                    </span>
                    <h3 class="text-[15px] font-medium text-krikkit-fg">{{ $item['title'] }}</h3>
                    <p class="text-sm leading-relaxed text-krikkit-muted">{{ $item['copy'] }}</p>
                </article>
            @endforeach
        </div>
        <div class="relative border-t border-krikkit-line px-6 py-10 md:px-12">
            <p class="text-sm font-medium text-krikkit-fg">{{ __('home.Workspace-ready') }}</p>
            <p class="mt-2 max-w-2xl text-sm text-krikkit-muted">{{ __('home.Roles, sessions, and pack limits travel with the account — not a separate admin product.') }}</p>
        </div>
    </div>
</section>
