<?php

use App\Installer\Callbacks\AdminCreated;
use App\Installer\Callbacks\AfterInstall;
use App\Installer\Steps\EnvironmentStep;
use App\Installer\Steps\PermissionsStep;
use App\Installer\Steps\PermitStep;
use App\Installer\Steps\RequirementsStep;
use App\Models\User;
use Database\Seeders\InstallerSeeder;
use Deep42\Hitchhiker\Steps\CreateAdmin;
use Deep42\Hitchhiker\Steps\RunMigrations;

return [
    /*
    |--------------------------------------------------------------------------
    | Application Name
    |--------------------------------------------------------------------------
    | The name displayed in the installer wizard.
    */
    'name' => env('APP_NAME', 'Krikkit'),

    /*
    |--------------------------------------------------------------------------
    | Logo Path
    |--------------------------------------------------------------------------
    | Path to your logo image (URL or public path).
    */
    'logo' => '/logo.svg',

    /*
    |--------------------------------------------------------------------------
    | PHP Requirements
    |--------------------------------------------------------------------------
    */
    'requirements' => [
        'php_version' => '8.3',
        'extensions' => [
            'bcmath',
            'ctype',
            'curl',
            'dom',
            'fileinfo',
            'gd',
            'json',
            'mbstring',
            'openssl',
            'pcre',
            'pdo',
            'pdo_mysql',
            'tokenizer',
            'xml',
            'zip',
        ],
        'memory_limit' => '128M',
        'opcache' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Writable Directories
    |--------------------------------------------------------------------------
    | Directories that must be writable for installation.
    */
    'writable_directories' => [
        'storage/app',
        'storage/app/public',
        'storage/framework',
        'storage/framework/sessions',
        'storage/logs',
        'bootstrap/cache',
    ],

    /*
    |--------------------------------------------------------------------------
    | Installation Steps
    |--------------------------------------------------------------------------
    | The ordered list of step classes that form the installation wizard.
    | Each class must implement InstallerStep. You can add, remove, or
    | reorder steps as needed for your application.
    */
    'steps' => [
        RequirementsStep::class,
        PermissionsStep::class,
        PermitStep::class,
        EnvironmentStep::class,
        RunMigrations::class,
        CreateAdmin::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin User Model
    |--------------------------------------------------------------------------
    | The model class for creating admin users.
    */
    'admin_model' => User::class,

    /*
    |--------------------------------------------------------------------------
    | After Admin Created Callback
    |--------------------------------------------------------------------------
    | Called after the admin user is created/saved. Receives the user model
    | instance. Use this to assign roles, permissions, or run any
    | post-creation logic specific to your application.
    |
    | Provide the fully qualified class name of an invokable class.
    |
    | Example:
    |   'on_admin_created' => \App\Installer\Callbacks\AdminCreated::class,
    */
    'on_admin_created' => AdminCreated::class,

    /*
    |--------------------------------------------------------------------------
    | Extra Environment Fields
    |--------------------------------------------------------------------------
    | Additional .env variables to write during the environment step.
    | Each entry maps an env key to its UI configuration. These are
    | rendered as extra form fields on the database setup screen.
    |
    | Example:
    |   'environment_fields' => [
    |       'MULTI_TENANT' => [
    |           'type' => 'checkbox',
    |           'label' => 'Enable Multi-Tenancy',
    |           'description' => 'Host multiple businesses under one install.',
    |           'default' => false,
    |           'state_key' => 'multi_tenant',
    |       ],
    |   ],
    */
    'environment_fields' => [],

    /*
    |--------------------------------------------------------------------------
    | Seeder Class
    |--------------------------------------------------------------------------
    | The seeder to run when the installer loads starter data.
    | Default: InstallerSeeder
    */
    'seeder' => InstallerSeeder::class,

    /*
    |--------------------------------------------------------------------------
    | Installation Lock File
    |--------------------------------------------------------------------------
    | The file that marks the application as installed.
    */
    'installed_file' => storage_path('installed'),

    /*
    |--------------------------------------------------------------------------
    | Theme
    |--------------------------------------------------------------------------
    | Accent tracks Krikkit (black in light, white in dark). Override to
    | match a host app's Settings → Themes accent. Mode: light|dark|system.
    */
    'theme' => [
        'accent' => '#262626',
        'accent_foreground' => '#ffffff',
        'accent_dark' => '#ffffff',
        'accent_dark_foreground' => '#1a1a1a',
        'mode' => 'system',
        // Legacy aliases — still read if `accent` is unset.
        'primary' => '#262626',
        'primary_dark' => '#1a1a1a',
    ],

    /*
    |--------------------------------------------------------------------------
    | After Install Callback
    |--------------------------------------------------------------------------
    | Called after successful installation, before the redirect.
    | Writes SESSION_DRIVER=database and CACHE_STORE=database to .env only.
    | Runtime drivers stay on file until the next request after the lock file.
    |
    | Provide the fully qualified class name of an invokable class.
    |
    | Example:
    |   'after_install' => \App\Installer\Callbacks\AfterInstall::class,
    */
    'after_install' => AfterInstall::class,

    /*
    |--------------------------------------------------------------------------
    | Redirect After Install
    |--------------------------------------------------------------------------
    */
    'redirect_after_install' => '/login',
];
