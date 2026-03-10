type JWT = {
  cuit: string;
  fullname: string;
  permissions: string[];
  login: string;
};

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export async function main(token: string): Promise<JWT> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format: expected 3 parts");
    }
    
    const payloadStr = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadStr);
    
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid JWT payload");
    }
    
    const identifier = payload.identifier;
    const fullname = payload.fullname || "";
    const permissions = payload.permissions || [];
    const login = payload.login || "";
    
    if (!identifier) {
      throw new Error("CUIT not found in token (identifier claim missing)");
    }
    
    return {
      cuit: identifier,
      fullname,
      permissions,
      login,
    };
  } catch (error) {
    throw new Error(`Failed to parse JWT: ${(error as Error).message}`);
  }
}
