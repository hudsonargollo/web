<x-errors.shell
    code="503"
    :title="__('messages.Unavailable')"
    :description="__('messages.This site is temporarily unavailable.')"
    :primary-href="route('home')"
    :primary-label="__('messages.Back home')"
/>
