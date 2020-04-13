import * as ExpoNativeCrypto from 'expo-crypto';
import * as ExpoRandom from 'expo-random';
import invariant from 'invariant';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

async function getRandomValuesAsync(input: Uint8Array): Promise<Uint8Array> {
  const output = input;
  // Get access to the underlying raw bytes
  if (input.byteLength !== input.length) input = new Uint8Array(input.buffer);

  const bytes = await ExpoRandom.getRandomBytesAsync(input.length);

  for (let i = 0; i < bytes.length; i++) input[i] = bytes[i];

  return output;
}

function convertBufferToString(buffer: Uint8Array): string {
  const state: string[] = [];
  for (let i = 0; i < buffer.byteLength; i += 1) {
    const index = buffer[i] % CHARSET.length;
    state.push(CHARSET[index]);
  }
  return state.join('');
}

function convertToUrlSafeString(b64: string): string {
  return b64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function generateRandomAsync(size: number): Promise<string> {
  const buffer = new Uint8Array(size);
  // TODO(Bacon): Change this to be sync in the future when Expo unimodules support sync methods
  await getRandomValuesAsync(buffer);
  return convertBufferToString(buffer);
}

/**
 * Proof key for Code Exchange by OAuth Public Clients (RFC 7636), Section 4.1
 * [Section 4.1](https://tools.ietf.org/html/rfc7636#section-4.1)
 */
async function deriveChallengeAsync(code: string): Promise<string> {
  // 43 is the minimum, and 128 is the maximum.
  invariant(code.length > 42 && code.length < 129, 'Invalid code length for PKCE.');

  const buffer = await ExpoNativeCrypto.digestStringAsync(
    ExpoNativeCrypto.CryptoDigestAlgorithm.SHA256,
    code,
    { encoding: ExpoNativeCrypto.CryptoEncoding.BASE64 }
  );
  return convertToUrlSafeString(buffer);
}

export async function buildCodeAsync(
  size: number = 128
): Promise<{ codeChallenge: string; codeVerifier: string }> {
  // This method needs to be resolved like all other native methods.
  const codeVerifier = await generateRandomAsync(size);
  const codeChallenge = await deriveChallengeAsync(codeVerifier);

  return { codeVerifier, codeChallenge };
}
