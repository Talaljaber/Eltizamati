// Account deletion (Phase 4, database-schema.md §6). The only place the
// service-role key is used — never in client code (NFR-SEC-001). Deleting
// the auth.users row cascades to every owned table automatically: every
// table in §1 has either a direct `user_id -> auth.users(id) on delete
// cascade` FK (profiles, consent_records, obligations, calculation_runs,
// insights) or an indirect one via `obligations` (loan_details,
// murabaha_details, card_details, rate_periods, payments) — confirmed by
// Phase 3's pgTAP cascade tests. No manual per-table deletion is needed.
//
// Audit trail: MVP has no `audit_events` table (P1-reserved per §6) — this
// function's own invocation log (Supabase platform logging) is the only
// retained trace, a known MVP limitation stated in database-schema.md §6,
// not a silent gap.
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Mirrors learn-assistant/index.ts. Without these the browser preflight (Expo web
// on http://localhost:8081) is blocked before the request ever reaches the auth
// check. Native builds don't send preflights, so this only affects web.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (authHeader === null) {
    return new Response(JSON.stringify({ error: 'missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  }

  // Authenticate the caller as themselves (anon-key client + their JWT) —
  // never trust a client-supplied user id.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
  const {
    data: { user },
    error: getUserError,
  } = await callerClient.auth.getUser()
  if (getUserError !== null || user === null) {
    return new Response(JSON.stringify({ error: 'invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  }

  // Service-role client — only path in this codebase allowed to hold this key.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError !== null) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  }

  // eslint-disable-next-line no-console
  console.log(`account-deletion: erased user (id redacted from logs, see platform audit trail)`)

  return new Response(JSON.stringify({ deleted: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
})
