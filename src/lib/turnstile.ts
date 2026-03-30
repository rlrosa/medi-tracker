export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // testing key
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // testing secret

export async function verifyTurnstileToken(token: string) {
  const formData = new URLSearchParams();
  formData.append('secret', TURNSTILE_SECRET_KEY);
  formData.append('response', token);

  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  const result = await fetch(url, {
    body: formData,
    method: 'POST',
  });

  const outcome = await result.json();
  if (outcome.success) {
    return true;
  }

  return false;
}
