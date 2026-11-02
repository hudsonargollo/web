@include('livewire.dashboard.settings.options.legal', [
    'section' => $section,
    'nav' => $nav,
    'heading' => __('dashboard.Terms'),
    'copy' => __('dashboard.Public terms of use. Unpublished pages return 404.'),
    'publicRoute' => 'terms',
    'published' => $published,
])
