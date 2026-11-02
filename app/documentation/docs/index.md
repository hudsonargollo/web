# Welcome to Krikkit

Krikkit is an AI-assisted web project builder SaaS developed by **deep42**. This Laravel-based platform lets you run a product where users generate, preview, edit, and publish web projects through an integrated builder workspace—with billing and admin controls included.

You purchased Krikkit on **CodeCanyon**; this documentation covers installation, configuration, and day-to-day operation of your copy.

## About Krikkit

Krikkit is a complete AI builder SaaS that provides:

- **AI-driven builder workflow** — Chat, edit, and iterate on projects with tool-assisted generation
- **Workspace and preview** — File APIs, live preview publishing, and exportable build sessions
- **Modern technology stack** — Laravel, Livewire, Blade, and Tailwind CSS
- **Production-ready billing** — Stripe and PayPal integration with webhook support
- **Operational admin** — Roles, permissions, and dashboard analytics for running the platform

## What is Krikkit?

Krikkit is a SaaS platform for AI-assisted web development. It enables:

- **End users** to create projects, chat with the AI builder, edit files in a workspace, and publish previews
- **Operators** to manage subscriptions, usage limits, and platform settings from the admin dashboard
- **Secure billing** with Stripe and PayPal, including webhook endpoints for subscription lifecycle events
- **Build sessions** with progress tracking and zip export for completed work
- **Role-based access** — Built-in roles and abilities for team and admin access

## Technology Stack

Krikkit is built with modern web technologies:

- **PHP 8.3+** — Required runtime (some dependencies and extensions expect PHP 8.3+)
- **Laravel 13** — Backend framework for APIs, auth, billing, and jobs
- **Livewire 4** — Full-stack UI for the builder and dashboard
- **Blade + Tailwind CSS** — Server-rendered views and styling
- **MySQL** — Recommended database for production
- **Node.js 20+ and npm 10+** — Frontend asset builds and workspace tooling
- **Queue worker** — Database or Redis-backed job processing for builds and async tasks
- **Stripe & PayPal** — Payment and subscription management
- **Access roles** — Role and permission management for operators

## Key Features

### AI Builder

- Lab chat with orchestrated tool rounds and file edits
- Workspace file APIs with size and concurrency limits
- Optional build verification after AI edits (`npm run build`)
- Preview publishing with configurable file and size caps

### Starter templates

- Blank React + Vite starter plus featured SaaS, portfolio, ecommerce, and hospitality sites
- New demos: **Maison Noir**, **Maison Éclat**, **Maison Atelier**, **ArcVault**

### Integrations

- **Supabase** database panel and migrations in the builder
- **GitHub** import, push, and PR workflows
- Stock images (Unsplash / Pixabay)

### Projects & Workspace

- Project lifecycle management from creation to export
- Terminal command execution in the workspace (with timeouts)
- Build sessions with progress and downloadable zip archives
- Thumbnail generation for project previews

### Billing & Admin

- Stripe and PayPal billing with webhook handlers
- Subscription and usage management for SaaS operators
- Admin dashboard with operational analytics
- Role-based access for admins and support staff

## About deep42

**deep42** is a software development company specializing in high-quality Laravel and Livewire applications. Krikkit is one of our premium CodeCanyon products for entrepreneurs and developers who want to launch their own AI-powered website builder SaaS.

## Getting Started

After downloading from CodeCanyon, start with the [Installation](/installation) guide. It walks through the web installer, server requirements (including PHP 8.3+), and post-install configuration for AI providers, payments, queues, and webhooks.

This platform is designed to help you launch and operate a professional AI builder SaaS with minimal custom infrastructure.

## Support

Need help? Open a request on the **[Deep42 Support Hub](https://hub.deep42.co/)**.
