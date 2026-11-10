<?php

namespace App\Services;

use App\Exceptions\RagServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class RagService
{
    /**
     * @return array{
     *     question: string,
     *     answer: string,
     *     source_count: int,
     *     sources: array<int, array<string, mixed>>,
     *     used_live_data?: bool,
     *     live_tools?: array<int, string>
     * }
     */
    public function ask(string $question, int $topK): array
    {
        $url = rtrim((string) config('services.etl.url'), '/');
        $token = (string) config('services.etl.token');

        if ($url === '' || $token === '') {
            throw new RagServiceException('The RAG service is not configured.');
        }

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout(20)
                ->post($url . '/internal/assistant/ask', [
                    'question' => $question,
                    'top_k' => $topK,
                ]);
        } catch (ConnectionException $exception) {
            throw new RagServiceException(
                'Unable to communicate with the RAG service.',
                previous: $exception,
            );
        }

        if (! $response->successful()) {
            throw new RagServiceException('The RAG service returned an error.');
        }

        $payload = $response->json();

        if (
            ! is_array($payload)
            || ! is_string($payload['question'] ?? null)
            || ! is_string($payload['answer'] ?? null)
            || ! is_int($payload['source_count'] ?? null)
            || ! is_array($payload['sources'] ?? null)
        ) {
            throw new RagServiceException(
                'The RAG service returned an invalid response.',
            );
        }

        return [
            'question' => $payload['question'],
            'answer' => $payload['answer'],
            'source_count' => $payload['source_count'],
            'sources' => array_values(array_filter(
                $payload['sources'],
                static fn (mixed $source): bool => is_array($source),
            )),
            'used_live_data' => (bool) ($payload['used_live_data'] ?? false),
            'live_tools' => array_values(array_filter(
                is_array($payload['live_tools'] ?? null)
                    ? $payload['live_tools']
                    : [],
                static fn (mixed $tool): bool => is_string($tool),
            )),
        ];
    }
}
