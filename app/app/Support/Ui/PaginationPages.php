<?php

namespace App\Support\Ui;

final class PaginationPages
{
    /**
     * Page numbers to render. Null is an ellipsis gap.
     *
     * @return list<int|null>
     */
    public static function numbers(int $current, int $last, int $radius = 2): array
    {
        $last = max(1, $last);
        $current = min(max(1, $current), $last);

        if ($last <= 7) {
            return range(1, $last);
        }

        $start = max(2, $current - $radius);
        $end = min($last - 1, $current + $radius);

        if ($current <= $radius + 2) {
            $start = 2;
            $end = min($last - 1, 2 + ($radius * 2));
        }

        if ($current >= $last - ($radius + 1)) {
            $end = $last - 1;
            $start = max(2, $last - 1 - ($radius * 2));
        }

        $pages = [1];

        if ($start > 2) {
            $pages[] = null;
        }

        foreach (range($start, $end) as $page) {
            $pages[] = $page;
        }

        if ($end < $last - 1) {
            $pages[] = null;
        }

        $pages[] = $last;

        return $pages;
    }
}
