<?php

namespace App\Visuals;

/**
 * One licensed stock photograph the Lab agent may hotlink.
 */
final readonly class VisualHit
{
    public function __construct(
        public string $src,
        public string $thumb,
        public string $alt,
        public string $credit,
        public string $href,
        public string $catalog,
        public ?int $width = null,
        public ?int $height = null,
    ) {}

    /**
     * @return array{
     *     src: string,
     *     thumb: string,
     *     alt: string,
     *     credit: string,
     *     href: string,
     *     catalog: string,
     *     width: int|null,
     *     height: int|null
     * }
     */
    public function toArray(): array
    {
        return [
            'src' => $this->src,
            'thumb' => $this->thumb,
            'alt' => $this->alt,
            'credit' => $this->credit,
            'href' => $this->href,
            'catalog' => $this->catalog,
            'width' => $this->width,
            'height' => $this->height,
        ];
    }
}
