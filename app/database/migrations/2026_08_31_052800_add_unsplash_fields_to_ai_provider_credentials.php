<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_provider_credentials', function (Blueprint $table) {
            $table->string('application_id')->nullable()->after('provider');
            $table->text('api_secret')->nullable()->after('api_key');
        });
    }

    public function down(): void
    {
        Schema::table('ai_provider_credentials', function (Blueprint $table) {
            $table->dropColumn(['application_id', 'api_secret']);
        });
    }
};
