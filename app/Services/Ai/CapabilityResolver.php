<?php

namespace App\Services\Ai;

use InvalidArgumentException;

class CapabilityResolver
{
    public const PRODUCTS = ['crew_hub', 'smart_lodge', 'major_projects'];

    /**
     * @return array<string, array{product: string, title: ?string, repo_surface: ?string}>
     */
    public function catalog(): array
    {
        /** @var array<string, array{product: string, title: ?string, repo_surface: ?string}> $catalog */
        $catalog = config('ai.capabilities', []);

        return $catalog;
    }

    public function exists(string $id): bool
    {
        return array_key_exists($id, $this->catalog());
    }

    /**
     * @throws InvalidArgumentException
     */
    public function assertKnown(string $id): void
    {
        if (! $this->exists($id)) {
            throw new InvalidArgumentException("Unknown LodgeX capability id [{$id}]. Official IDs only.");
        }
    }

    public function productFor(string $id): string
    {
        $this->assertKnown($id);

        return $this->catalog()[$id]['product'];
    }

    /**
     * Each product can run standalone. Availability never requires another product.
     */
    public function isAvailable(string $id): bool
    {
        return $this->exists($id);
    }

    /**
     * Optional wiring only — never a hard dependency.
     *
     * @return list<string>
     */
    public function optionalConnections(string $id): array
    {
        if (! $this->exists($id)) {
            return [];
        }

        /** @var array<string, list<string>> $map */
        $map = config('ai.optional_connections', []);

        return array_values(array_filter(
            $map[$id] ?? [],
            fn (string $other) => $this->exists($other),
        ));
    }

    public function hasOptionalConnection(string $from, string $to): bool
    {
        return in_array($to, $this->optionalConnections($from), true);
    }

    /**
     * @return list<string>
     */
    public function idsForProduct(string $product): array
    {
        return array_keys(array_filter(
            $this->catalog(),
            fn (array $row) => $row['product'] === $product,
        ));
    }

    /**
     * @return list<string>
     */
    public function products(): array
    {
        return self::PRODUCTS;
    }
}
