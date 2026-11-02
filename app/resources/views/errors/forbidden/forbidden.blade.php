<x-errors.shell
    code="403"
    :title="__('messages.Access denied')"
    :description="__('messages.You do not have permission to open this page.')"
    :secondary-href="auth()->check() ? route('lab') : route('login')"
    :secondary-label="auth()->check() ? __('messages.Open Lab') : __('messages.Log in')"
/>
