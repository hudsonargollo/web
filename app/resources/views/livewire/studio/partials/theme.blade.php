<button
    type="button"
    class="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-krikkit-fg-soft transition hover:bg-krikkit-soft hover:text-krikkit-fg"
    aria-label="{{ __('studio.Toggle dark mode') }}"
    onclick="(() => {
        const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
        if (window.krikkitTheme?.apply) {
            window.krikkitTheme.apply({ mode: next, persist: true })
            return
        }
        document.documentElement.classList.toggle('dark', next === 'dark')
        document.documentElement.style.colorScheme = next
        localStorage.setItem('krikkit-theme', next)
        document.cookie = 'krikkit-theme=' + next
            + '; Path=/; Max-Age=31536000; SameSite=Lax'
            + (location.protocol === 'https:' ? '; Secure' : '')
    })()"
>
    <span class="dark:hidden">
        <krikkit:icon name="moon" class="size-4" />
    </span>
    <span class="hidden dark:inline">
        <krikkit:icon name="sun" class="size-4" />
    </span>
</button>
