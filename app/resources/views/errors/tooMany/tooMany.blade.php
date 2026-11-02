@php
    $retryAfter = null;
    if (isset($exception) && method_exists($exception, 'getHeaders')) {
        $headers = $exception->getHeaders();
        $retryAfter = isset($headers['Retry-After']) ? (int) $headers['Retry-After'] : null;
    }

    $description = $retryAfter && $retryAfter > 0
        ? __('messages.You hit a short rate limit. Wait :seconds seconds, then try again.', ['seconds' => $retryAfter])
        : __('messages.You hit a short rate limit. Wait a minute, then try again.');
@endphp

<x-errors.shell
    code="429"
    :title="__('messages.Too many requests')"
    :description="$description"
    :primary-href="url()->previous() !== url()->current() ? url()->previous() : route('home')"
    :primary-label="__('messages.Go back')"
    :secondary-href="auth()->check() ? route('lab') : null"
    :secondary-label="auth()->check() ? __('messages.Open Lab') : null"
/>
