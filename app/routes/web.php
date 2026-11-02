<?php

use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Billing\CheckoutController;
use App\Http\Controllers\Blog\BlogController;
use App\Http\Controllers\Blog\EntryController;
use App\Http\Controllers\Contact\ContactController;
use App\Http\Controllers\Lab\LabChatController;
use App\Http\Controllers\Lab\LabController;
use App\Http\Controllers\Lab\LabCoverController;
use App\Http\Controllers\Lab\LabDatastoreController;
use App\Http\Controllers\Lab\LabEventsController;
use App\Http\Controllers\Lab\LabFilesController;
use App\Http\Controllers\Lab\LabGithubController;
use App\Http\Controllers\Lab\LabGithubRemoteController;
use App\Http\Controllers\Lab\LabGithubVcsController;
use App\Http\Controllers\Lab\LabModelsController;
use App\Http\Controllers\Lab\LabPreviewController;
use App\Http\Controllers\Lab\LabPublishController;
use App\Http\Controllers\Lab\LabSupabaseOAuthController;
use App\Http\Controllers\Lab\LabTurnStateController;
use App\Http\Controllers\Lab\LabVisualsController;
use App\Http\Controllers\Legal\PrivacyController;
use App\Http\Controllers\Legal\TermsController;
use App\Http\Controllers\Newsletter\SubscribeController;
use App\Http\Controllers\Pages\LeafController;
use App\Http\Controllers\Pages\PagesController;
use App\Http\Controllers\Pricing\PricingController;
use App\Http\Controllers\Studio\ProjectExportController;
use App\Http\Controllers\Webhooks\PaypalWebhookController;
use App\Http\Controllers\Webhooks\StripeWebhookController;
use App\Livewire\Studio\Options\ProjectsComponent;
use App\Livewire\Studio\Options\StarredComponent;
use App\Livewire\Studio\StudioComponent;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use Illuminate\Support\Facades\Route;

Route::get('/', function (SiteSettings $site, PageSeo $seo) {
    if ($site->maintenance() && auth()->guest()) {
        $seo->page([
            'title' => __('messages.Unavailable'),
            'description' => $site->maintenanceMessage(),
            'index' => false,
            'follow' => false,
        ]);

        return response()->view('maintenance.maintenance', ['site' => $site], 503);
    }

    if (auth()->check()) {
        return app(StudioComponent::class)();
    }

    return view('home.home');
})->name('home');

Route::get('/projects', ProjectsComponent::class)
    ->middleware('auth')
    ->name('projects');

Route::get('/starred', StarredComponent::class)
    ->middleware('auth')
    ->name('starred');

Route::get('/projects/{project}/export', ProjectExportController::class)
    ->middleware('auth')
    ->name('projects.export');

Route::get('/blog', BlogController::class)->name('blog');
Route::get('/blog/{slug}', EntryController::class)->name('blog.entry');
Route::get('/pages', PagesController::class)->name('pages');
Route::get('/pages/{slug}', LeafController::class)->name('pages.leaf');

Route::get('/pricing', PricingController::class)->name('pricing');
Route::get('/contact', [ContactController::class, 'show'])->name('contact');
Route::post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('contact.store');
Route::get('/privacy', PrivacyController::class)->name('privacy');
Route::get('/terms', TermsController::class)->name('terms');

Route::post('/newsletter', [SubscribeController::class, 'store'])
    ->middleware('throttle:8,1')
    ->name('newsletter.store');

Route::post('/webhooks/stripe', StripeWebhookController::class)->name('webhooks.stripe');
Route::post('/webhooks/paypal', PaypalWebhookController::class)->name('webhooks.paypal');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/settings', \App\Livewire\Settings\General\GeneralComponent::class)->name('settings.index');
    Route::get('/settings/profile', \App\Livewire\Settings\Profile\ProfileComponent::class)->name('settings.profile');
    Route::get('/settings/password', \App\Livewire\Settings\Profile\Options\PasswordComponent::class)->name('settings.password');
    Route::get('/settings/two-factor', \App\Livewire\Settings\Profile\Options\TwoFactorComponent::class)->name('settings.two-factor');
    Route::get('/settings/applications', \App\Livewire\Settings\Applications\ApplicationsComponent::class)->name('settings.applications');
    Route::get('/settings/subscription', \App\Livewire\Settings\Subscription\SubscriptionComponent::class)->name('settings.subscription');
    Route::get('/settings/credits', \App\Livewire\Settings\Credits\CreditsComponent::class)->name('settings.credits');
    Route::get('/settings/usage', \App\Livewire\Settings\Usage\UsageComponent::class)->name('settings.usage');

    Route::get('/checkout/{plan}', [CheckoutController::class, 'start'])->name('checkout.start');
    Route::get('/billing/return', [CheckoutController::class, 'returned'])->name('billing.return');
    Route::get('/billing/cancel', [CheckoutController::class, 'cancelled'])->name('billing.cancel');
    Route::get('/billing/paypal/return', [CheckoutController::class, 'paypalReturn'])->name('billing.paypal.return');
});

Route::get('/lab/oauth/supabase/return', [LabSupabaseOAuthController::class, 'return'])
    ->middleware('throttle:60,1')
    ->name('lab.oauth.supabase.return');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/lab', LabController::class)->name('lab');
    Route::get('/lab/models', LabModelsController::class)->name('lab.models');
    Route::post('/lab/chat', LabChatController::class)->middleware('throttle:30,1')->name('lab.chat');
    Route::post('/lab/visuals', LabVisualsController::class)->middleware('throttle:30,1')->name('lab.visuals');
    Route::get('/lab/datastore', [LabDatastoreController::class, 'status'])->middleware('throttle:180,1')->name('lab.datastore.status');
    Route::get('/lab/datastore/projects', [LabDatastoreController::class, 'projects'])->middleware('throttle:30,1')->name('lab.datastore.projects');
    Route::post('/lab/datastore/attach', [LabDatastoreController::class, 'attach'])->middleware('throttle:20,1')->name('lab.datastore.attach');
    Route::delete('/lab/datastore', [LabDatastoreController::class, 'unlink'])->middleware('throttle:20,1')->name('lab.datastore.unlink');
    Route::get('/lab/oauth/supabase/start', [LabSupabaseOAuthController::class, 'start'])->middleware('throttle:20,1')->name('lab.oauth.supabase.start');
    Route::post('/lab/datastore/survey', [LabDatastoreController::class, 'survey'])->middleware('throttle:30,1')->name('lab.datastore.survey');
    Route::get('/lab/datastore/rows', [LabDatastoreController::class, 'records'])->middleware('throttle:60,1')->name('lab.datastore.rows');
    Route::get('/lab/datastore/auth', [LabDatastoreController::class, 'auth'])->middleware('throttle:30,1')->name('lab.datastore.auth');
    Route::patch('/lab/datastore/auth', [LabDatastoreController::class, 'saveAuth'])->middleware('throttle:20,1')->name('lab.datastore.auth.save');
    Route::get('/lab/datastore/users', [LabDatastoreController::class, 'users'])->middleware('throttle:30,1')->name('lab.datastore.users');
    Route::post('/lab/datastore/users', [LabDatastoreController::class, 'addUser'])->middleware('throttle:20,1')->name('lab.datastore.users.add');
    Route::get('/lab/datastore/catalog', [LabDatastoreController::class, 'catalog'])->middleware('throttle:30,1')->name('lab.datastore.catalog');
    Route::post('/lab/datastore/restart', [LabDatastoreController::class, 'restart'])->middleware('throttle:5,1')->name('lab.datastore.restart');
    Route::post('/lab/datastore/revise', [LabDatastoreController::class, 'revise'])->middleware('throttle:20,1')->name('lab.datastore.revise');
    Route::get('/lab/github/accounts', [LabGithubController::class, 'accounts'])->middleware('throttle:30,1')->name('lab.github.accounts');
    Route::get('/lab/github/repositories', [LabGithubController::class, 'repositories'])->middleware('throttle:30,1')->name('lab.github.repositories');
    Route::get('/lab/github/branches', [LabGithubController::class, 'branches'])->middleware('throttle:30,1')->name('lab.github.branches');
    Route::post('/lab/github/import', [LabGithubController::class, 'import'])->middleware('throttle:lab-github-import')->name('lab.github.import');
    Route::post('/lab/github/fork', [LabGithubRemoteController::class, 'fork'])->middleware('throttle:10,1')->name('lab.github.fork');
    Route::get('/lab/github/owned', [LabGithubRemoteController::class, 'repositories'])->middleware('throttle:30,1')->name('lab.github.owned');
    Route::get('/lab/vcs/github/start', [LabGithubVcsController::class, 'start'])->middleware('throttle:20,1')->name('lab.vcs.github.start');
    Route::get('/lab/vcs/github/return', [LabGithubVcsController::class, 'return'])->middleware('throttle:20,1')->name('lab.vcs.github.return');
    Route::delete('/lab/vcs/github/link', [LabGithubVcsController::class, 'destroy'])->middleware('throttle:20,1')->name('lab.vcs.github.unlink');
    Route::get('/lab/{project}', LabController::class)->name('lab.show');

    Route::get('/lab/{project}/workspace', LabController::class)->name('lab.workspace');
    Route::get('/lab/{project}/preview', LabPreviewController::class)->name('lab.preview');
    Route::get('/lab/{project}/cover', [LabCoverController::class, 'show'])->middleware('throttle:120,1')->name('lab.cover.show');
    Route::post('/lab/{project}/cover', [LabCoverController::class, 'update'])->middleware('throttle:30,1')->name('lab.cover.update');
    Route::get('/lab/{project}/publish', [LabPublishController::class, 'show'])->middleware('throttle:120,1')->name('lab.publish.show');
    Route::put('/lab/{project}/publish', [LabPublishController::class, 'update'])->middleware('throttle:10,1')->name('lab.publish.update');
    Route::post('/lab/{project}/publish/artifact', [LabPublishController::class, 'storeArtifact'])->middleware('throttle:10,1')->name('lab.publish.artifact');
    Route::post('/lab/{project}/publish/verify', [LabPublishController::class, 'verify'])->middleware('throttle:20,1')->name('lab.publish.verify');
    Route::delete('/lab/{project}/publish', [LabPublishController::class, 'destroy'])->middleware('throttle:20,1')->name('lab.publish.destroy');
    Route::put('/lab/{project}/turn-state', LabTurnStateController::class)->middleware('throttle:60,1')->name('lab.turn-state');
    Route::post('/lab/{project}/events', LabEventsController::class)->middleware('throttle:120,1')->name('lab.events');
    Route::get('/lab/{project}/files/tree', [LabFilesController::class, 'tree'])->name('lab.files.tree');
    Route::get('/lab/{project}/files/content', [LabFilesController::class, 'show'])->name('lab.files.content');
    Route::post('/lab/{project}/files/batch', [LabFilesController::class, 'batch'])->middleware('throttle:60,1')->name('lab.files.batch');
    Route::put('/lab/{project}/files/content', [LabFilesController::class, 'update'])->middleware('throttle:60,1')->name('lab.files.write');
    Route::post('/lab/{project}/files/commit', [LabFilesController::class, 'commit'])->middleware('throttle:30,1')->name('lab.files.commit');
    Route::post('/lab/{project}/files/mkdir', [LabFilesController::class, 'mkdir'])->middleware('throttle:30,1')->name('lab.files.mkdir');
    Route::delete('/lab/{project}/files', [LabFilesController::class, 'destroy'])->middleware('throttle:30,1')->name('lab.files.destroy');
    Route::get('/lab/{project}/github', [LabGithubRemoteController::class, 'show'])->middleware('throttle:60,1')->name('lab.github.show');
    Route::get('/lab/{project}/github/compare', [LabGithubRemoteController::class, 'compare'])->middleware('throttle:30,1')->name('lab.github.compare');
    Route::post('/lab/{project}/github/link', [LabGithubRemoteController::class, 'link'])->middleware('throttle:20,1')->name('lab.github.link');
    Route::delete('/lab/{project}/github', [LabGithubRemoteController::class, 'unlink'])->middleware('throttle:20,1')->name('lab.github.unlink');
    Route::post('/lab/{project}/github/create', [LabGithubRemoteController::class, 'createRepo'])->middleware('throttle:10,1')->name('lab.github.create');
    Route::post('/lab/{project}/github/fork', [LabGithubRemoteController::class, 'fork'])->middleware('throttle:10,1')->name('lab.github.fork.project');
    Route::post('/lab/{project}/github/push', [LabGithubRemoteController::class, 'push'])->middleware('throttle:10,1')->name('lab.github.push');
    Route::post('/lab/{project}/github/pull', [LabGithubRemoteController::class, 'pull'])->middleware('throttle:10,1')->name('lab.github.pull');
});

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [RegisteredUserController::class, 'store'])->middleware('throttle:register');

    Route::get('login', [SessionController::class, 'create'])->name('login');
    Route::post('login', [SessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->middleware('throttle:password-reset')->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [NewPasswordController::class, 'store'])->middleware('throttle:password-reset')->name('password.store');

    Route::get('twoFactorChallenge', [TwoFactorChallengeController::class, 'create'])->name('twoFactorChallenge');
    Route::post('twoFactorChallenge', [TwoFactorChallengeController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)->name('verification.notice');
    Route::get('verify-email/{token}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');
    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])->name('password.confirm');
    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [SessionController::class, 'destroy'])->name('logout');
});
