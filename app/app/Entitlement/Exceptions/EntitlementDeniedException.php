<?php

namespace App\Entitlement\Exceptions;

use RuntimeException;

class EntitlementDeniedException extends RuntimeException
{
    public const HTTP_STATUS = 402;

    /**
     * @param  array{
     *     key: string,
     *     kind: string,
     *     title: string,
     *     allowed: bool,
     *     limit: int|null,
     *     used: int|null,
     *     remaining: int|null,
     *     unlimited: bool,
     *     window: string|null,
     *     plan: array{slug: string, title: string, public_id: string},
     *     suggested_plan: array{slug: string, title: string, public_id: string}|null
     * }  $entitlement
     */
    public function __construct(
        string $message,
        public readonly string $reason,
        public readonly array $entitlement,
    ) {
        parent::__construct($message);
    }

    /**
     * @param  array<string, mixed>  $entitlement
     */
    public static function feature(string $message, array $entitlement): self
    {
        return new self($message, 'feature.locked', $entitlement);
    }

    /**
     * @param  array<string, mixed>  $entitlement
     */
    public static function quota(string $message, array $entitlement): self
    {
        return new self($message, 'quota.exhausted', $entitlement);
    }

    /**
     * @return array{
     *     error: string,
     *     code: string,
     *     message: string,
     *     entitlement: array<string, mixed>
     * }
     */
    public function toArray(): array
    {
        return [
            'error' => 'entitlement_denied',
            'code' => $this->reason,
            'message' => $this->getMessage(),
            'entitlement' => $this->entitlement,
        ];
    }
}
