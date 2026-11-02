@props(['striped' => false, 'fit' => false])

<div {{ $attributes->class([
    'w-full rounded-xl border border-krikkit-line bg-transparent',
    'overflow-x-auto' => ! $fit,
    'overflow-hidden' => $fit,
]) }}>
    <table @class([
        'w-full text-left text-xs',
        'min-w-[40rem]' => ! $fit,
        'table-fixed' => $fit,
    ])>
        {{ $slot }}
    </table>
</div>
