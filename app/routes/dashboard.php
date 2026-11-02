<?php

use App\Http\Controllers\Dashboard\AccessRoleController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Livewire\Dashboard\Blog\BlogComponent;
use App\Livewire\Dashboard\Blog\Options\CreateComponent as BlogCreateComponent;
use App\Livewire\Dashboard\Blog\Options\EditComponent as BlogEditComponent;
use App\Livewire\Dashboard\Contacts\ContactsComponent;
use App\Livewire\Dashboard\Contacts\Options\ShowComponent as ContactShowComponent;
use App\Livewire\Dashboard\Credits\CreditsComponent;
use App\Livewire\Dashboard\Finance\FinanceComponent;
use App\Livewire\Dashboard\Finance\Options\EventComponent as FinanceEventComponent;
use App\Livewire\Dashboard\Finance\Options\EventsComponent as FinanceEventsComponent;
use App\Livewire\Dashboard\Finance\Options\SubscriptionComponent as FinanceSubscriptionComponent;
use App\Livewire\Dashboard\Finance\Options\SubscriptionsComponent as FinanceSubscriptionsComponent;
use App\Livewire\Dashboard\Integration\IntegrationComponent;
use App\Livewire\Dashboard\Integration\Options\EditComponent as IntegrationEditComponent;
use App\Livewire\Dashboard\Invoices\InvoicesComponent;
use App\Livewire\Dashboard\Invoices\Options\ShowComponent as InvoiceShowComponent;
use App\Livewire\Dashboard\Lab\LabComponent;
use App\Livewire\Dashboard\Lab\Options\ShowComponent as LabShowComponent;
use App\Livewire\Dashboard\Lab\Options\TurnsComponent as LabTurnsComponent;
use App\Livewire\Dashboard\Lab\Options\UsageComponent as LabUsageComponent;
use App\Livewire\Dashboard\Landing\LandingComponent;
use App\Livewire\Dashboard\Languages\LanguagesComponent;
use App\Livewire\Dashboard\Languages\Options\CreateComponent as LanguageCreateComponent;
use App\Livewire\Dashboard\Languages\Options\EditComponent as LanguageEditComponent;
use App\Livewire\Dashboard\Languages\Options\TranslateComponent as LanguageTranslateComponent;
use App\Livewire\Dashboard\Newsletter\NewsletterComponent;
use App\Livewire\Dashboard\Packs\Options\CreateComponent as PackCreateComponent;
use App\Livewire\Dashboard\Packs\Options\EditComponent as PackEditComponent;
use App\Livewire\Dashboard\Packs\PacksComponent;
use App\Livewire\Dashboard\Pages\Options\CreateComponent as PageCreateComponent;
use App\Livewire\Dashboard\Pages\Options\EditComponent as PageEditComponent;
use App\Livewire\Dashboard\Pages\PagesComponent;
use App\Livewire\Dashboard\Payments\Options\EditComponent as PaymentEditComponent;
use App\Livewire\Dashboard\Payments\PaymentsComponent;
use App\Livewire\Dashboard\Profile\Options\PasswordComponent as ProfilePasswordComponent;
use App\Livewire\Dashboard\Profile\Options\TwoFactorComponent as ProfileTwoFactorComponent;
use App\Livewire\Dashboard\Profile\ProfileComponent;
use App\Livewire\Dashboard\Seo\SeoComponent;
use App\Livewire\Dashboard\Sessions\SessionsComponent;
use App\Livewire\Dashboard\Settings\Options\GdprComponent;
use App\Livewire\Dashboard\Settings\Options\LabComponent as SettingsLabComponent;
use App\Livewire\Dashboard\Settings\Options\LicenseComponent as SettingsLicenseComponent;
use App\Livewire\Dashboard\Settings\Options\MailComponent;
use App\Livewire\Dashboard\Settings\Options\PrivacyComponent;
use App\Livewire\Dashboard\Settings\Options\PublishComponent;
use App\Livewire\Dashboard\Settings\Options\TermsComponent;
use App\Livewire\Dashboard\Settings\Options\ThemesComponent;
use App\Livewire\Dashboard\Settings\SettingsComponent;
use App\Livewire\Dashboard\Users\Options\CreateComponent as UserCreateComponent;
use App\Livewire\Dashboard\Users\Options\EditComponent as UserEditComponent;
use App\Livewire\Dashboard\Users\Options\SessionsComponent as UserSessionsComponent;
use App\Livewire\Dashboard\Users\UsersComponent;
use App\Models\Invoice;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'ability:dashboard.access,404'])->group(function () {
    Route::get('/', DashboardController::class)->name('home');
    Route::redirect('billing', '/dashboard/packs')->name('billing');

    Route::middleware('ability:security.self')->group(function () {
        Route::get('profile', ProfileComponent::class)->name('profile.index');
        Route::get('profile/password', ProfilePasswordComponent::class)->name('profile.password');
        Route::get('profile/two-factor', ProfileTwoFactorComponent::class)->name('profile.two-factor');
        Route::redirect('password', '/dashboard/profile/password');
        Route::redirect('twoFactor', '/dashboard/profile/two-factor');
        Route::redirect('two-factor', '/dashboard/profile/two-factor');
    });

    Route::middleware('ability:packs.browse')->group(function () {
        Route::get('packs', PacksComponent::class)->name('packs.index');
    });

    Route::middleware('ability:packs.compose')->group(function () {
        Route::get('packs/create', PackCreateComponent::class)->name('packs.create');
    });

    Route::middleware('ability:packs.revise')->group(function () {
        Route::get('packs/{plan}/edit', PackEditComponent::class)->name('packs.edit');
    });

    Route::middleware('ability:projects.browse')->group(function () {
        Route::get('lab', LabComponent::class)->name('lab.index');
        Route::get('lab/usage', LabUsageComponent::class)->name('lab.usage');
        Route::get('lab/turns', LabTurnsComponent::class)->name('lab.turns');
        Route::get('lab/{project}', LabShowComponent::class)->name('lab.show');
        Route::redirect('lab-projects', '/dashboard/lab')->name('lab-projects.index');
    });

    Route::middleware('ability:finance.browse')->group(function () {
        Route::get('finance', FinanceComponent::class)->name('finance.index');
        Route::get('finance/subscriptions', FinanceSubscriptionsComponent::class)->name('finance.subscriptions.index');
        Route::get('finance/subscriptions/{entitlement}', FinanceSubscriptionComponent::class)->name('finance.subscriptions.show');
        Route::get('finance/events', FinanceEventsComponent::class)->name('finance.events.index');
        Route::get('finance/events/{event}', FinanceEventComponent::class)->name('finance.events.show');
        Route::get('credits', CreditsComponent::class)->name('credits.index');
        Route::get('invoices', InvoicesComponent::class)->name('invoices.index');
        Route::get('invoices/{invoice}', InvoiceShowComponent::class)->name('invoices.show');
        Route::redirect('finance/credits', '/dashboard/credits')->name('finance.credits.index');
        Route::redirect('finance/invoices', '/dashboard/invoices')->name('finance.invoices.index');
        Route::get('finance/invoices/{invoice}', function (Invoice $invoice) {
            return redirect()->route('dashboard.invoices.show', $invoice);
        })->name('finance.invoices.show');
    });

    Route::middleware('ability:payments.revise')->group(function () {
        Route::get('payments', PaymentsComponent::class)->name('payments.index');
        Route::get('payments/{gateway}/edit', PaymentEditComponent::class)->name('payments.edit');
    });

    Route::middleware('ability:roles.browse')->group(function () {
        Route::get('roles', [AccessRoleController::class, 'index'])->name('roles.index');
    });

    Route::middleware('ability:roles.compose')->group(function () {
        Route::get('roles/create', [AccessRoleController::class, 'create'])->name('roles.create');
        Route::post('roles', [AccessRoleController::class, 'store'])->name('roles.store');
    });

    Route::middleware('ability:roles.revise')->group(function () {
        Route::get('roles/{accessRole}/edit', [AccessRoleController::class, 'edit'])->name('roles.edit');
        Route::put('roles/{accessRole}', [AccessRoleController::class, 'update'])->name('roles.update');
    });

    Route::middleware('ability:roles.retire')->group(function () {
        Route::delete('roles/{accessRole}', [AccessRoleController::class, 'destroy'])->name('roles.destroy');
    });

    Route::middleware('ability:users.browse')->group(function () {
        Route::get('users', UsersComponent::class)->name('users.index');
    });

    Route::middleware('ability:users.compose')->group(function () {
        Route::get('users/create', UserCreateComponent::class)->name('users.create');
    });

    Route::middleware('ability:sessions.browse')->group(function () {
        Route::get('sessions', SessionsComponent::class)->name('sessions.index');
        Route::get('users/{user}/sessions', UserSessionsComponent::class)->name('users.sessions');
        Route::redirect('users/sessions', '/dashboard/sessions')->name('users.sessions.index');
    });

    Route::middleware('ability:users.revise')->group(function () {
        Route::get('users/{user}/edit', UserEditComponent::class)->name('users.edit');
    });

    Route::middleware('ability:ai.revise')->group(function () {
        Route::get('integration', IntegrationComponent::class)->name('integration.index');
        Route::get('integration/{provider}/edit', IntegrationEditComponent::class)->name('integration.edit');
    });

    Route::middleware('ability:blog.browse')->group(function () {
        Route::get('blog', BlogComponent::class)->name('blog.index');
    });

    Route::middleware('ability:blog.compose')->group(function () {
        Route::get('blog/create', BlogCreateComponent::class)->name('blog.create');
    });

    Route::middleware('ability:blog.revise')->group(function () {
        Route::get('blog/{post}/edit', BlogEditComponent::class)->name('blog.edit');
    });

    Route::middleware('ability:pages.browse')->group(function () {
        Route::get('pages', PagesComponent::class)->name('pages.index');
    });

    Route::middleware('ability:pages.compose')->group(function () {
        Route::get('pages/create', PageCreateComponent::class)->name('pages.create');
    });

    Route::middleware('ability:pages.revise')->group(function () {
        Route::get('pages/{page}/edit', PageEditComponent::class)->name('pages.edit');
    });

    Route::middleware('ability:languages.browse')->group(function () {
        Route::get('languages', LanguagesComponent::class)->name('languages.index');
    });

    Route::middleware('ability:languages.compose')->group(function () {
        Route::get('languages/create', LanguageCreateComponent::class)->name('languages.create');
    });

    Route::middleware('ability:languages.revise')->group(function () {
        Route::get('languages/{language}/edit', LanguageEditComponent::class)->name('languages.edit');
        Route::get('languages/{language}/translate', LanguageTranslateComponent::class)->name('languages.translate');
    });

    Route::middleware('ability:contacts.browse')->group(function () {
        Route::get('contacts', ContactsComponent::class)->name('contacts.index');
        Route::get('contacts/{contact}', ContactShowComponent::class)->name('contacts.show');
    });

    Route::middleware('ability:settings.revise')->group(function () {
        Route::get('landing', LandingComponent::class)->name('landing.index');
        Route::get('newsletter', NewsletterComponent::class)->name('newsletter.index');
        Route::get('seo', SeoComponent::class)->name('seo.index');
        Route::redirect('settings/seo', '/dashboard/seo')->name('settings.seo');
        Route::get('settings', SettingsComponent::class)->name('settings.index');
        Route::get('settings/themes', ThemesComponent::class)->name('settings.themes');
        Route::get('settings/mail', MailComponent::class)->name('settings.mail');
        Route::get('settings/license', SettingsLicenseComponent::class)->name('settings.license');
        Route::get('settings/publish', PublishComponent::class)->name('settings.publish');
        Route::get('settings/lab', SettingsLabComponent::class)->name('settings.lab');
        Route::get('settings/gdpr', GdprComponent::class)->name('settings.gdpr');
        Route::get('settings/privacy', PrivacyComponent::class)->name('settings.privacy');
        Route::get('settings/terms', TermsComponent::class)->name('settings.terms');
    });
});
