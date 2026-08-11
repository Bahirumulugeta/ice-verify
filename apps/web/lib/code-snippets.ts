import { API_BASE_URL } from './constants';

export interface CodeSnippetParams {
  apiKey: string;
  provider: string;
  reference: string;
  expectedAmount?: number;
  currency?: string;
  expectedReceiver?: string;
}

export function buildVerificationPayload(params: CodeSnippetParams) {
  const body: Record<string, unknown> = {
    provider: params.provider,
    reference: params.reference,
  };
  if (params.expectedAmount !== undefined) body.expectedAmount = params.expectedAmount;
  if (params.currency) body.currency = params.currency;
  if (params.expectedReceiver) body.expectedReceiver = params.expectedReceiver;
  return body;
}

export function generateCurlSnippet(params: CodeSnippetParams) {
  const body = buildVerificationPayload(params);
  return `curl -X POST '${API_BASE_URL}/api/v1/verifications' \\
  -H 'Authorization: Bearer ${params.apiKey}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(body, null, 2)}'`;
}

export function generateJsSnippet(params: CodeSnippetParams) {
  const body = JSON.stringify(buildVerificationPayload(params), null, 2);
  return `const response = await fetch('${API_BASE_URL}/api/v1/verifications', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ${params.apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${body}),
});

const result = await response.json();
console.log(result);`;
}

export function generateTsSnippet(params: CodeSnippetParams) {
  return `import { IceVerification } from '@ice/api-client';

const client = new IceVerification({
  apiKey: '${params.apiKey}',
  baseUrl: '${API_BASE_URL}',
});

const result = await client.verifications.create(${JSON.stringify(buildVerificationPayload(params), null, 2)});

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}`;
}

export function generatePythonSnippet(params: CodeSnippetParams) {
  const body = buildVerificationPayload(params);
  return `import requests

response = requests.post(
    "${API_BASE_URL}/api/v1/verifications",
    headers={
        "Authorization": "Bearer ${params.apiKey}",
        "Content-Type": "application/json",
    },
    json=${JSON.stringify(body, null, 4).replace(/"/g, '"')},
)

print(response.json())`;
}

export type SnippetLanguage = 'curl' | 'javascript' | 'typescript' | 'python';

export function getSnippet(language: SnippetLanguage, params: CodeSnippetParams) {
  switch (language) {
    case 'curl':
      return generateCurlSnippet(params);
    case 'javascript':
      return generateJsSnippet(params);
    case 'typescript':
      return generateTsSnippet(params);
    case 'python':
      return generatePythonSnippet(params);
  }
}
