<div class="mb-6">
    <h3 class="section-title">{{ __('dashboard.License') }}</h3>
    <p class="section-subtitle">{{ __('dashboard.Enter a purchase code to bind this install, or skip and do it later from Settings → License.') }}</p>
</div>

<div class="form-grid">
    <div class="col-span-full">
        <label class="form-label">{{ __('dashboard.License key') }}</label>
        <input
            type="text"
            wire:model="state.permit_token"
            class="form-input"
            autocomplete="off"
            spellcheck="false"
            placeholder="{{ __('dashboard.Paste your key') }}"
        >
        <p class="form-hint">{{ __('dashboard.Leave empty to continue without a key.') }}</p>
    </div>
</div>
