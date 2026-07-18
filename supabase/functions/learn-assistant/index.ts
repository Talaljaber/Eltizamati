type AssistantRequest = {
  question: string
  language: 'ar' | 'en'
  comparison?: { productIds: string[]; sourceIds: string[] } | null
}

type AssistantResponse = {
  answer: string
  comparison: null
  assumptions: string[]
  unknowns: string[]
  questionsToAskTheBank: string[]
  sourceIds: string[]
  disclaimer: string
  status: 'answered' | 'insufficient-verified-data' | 'needs-user-input' | 'refused'
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
// OPENROUTER_MODEL/OPENROUTER_API_KEY take priority; OPENAI_* names are kept
// as a fallback only so an already-configured secret keeps working without
// a rename. qwen3-next-80b-a3b-instruct is OpenRouter's free tier at time of
// writing — strong instruction-following, native JSON-schema structured
// output support, and solid Arabic (this assistant is bilingual EN/AR).
const model =
  Deno.env.get('OPENROUTER_MODEL') ??
  Deno.env.get('OPENAI_MODEL') ??
  'qwen/qwen3-next-80b-a3b-instruct:free'

function unavailable(): AssistantResponse {
  return {
    answer: '',
    comparison: null,
    assumptions: [],
    unknowns: ['Live assistant provider is not configured.'],
    questionsToAskTheBank: [],
    sourceIds: [],
    disclaimer:
      'This assistant is unavailable until a reviewed server-side provider is configured.',
    status: 'insufficient-verified-data',
  }
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
  const apiKey = Deno.env.get('OPENROUTER_API_KEY') ?? Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return Response.json(unavailable(), { status: 503, headers: cors })

  const instructions = `You are Eltizamati's bilingual financial education assistant for Jordan. Explain general financing concepts in ${body.language}. You are not a financial advisor. Do not claim eligibility, approval, the best bank, guaranteed savings, or current bank terms. Do not invent rates, fees, institutions, legal rights, product facts, or citations. If a question needs institution-specific facts, say that verified catalogue data is unavailable and suggest questions for the institution. Return JSON only matching the requested schema.`
  // OpenRouter is OpenAI-chat-completions-compatible, not the newer OpenAI
  // Responses API the previous OpenAI-direct integration used — different
  // request shape (messages[], response_format.json_schema) and response
  // shape (choices[0].message.content, not output_text).
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Eltizamati',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: body.question },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'learning_assistant_response',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'answer',
              'comparison',
              'assumptions',
              'unknowns',
              'questionsToAskTheBank',
              'sourceIds',
              'disclaimer',
              'status',
            ],
            properties: {
              answer: { type: 'string' },
              comparison: { type: 'null' },
              assumptions: { type: 'array', items: { type: 'string' } },
              unknowns: { type: 'array', items: { type: 'string' } },
              questionsToAskTheBank: { type: 'array', items: { type: 'string' } },
              sourceIds: { type: 'array', items: { type: 'string' } },
              disclaimer: { type: 'string' },
              status: {
                type: 'string',
                enum: ['answered', 'insufficient-verified-data', 'needs-user-input', 'refused'],
              },
            },
          },
        },
      },
    }),
  })
  if (!upstream.ok) {
    // Logged server-side only (visible via `supabase functions logs
    // learn-assistant` / the dashboard) — never forwarded to the client,
    // which only ever sees the generic unavailable() shape.
    console.error('learn-assistant: OpenRouter request failed', {
      status: upstream.status,
      body: await upstream.text().catch(() => '<unreadable>'),
    })
    return Response.json(
      { ...unavailable(), unknowns: ['The live assistant is temporarily unavailable.'] },
      { status: 503, headers: cors },
    )
  }
  const raw = (await upstream.json()) as { choices?: { message?: { content?: string } }[] }
  const content = raw.choices?.[0]?.message?.content
  let parsed: AssistantResponse
  try {
    parsed = content ? (JSON.parse(content) as AssistantResponse) : unavailable()
  } catch {
    return Response.json(
      { ...unavailable(), unknowns: ['The live assistant returned an unreadable response.'] },
      { status: 502, headers: cors },
    )
  }
  if (!parsed.sourceIds.every((id) => body.comparison?.sourceIds.includes(id) ?? false))
    return Response.json(unavailable(), { status: 502, headers: cors })
  return Response.json(parsed, { headers: cors })
})
