function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str, 'utf-8').toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function main(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: "riHK6l1evmb0Ux_FhS13rRAGR5p3za9WgQ_YdZrKkcc"
  };
  
  const payload = {
    exp: now + 3600,
    iat: now,
    jti: "7af002ef-8be6-412c-9b77-6dce2207fef4",
    iss: "https://idp.test.arba.gov.ar/realms/ARBA",
    sub: "f:6fc04c49-4702-47dc-aee1-6764ed79e6d1:20345534234",
    typ: "Bearer",
    azp: "external",
    sid: "f6d21819-fd7e-4915-a5c5-a3bac0228d55",
    acr: "1",
    "allowed-origins": ["/*"],
    scope: "openid arba-roles arba-roles-all",
    identifier: "20345534234",
    permissions: ["IngresosBrutos|Contribuyente|Contribuyente"],
    fullname: "JUAN PALOTE",
    login: "20345534234",
    type: "EXTERNO"
  };
  
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  
  const signature = base64UrlEncode("fake-signature-for-testing");
  
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}
