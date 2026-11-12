/**
 * Castra Cryptographic Backup Protection Engine
 * AES-GCM (256-bit) with PBKDF2 key derivation (100,000 iterations, SHA-256)
 * Provides authenticated client-side encryption for financial backups.
 */

export interface EncryptedBackupContainer {
  _castra_encrypted: true;
  version: number;
  kdf: string;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  let result = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += BASE64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += BASE64_CHARS[bytes[i + 2] & 63];
  }
  if (i < bytes.length) {
    result += BASE64_CHARS[bytes[i] >> 2];
    if (i + 1 < bytes.length) {
      result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      result += BASE64_CHARS[(bytes[i + 1] & 15) << 2];
      result += '=';
    } else {
      result += BASE64_CHARS[(bytes[i] & 3) << 4];
      result += '==';
    }
  }
  return result;
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bytes = new Uint8Array(((len * 3) / 4) | 0);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = BASE64_CHARS.indexOf(clean[i]);
    const b = BASE64_CHARS.indexOf(clean[i + 1]);
    const c = BASE64_CHARS.indexOf(clean[i + 2]);
    const d = BASE64_CHARS.indexOf(clean[i + 3]);
    bytes[p++] = (a << 2) | (b >> 4);
    if (c !== -1 && clean[i + 2] !== '=') bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (d !== -1 && clean[i + 3] !== '=') bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes.subarray(0, p);
}

export function isEncryptedBackup(obj: unknown): obj is EncryptedBackupContainer {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as any)._castra_encrypted === true &&
    typeof (obj as any).ciphertext === 'string' &&
    typeof (obj as any).salt === 'string' &&
    typeof (obj as any).iv === 'string'
  );
}

/**
 * Encrypt plaintext JSON backup with user-supplied passphrase
 */
export async function encryptBackup(plaintextJson: string, passphrase: string): Promise<string> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase must be at least 4 characters long.');
  }

  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('WebCrypto subtle API is not available in this environment.');
  }

  const enc = new TextEncoder();
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintextJson)
  );

  const container: EncryptedBackupContainer = {
    _castra_encrypted: true,
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: 100000,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
  };

  return JSON.stringify(container, null, 2);
}

/**
 * Decrypt encrypted backup container using user-supplied passphrase
 */
export async function decryptBackup(containerJson: string, passphrase: string): Promise<string> {
  const parsed = JSON.parse(containerJson);
  if (!isEncryptedBackup(parsed)) {
    throw new Error('Provided file is not a valid encrypted Castra backup.');
  }

  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('WebCrypto subtle API is not available in this environment.');
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: parsed.iterations || 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      ciphertext as any
    );
    return dec.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Incorrect passphrase or corrupted backup file.');
  }
}
