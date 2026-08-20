<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateLodgeXMcp
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = trim((string) config('ai.mcp.token'));
        if ($expected === '') {
            return response()->json([
                'ok' => false,
                'error' => 'LODGEX_MCP_TOKEN is not configured.',
            ], 503);
        }

        $provided = (string) ($request->bearerToken() ?: $request->header('X-Lodgex-Mcp-Token', ''));
        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'ok' => false,
                'error' => 'Unauthorized.',
            ], 401);
        }

        return $next($request);
    }
}
