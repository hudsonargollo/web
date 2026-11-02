@php
    $site = app(\App\Support\Site\SiteSettings::class);
    $seo = $site->bag('seo');
    $analytics = trim((string) ($seo['analytics_id'] ?? ''));
    $gdpr = $site->bag('gdpr');
    $waitConsent = (bool) ($gdpr['enabled'] ?? false) && (bool) ($gdpr['consent_analytics'] ?? true);
@endphp
{!! app(\App\Support\Seo\PageSeo::class)->markup() !!}
@if ($analytics !== '')
    <script>
        window.krikkitAnalyticsId = @js($analytics)
        window.krikkitWaitConsent = @js($waitConsent)
        window.krikkitLoadAnalytics = function () {
            if (!window.krikkitAnalyticsId || window.krikkitAnalyticsReady) return
            window.krikkitAnalyticsReady = true
            var s = document.createElement('script')
            s.async = true
            s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(window.krikkitAnalyticsId)
            document.head.appendChild(s)
            window.dataLayer = window.dataLayer || []
            function gtag(){ dataLayer.push(arguments) }
            window.gtag = gtag
            gtag('js', new Date())
            gtag('config', window.krikkitAnalyticsId)
        }
        if (!window.krikkitWaitConsent || localStorage.getItem('krikkit-cookie-consent') === 'all') {
            window.krikkitLoadAnalytics()
        }
    </script>
@endif
