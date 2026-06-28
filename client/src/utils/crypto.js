// Helper: ArrayBuffer to Base64
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Text to ArrayBuffer
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// 1. Generate ECDH Key Pair
export async function generateECDHKeys() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

// 2. Export Public Key to JWK string
export async function exportPublicKey(publicKey) {
  const jwk = await window.crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
}

// 3. Import Public Key from JWK string
export async function importPublicKey(jwkString) {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
}

// Export Private Key to JWK string
export async function exportPrivateKey(privateKey) {
  const jwk = await window.crypto.subtle.exportKey('jwk', privateKey);
  return JSON.stringify(jwk);
}

// Import Private Key from JWK string
export async function importPrivateKey(jwkString) {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// 4. Derive symmetric key from passphrase using PBKDF2 (for private key encryption)
async function derivePassphraseKey(passphrase, saltBytes) {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// 5. Encrypt Private Key (before saving to local storage or sending to backup server)
export async function encryptPrivateKey(privateKey, passphrase) {
  // Export private key to JWK
  const jwk = await window.crypto.subtle.exportKey('jwk', privateKey);
  const jwkBytes = textEncoder.encode(JSON.stringify(jwk));
  
  // Generate salt and IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Derive key from passphrase
  const passphraseKey = await derivePassphraseKey(passphrase, salt);
  
  // Encrypt the JWK key
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    passphraseKey,
    jwkBytes
  );
  
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt)
  };
}

// 6. Decrypt Private Key
export async function decryptPrivateKey(encryptedData, passphrase) {
  const { ciphertext, iv, salt } = encryptedData;
  
  const ciphertextBytes = base64ToArrayBuffer(ciphertext);
  const ivBytes = new Uint8Array(base64ToArrayBuffer(iv));
  const saltBytes = new Uint8Array(base64ToArrayBuffer(salt));
  
  // Derive key from passphrase
  const passphraseKey = await derivePassphraseKey(passphrase, saltBytes);
  
  // Decrypt JWK
  const decryptedBytes = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    passphraseKey,
    ciphertextBytes
  );
  
  const jwkString = textDecoder.decode(decryptedBytes);
  const jwk = JSON.parse(jwkString);
  
  // Import JWK private key
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// 7. Derive AES-GCM shared key from local private key and contact's public key
export async function deriveSharedKey(privateKey, contactPublicKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: contactPublicKey
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

// 8. Encrypt plaintext string with AES-GCM key
export async function encryptMessage(text, sharedKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = textEncoder.encode(text);
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedKey,
    plaintextBytes
  );
  
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv)
  };
}

// 9. Decrypt ciphertext string with AES-GCM key
export async function decryptMessage(ciphertext, iv, sharedKey) {
  const ciphertextBytes = base64ToArrayBuffer(ciphertext);
  const ivBytes = new Uint8Array(base64ToArrayBuffer(iv));
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    sharedKey,
    ciphertextBytes
  );
  
  return textDecoder.decode(decrypted);
}

// 10. Encrypt File ArrayBuffer with AES-GCM key
export async function encryptFile(fileBuffer, sharedKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedKey,
    fileBuffer
  );
  
  return {
    ciphertextBlob: new Blob([encrypted]),
    iv: arrayBufferToBase64(iv)
  };
}

// 11. Decrypt File ArrayBuffer with AES-GCM key
export async function decryptFile(encryptedBuffer, iv, sharedKey) {
  const ivBytes = new Uint8Array(base64ToArrayBuffer(iv));
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    sharedKey,
    encryptedBuffer
  );
  
  return decrypted; // returns raw ArrayBuffer
}
