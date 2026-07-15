type AssistantRequest = {
  question: string
  language: 'ar' | 'en'
  comparison?: { productIds: string[]; sourceIds: string[] }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST')
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: cors })
  const body = (await request.json().catch(() => null)) as AssistantRequest | null
  if (
    !body ||
    typeof body.question !== 'string' ||
    body.question.length < 1 ||
    body.question.length > 1200 ||
    !['ar', 'en'].includes(body.language)
  ) {
    return Response.json({ error: 'invalid_request' }, { status: 400, headers: cors })
  }
  // Deliberately no client identity, profile, obligation, or payment payload is accepted.
  // A deployed provider adapter must retrieve only approved public facts and validate every claim.
  return Response.json(
    {
      status: 'insufficient-verified-data',
      answer: null,
      comparison: null,
      assumptions: [],
      unknowns: ['Live assistant provider is not configured.'],
      questionsToAskTheBank: [],
      sourceIds: [],
      disclaimer:
        'This assistant is unavailable until a reviewed server-side provider is configured.',
    },
    { status: 503, headers: cors },
  )
})
