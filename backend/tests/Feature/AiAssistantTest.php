<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiAssistantTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.etl.url' => 'http://etl:8000',
            'services.etl.token' => 'test-rag-token',
        ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->postJson('/api/ai/ask', [
            'question' => 'Who approves a purchase?',
        ])->assertUnauthorized();
    }

    public function test_authenticated_question_uses_default_top_k(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Http::fake([
            'http://etl:8000/internal/assistant/ask' => Http::response([
                'question' => 'Who approves a purchase?',
                'answer' => 'The finance director approves it.',
                'source_count' => 1,
                'sources' => [['policy_id' => 'PR-001']],
            ]),
        ]);

        $response = $this->postJson('/api/ai/ask', [
            'question' => 'Who approves a purchase?',
        ]);

        $response->assertOk()
            ->assertJsonPath('answer', 'The finance director approves it.')
            ->assertJsonPath('source_count', 1);

        Http::assertSent(fn ($request) =>
            $request->url() === 'http://etl:8000/internal/assistant/ask'
            && $request->header('Authorization')[0] === 'Bearer test-rag-token'
            && $request['top_k'] === 5
        );
    }

    public function test_authenticated_question_forwards_custom_top_k(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Http::fake([
            '*' => Http::response([
                'question' => 'What is the receiving process?',
                'answer' => 'Inspect, record, and put away the goods.',
                'source_count' => 0,
                'sources' => [],
            ]),
        ]);

        $this->postJson('/api/ai/ask', [
            'question' => 'What is the receiving process?',
            'top_k' => 2,
        ])->assertOk();

        Http::assertSent(fn ($request) => $request['top_k'] === 2);
    }

    public function test_invalid_questions_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/ai/ask', [
            'question' => str_repeat('x', 1001),
            'top_k' => 11,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['question', 'top_k']);
    }

    public function test_upstream_errors_are_returned_without_exposing_credentials(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Http::fake(['*' => Http::response(['detail' => 'upstream failure'], 503)]);

        $this->postJson('/api/ai/ask', [
            'question' => 'Is the service available?',
        ])->assertStatus(502)
            ->assertJsonPath('message', 'The RAG service returned an error.')
            ->assertJsonMissing(['test-rag-token']);
    }

    public function test_upstream_timeout_is_handled(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Http::fake([
            '*' => static function (): never {
                throw new ConnectionException('Timed out');
            },
        ]);

        $this->postJson('/api/ai/ask', [
            'question' => 'Is the service available?',
        ])->assertStatus(502)
            ->assertJsonPath('message', 'Unable to communicate with the RAG service.');
    }

    public function test_malformed_upstream_responses_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Http::fake(['*' => Http::response(['answer' => 'Missing fields'])]);

        $this->postJson('/api/ai/ask', [
            'question' => 'What is the policy?',
        ])->assertStatus(502)
            ->assertJsonPath('message', 'The RAG service returned an invalid response.');
    }
}
