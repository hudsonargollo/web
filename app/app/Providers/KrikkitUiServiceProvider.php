<?php

namespace App\Providers;

use App\View\Compilers\KrikkitTagCompiler;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class KrikkitUiServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Blade::anonymousComponentPath(resource_path('views/krikkit'), 'krikkit');

        $compiler = new KrikkitTagCompiler(
            app('blade.compiler')->getClassComponentAliases(),
            app('blade.compiler')->getClassComponentNamespaces(),
            app('blade.compiler')
        );

        app('blade.compiler')->precompiler(fn (string $value) => $compiler->compile($value));
    }
}
