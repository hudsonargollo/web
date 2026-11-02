<?php

namespace App\Livewire\Dashboard\Settings\Traits;

use Illuminate\Support\Facades\Storage;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

trait ManagesSiteAssets
{
    /**
     * @param  list<string>  $keys
     */
    public function clearAsset(string $key, array $keys): void
    {
        if (! in_array($key, $keys, true) || ! property_exists($this, $key)) {
            return;
        }

        $this->{$key} = null;

        $flag = 'remove'.ucfirst($key);
        if (property_exists($this, $flag)) {
            $this->{$flag} = true;
        }
    }

    protected function persistAsset(string $property, ?string $current, string $directory, bool $remove): ?string
    {
        $file = property_exists($this, $property) ? $this->{$property} : null;

        if ($file instanceof TemporaryUploadedFile) {
            if (filled($current)) {
                Storage::disk('public')->delete($current);
            }

            return $file->store($directory, 'public');
        }

        if ($remove && filled($current)) {
            Storage::disk('public')->delete($current);

            return null;
        }

        return $current ?: null;
    }

    protected function previewUrl(mixed $upload, ?string $stored, bool $remove): ?string
    {
        if ($upload instanceof TemporaryUploadedFile) {
            return $upload->isPreviewable() ? $upload->temporaryUrl() : null;
        }

        if ($remove) {
            return null;
        }

        return filled($stored) ? Storage::disk('public')->url($stored) : null;
    }
}
