<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use App\Models\Item;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\InventoryMovement;

class EtlImportController extends Controller
{
    public function previewInventory(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $file = $request->file('file');

        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'xlsx'], true)) {
            return response()->json([
                'message' => 'Only CSV and XLSX files are supported.',
            ], 422);
        }

        $etlUrl = rtrim(
            (string) config('services.etl.url'),
            '/'
        );

        $etlToken = (string) config('services.etl.token');

        if ($etlUrl === '' || $etlToken === '') {
            return response()->json([
                'message' => 'The ETL service is not configured.',
            ], 503);
        }

        try {
            $response = Http::withToken($etlToken)
                ->acceptJson()
                ->timeout(60)
                ->attach(
                    'file',
                    file_get_contents($file->getRealPath()),
                    $file->getClientOriginalName(),
                )
                ->post($etlUrl . '/internal/inventory/previews');

            return response()->json(
                $response->json() ?? [
                    'message' => 'The ETL service returned an invalid response.',
                ],
                $response->status(),
            );
        } catch (
            ConnectionException | RequestException $exception
        ) {
            report($exception);

            return response()->json([
                'message' => 'Unable to communicate with the ETL service. Please try again.',
            ], 502);
        }
    }
    
public function importInventory(string $jobId): JsonResponse
{
    if (! preg_match('/\A[a-f0-9]{32}\z/i', $jobId)) {
        return response()->json([
            'message' => 'Invalid preview job ID.',
        ], 422);
    }

    $etlUrl = rtrim(
        (string) config('services.etl.url'),
        '/'
    );

    $etlToken = (string) config('services.etl.token');

    if ($etlUrl === '' || $etlToken === '') {
        return response()->json([
            'message' => 'The ETL service is not configured.',
        ], 503);
    }

    try {
        $response = Http::withToken($etlToken)
            ->acceptJson()
            ->timeout(60)
            ->get(
                $etlUrl . '/internal/inventory/previews/'
                . $jobId . '/records'
            );
    } catch (ConnectionException $exception) {
        report($exception);

        return response()->json([
            'message' => 'Unable to communicate with the ETL service.',
        ], 502);
    }

    if (! $response->successful()) {
        $payload = $response->json();

        return response()->json([
            'message' => is_array($payload)
                ? ($payload['detail'] ?? 'Unable to retrieve preview records.')
                : 'Unable to retrieve preview records.',
        ], $response->status());
    }

    $payload = $response->json();

    if (! is_array($payload) || ! is_array($payload['records'] ?? null)) {
        return response()->json([
            'message' => 'The ETL service returned an invalid response.',
        ], 502);
    }

    $records = $payload['records'];

    if (count($records) > 500) {
        return response()->json([
            'message' => 'The maximum import size is 500 records.',
        ], 413);
    }

    // Revalidate every record before writing anything to the database.
    $validatedRows = [];
    $validationErrors = [];

    foreach ($records as $index => $row) {
        if (! is_array($row)) {
            $validationErrors[$index] = ['Invalid record format.'];
            continue;
        }

        $validator = Validator::make($row, [
            'sku' => ['required', 'string', 'max:50', 'regex:/\S/'],
            'name' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:0'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit' => ['sometimes', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            $validationErrors[$index] = $validator->errors()->all();
            continue;
        }

        $clean = $validator->validated();
        $clean['sku'] = strtoupper(trim($clean['sku']));
        $clean['name'] = trim($clean['name']);

        $validatedRows[] = $clean;
    }

    if ($validationErrors !== []) {
        return response()->json([
            'message' => 'Server-side validation failed. Nothing was imported.',
            'errors' => $validationErrors,
        ], 422);
    }

    $results = DB::transaction(function () use ($validatedRows) {
        $results = [];
        $seen = [];

        foreach ($validatedRows as $row) {
            $sku = $row['sku'];

            if (isset($seen[$sku])) {
                $results[] = [
                    'sku' => $sku,
                    'status' => 'conflict',
                    'message' => 'Duplicate SKU within this file.',
                ];
                continue;
            }

            $seen[$sku] = true;

            if (Item::query()->where('sku', $sku)->exists()) {
                $results[] = [
                    'sku' => $sku,
                    'status' => 'conflict',
                    'message' => 'SKU already exists; item was not changed.',
                ];
                continue;
            }

            $item = Item::create([
                'sku' => $sku,
                'name' => $row['name'],
                'description' => $row['description'] ?? null,
                // ERPFlow manages stock separately.
                'quantity' => (int) $row['quantity'],
                'reorder_level' => $row['reorder_level'] ?? 10,
                'unit_price' => $row['unit_price'],
                'unit' => $row['unit'] ?? 'piece',
            ]);

            if ((int) $row['quantity'] > 0) {
            InventoryMovement::create([
                'item_id' => $item->id,
                'type' => 'in',
                'quantity' => (int) $row['quantity'],
                'reason' => 'Initial stock imported from inventory file',
            ]);
        }

            $results[] = [
                'sku' => $sku,
                'status' => 'imported',
                'item_id' => $item->id,
                'message' => 'Item created with zero stock.',
            ];
        }

        return $results;
    });

    $imported = count(array_filter(
        $results,
        fn (array $result) => $result['status'] === 'imported'
    ));

    $conflicts = count(array_filter(
        $results,
        fn (array $result) => $result['status'] === 'conflict'
    ));

    return response()->json([
        'source_filename' => $payload['source_filename'] ?? null,
        'total_rows' => $payload['total_rows'] ?? count($records),
        'valid_rows' => count($records),
        'invalid_rows' => $payload['invalid_rows'] ?? 0,
        'imported' => $imported,
        'conflicts' => $conflicts,
        'results' => $results,
    ]);
}

}
