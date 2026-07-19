<?php

namespace App\Models\Builders;

use Illuminate\Database\Eloquent\Builder;

/**
 * Normalizes dorm column references for lodgex `rooms_old`,
 * which stores the dorm string in `dorm` (not camp-reservations `rooms.name`).
 */
class RoomBuilder extends Builder
{
    private const DORM_COLUMN = 'dorm';

    private function mapColumn(string $column): string
    {
        return $column === 'dorm' ? self::DORM_COLUMN : $column;
    }

    public function where($column, $operator = null, $value = null, $boolean = 'and')
    {
        if (is_string($column)) {
            $column = $this->mapColumn($column);
        } elseif (is_array($column)) {
            $mapped = [];
            foreach ($column as $key => $val) {
                $mapped[$this->mapColumn((string) $key)] = $val;
            }
            $column = $mapped;
        }

        return parent::where($column, $operator, $value, $boolean);
    }

    public function orderBy($column, $direction = 'asc')
    {
        if (is_string($column)) {
            $column = $this->mapColumn($column);
        }

        return parent::orderBy($column, $direction);
    }

    public function groupBy(...$groups)
    {
        $groups = array_map(
            fn ($group) => is_string($group) ? $this->mapColumn($group) : $group,
            $groups,
        );

        return parent::groupBy(...$groups);
    }

    /**
     * @param  array<int, mixed>|mixed  $columns
     */
    public function select($columns = ['*'])
    {
        $columns = is_array($columns) ? $columns : func_get_args();
        $mapped = array_map(
            fn ($column) => $column === 'dorm' ? self::DORM_COLUMN.' as dorm' : $column,
            $columns,
        );

        return parent::select($mapped);
    }

    public function pluck($column, $key = null)
    {
        if ($column === 'dorm') {
            return parent::pluck(self::DORM_COLUMN, $key);
        }

        return parent::pluck($column, $key);
    }

    public function whereNotNull($column, $boolean = 'and')
    {
        if (is_string($column)) {
            $column = $this->mapColumn($column);
        }

        return parent::whereNotNull($column, $boolean);
    }

    public function whereNull($column, $boolean = 'and')
    {
        if (is_string($column)) {
            $column = $this->mapColumn($column);
        }

        return parent::whereNull($column, $boolean);
    }
}
