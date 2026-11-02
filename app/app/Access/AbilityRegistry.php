<?php

namespace App\Access;

final class AbilityRegistry
{
    /**
     * Built-in ability catalog for Krikkit (not imported from any legacy app).
     *
     * @return list<array{code: string, cluster: string, title: string}>
     */
    public static function definitions(): array
    {
        return [
            ['code' => 'dashboard.access', 'cluster' => 'dashboard', 'title' => 'Access dashboard'],
            ['code' => 'users.browse', 'cluster' => 'users', 'title' => 'Browse users'],
            ['code' => 'users.compose', 'cluster' => 'users', 'title' => 'Compose users'],
            ['code' => 'users.revise', 'cluster' => 'users', 'title' => 'Revise users'],
            ['code' => 'sessions.browse', 'cluster' => 'sessions', 'title' => 'Browse login sessions'],
            ['code' => 'roles.browse', 'cluster' => 'roles', 'title' => 'Browse access roles'],
            ['code' => 'roles.compose', 'cluster' => 'roles', 'title' => 'Compose access roles'],
            ['code' => 'roles.revise', 'cluster' => 'roles', 'title' => 'Revise access roles'],
            ['code' => 'roles.retire', 'cluster' => 'roles', 'title' => 'Retire access roles'],
            ['code' => 'security.self', 'cluster' => 'security', 'title' => 'Manage own security'],
            ['code' => 'ai.revise', 'cluster' => 'ai', 'title' => 'Configure API integrations'],
            ['code' => 'packs.browse', 'cluster' => 'packs', 'title' => 'Browse packs'],
            ['code' => 'packs.compose', 'cluster' => 'packs', 'title' => 'Compose packs'],
            ['code' => 'packs.revise', 'cluster' => 'packs', 'title' => 'Revise packs'],
            ['code' => 'packs.retire', 'cluster' => 'packs', 'title' => 'Retire packs'],
            ['code' => 'payments.revise', 'cluster' => 'payments', 'title' => 'Configure payment methods'],
            ['code' => 'finance.browse', 'cluster' => 'finance', 'title' => 'Browse finance'],
            ['code' => 'finance.revise', 'cluster' => 'finance', 'title' => 'Revise finance'],
            ['code' => 'projects.browse', 'cluster' => 'projects', 'title' => 'Browse Lab projects'],
            ['code' => 'projects.revise', 'cluster' => 'projects', 'title' => 'Revise Lab projects'],
            ['code' => 'projects.retire', 'cluster' => 'projects', 'title' => 'Retire Lab projects'],
            ['code' => 'settings.revise', 'cluster' => 'settings', 'title' => 'Configure site settings'],
            ['code' => 'contacts.browse', 'cluster' => 'contacts', 'title' => 'Browse contacts'],
            ['code' => 'contacts.revise', 'cluster' => 'contacts', 'title' => 'Reply to contacts'],
            ['code' => 'blog.browse', 'cluster' => 'blog', 'title' => 'Browse blog posts'],
            ['code' => 'blog.compose', 'cluster' => 'blog', 'title' => 'Compose blog posts'],
            ['code' => 'blog.revise', 'cluster' => 'blog', 'title' => 'Revise blog posts'],
            ['code' => 'blog.retire', 'cluster' => 'blog', 'title' => 'Retire blog posts'],
            ['code' => 'pages.browse', 'cluster' => 'pages', 'title' => 'Browse pages'],
            ['code' => 'pages.compose', 'cluster' => 'pages', 'title' => 'Compose pages'],
            ['code' => 'pages.revise', 'cluster' => 'pages', 'title' => 'Revise pages'],
            ['code' => 'pages.retire', 'cluster' => 'pages', 'title' => 'Retire pages'],
            ['code' => 'languages.browse', 'cluster' => 'languages', 'title' => 'Browse languages'],
            ['code' => 'languages.compose', 'cluster' => 'languages', 'title' => 'Compose languages'],
            ['code' => 'languages.revise', 'cluster' => 'languages', 'title' => 'Revise languages'],
            ['code' => 'languages.retire', 'cluster' => 'languages', 'title' => 'Retire languages'],
        ];
    }

    /**
     * @return list<string>
     */
    public static function codes(): array
    {
        return array_column(self::definitions(), 'code');
    }
}
