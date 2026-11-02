<x-errors.shell
    code="500"
    :title="__('messages.Something went wrong')"
    :description="__('messages.We could not finish that request. Try again in a moment.')"
    :primary-href="route('home')"
    :primary-label="__('messages.Back home')"
/>
