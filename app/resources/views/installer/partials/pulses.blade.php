@php
    use App\Support\Ui\Pulse;
    use Illuminate\Support\Js;

    $pulses = [];

    foreach ($errors->all() as $copy) {
        $pulses[] = Pulse::craft($copy, null, 'fail');
    }

    if (is_array($testConnectionResult ?? null) && filled($testConnectionResult['message'] ?? null)) {
        $ok = (bool) ($testConnectionResult['success'] ?? false);
        $pulses[] = Pulse::craft(
            (string) $testConnectionResult['message'],
            null,
            $ok ? 'ok' : 'fail',
        );
    }

    $queued = session('installer.pulse');
    if (is_array($queued) && filled($queued['copy'] ?? null)) {
        $pulses[] = $queued;
    }

    $signatures = array_map(
        static fn (array $packet): string => ($packet['tone'] ?? '').'|'.($packet['copy'] ?? ''),
        $pulses,
    );
    $pulseKey = $signatures === [] ? 'idle' : md5(implode("\n", $signatures));
@endphp

@if ($pulses !== [])
    <div
        wire:key="installer-pulse-{{ $pulseKey }}"
        class="sr-only"
        aria-hidden="true"
        x-data
        x-init="
            const packets = {{ Js::from($pulses) }};
            const sig = {{ Js::from($pulseKey) }};
            if (window.__krikkitInstallerPulseSig === sig) {
                return;
            }
            window.__krikkitInstallerPulseSig = sig;
            packets.forEach((packet) => {
                window.dispatchEvent(new CustomEvent({{ Js::from(Pulse::EVENT) }}, { detail: packet }));
            });
        "
    ></div>
@endif
