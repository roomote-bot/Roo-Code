import { Env } from './env';
import { logger } from './logger';

export async function getSignInToken(
  userId: string,
): Promise<string | undefined> {
  const response = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      // Default expiration is 30 days (2592000 seconds)
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    logger.error({
      event: 'sign_in_token_creation_failed',
      error: errorData,
      userId,
    });

    throw new Error("Failed to create sign-in token");
  }

  const data = await response.json();

  logger.info({
    event: 'sign_in_token_created',
    userId,
  });

  return data.token;
}
