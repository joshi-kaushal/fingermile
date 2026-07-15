const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate 2048-bit RSA keypair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save private key to key.pem
const keyPath = path.join(__dirname, 'key.pem');
fs.writeFileSync(keyPath, privateKey);

// Convert public key DER buffer to Base64
const pubKeyBase64 = publicKey.toString('base64');

// Calculate Chrome Extension ID from DER public key
const hash = crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 32);
const extensionId = hash.split('').map(char => {
  const code = char.charCodeAt(0);
  if (code >= 48 && code <= 57) { // '0'-'9'
    return String.fromCharCode(code + 49); // 'a'-'j'
  } else { // 'a'-'f'
    return String.fromCharCode(code + 10); // 'k'-'p'
  }
}).join('');

console.log('==================================================');
console.log(`1. Save this private key file (already written to ${keyPath})`);
console.log('2. Add this "key" to your manifest.json:');
console.log('--------------------------------------------------');
console.log(`"key": "${pubKeyBase64}"`);
console.log('--------------------------------------------------');
console.log(`3. Your stable Chrome Extension ID will be: ${extensionId}`);
console.log(`4. Add this to Clerk's allowed_origins:`);
console.log(`   chrome-extension://${extensionId}`);
console.log('==================================================');
