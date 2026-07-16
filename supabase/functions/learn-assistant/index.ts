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
const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini'

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
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return Response.json(unavailable(), { status: 503, headers: cors })

  const instructions = `You are Eltizamati's bilingual financial education assistant for Jordan. Explain general financing concepts in ${body.language}. You are not a financial advisor. Do not claim eligibility, approval, the best bank, guaranteed savings, or current bank terms. Do not invent rates, fees, institutions, legal rights, product facts, or citations. If a question needs institution-specific facts, say that verified catalogue data is unavailable and suggest questions for the institution. Return JSON only matching the requested schema.`
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      instructions,
      input: body.question,
      max_output_tokens: 500,
      text: {
        format: {
          type: 'json_schema',
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
  if (!upstream.ok)
    return Response.json(
      { ...unavailable(), unknowns: ['The live assistant is temporarily unavailable.'] },
      { status: 503, headers: cors },
    )
  const raw = (await upstream.json()) as { output_text?: string }
  const parsed = raw.output_text
    ? (JSON.parse(raw.output_text) as AssistantResponse)
    : unavailable()
  if (!parsed.sourceIds.every((id) => body.comparison?.sourceIds.includes(id) ?? false))
    return Response.json(unavailable(), { status: 502, headers: cors })
  return Response.json(parsed, { headers: cors })
})
