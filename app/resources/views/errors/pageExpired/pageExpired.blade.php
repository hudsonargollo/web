<x-errors.shell
    code="419"
    :title="__('messages.Page expired')"
    :description="__('messages.Your session timed out. Refresh the page and try again.')"
    :primary-href="url()->current()"
    :primary-label="__('messages.Refresh page')"
    :secondary-href="route('login')"
    :secondary-label="__('messages.Log in')"
/>
