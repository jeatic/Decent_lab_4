//crypto.ts

import { webcrypto } from "crypto";


// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};

//Generate RSA key pair
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const keyPair = await webcrypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256",
        modulusLength: 2048,
      },
      true,
      ["encrypt", "decrypt"]
  );
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
}


// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exported = await webcrypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}


// Export a crypto private key to a base64 string format
export async function exportPrvKey(key: webcrypto.CryptoKey | null): Promise<string | null> {
  if (!key) return null;
  const exported = await webcrypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
}


// Import a base64 string public key to its native format
export async function importPubKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
      "spki",
      keyBuffer,
      {
        hash: "SHA-256",
        name: "RSA-OAEP"
        
      },
      true,
      ["encrypt"]
  );
}


// Import a base64 string private key to its native format
export async function importPrvKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
      "pkcs8",
      keyBuffer,
      {
        hash: "SHA-256",
        name: "RSA-OAEP"
        
      },
      true,
      ["decrypt"]
  );
}


// Encrypt a message using an RSA public key
export async function rsaEncrypt(b64Data: string, strPublicKey: string): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const encrypted = await webcrypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      dataBuffer
  );
  return arrayBufferToBase64(encrypted);
}


// Decrypts a message using an RSA private key
export async function rsaDecrypt(data: string, privateKey: webcrypto.CryptoKey): Promise<string> {
  const dataBuffer = base64ToArrayBuffer(data);
  const decrypted = await webcrypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      dataBuffer
  );
  //
    return arrayBufferToBase64(decrypted);
}


// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key

export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> { //creation of export
  return await webcrypto.subtle.generateKey(
      {
        length: 256,
        name: "AES-CBC"
        
      },
      true,
      ["encrypt", "decrypt"]
  );
}




// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exported = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}





// Import a base64 string format to its crypto native format
export async function importSymKey(strKey: string): Promise<webcrypto.CryptoKey> { //import sym key
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-CBC"
      },
      true,
      ["encrypt", "decrypt"]
  );
}

   



// Encrypt a message using a symmetric key
export async function symEncrypt(key: webcrypto.CryptoKey, data: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const dataBuffer = new TextEncoder().encode(data);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    dataBuffer
  );
  const result = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
  return arrayBufferToBase64(result.buffer);
}


// Decrypt a message using a symmetric key
export async function symDecrypt(strKey: string, encryptedData: string): Promise<string> {  //async decrypt
  const key = await importSymKey(strKey);
  const encryptedBuffer = base64ToArrayBuffer(encryptedData);
  const iv = encryptedBuffer.slice(0, 16);
  const data = await webcrypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    encryptedBuffer.slice(16)
  );
  return new TextDecoder().decode(data);
}