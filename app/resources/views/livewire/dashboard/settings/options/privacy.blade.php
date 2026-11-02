@include('livewire.dashboard.settings.options.legal', [
    'section' => $section,
    'nav' => $nav,
    'heading' => __('dashboard.Privacy policy'),
    'copy' => __('dashboard.Public privacy policy. Unpublished pages return 404.'),
    'publicRoute' => 'privacy',
    'published' => $published,
])
