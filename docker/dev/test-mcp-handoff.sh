#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

test_file=workspaces/clients/php/workspaces/laravel/tests/Browser/McpHandoffTest.php

test_container=puth-dev-mcp-handoff-test

# Killing "compose run" does not stop its container, and a leftover test would keep waiting for a handoff.
cleanup() {
    rm -f "$test_file"
    docker rm -f "$test_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cat > "$test_file" <<'PHP'
<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser;
use Puth\Laravel\PuthEnablePortal;
use Tests\PuthTestCase;

class McpHandoffTest extends PuthTestCase
{
    use PuthEnablePortal;

    function test_agent_uses_what_the_test_set_up()
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/')->loginAs($user);

            Assert::assertSame('released', $browser->handoff('mail flow', ['timeout' => 90000]));

            // Only true if the request of the agent ran in this process.
            Mail::assertSentCount(1);

            // This goes back to the current URL afterwards, which would send the mail again.
            $browser->assertAuthenticatedAs($user);
        });
    }
}
PHP

docker compose run --rm --no-deps -T --name "$test_container" laravel-test php artisan test --without-tty --cache-directory=/tmp/phpunit-cache --filter=McpHandoffTest &
test_process=$!

docker compose run --rm --no-deps -T \
    -e PUTH_INSTANCE_URL=http://puth:7345 \
    -e PUTH_APP_URL=http://laravel:8080 \
    node-test node --import tsx dev/mcp/take-over-test.ts

wait "$test_process"

echo 'The agent used what the test set up, and the test passed afterwards.'
