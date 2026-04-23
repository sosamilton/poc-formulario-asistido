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
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export async function main(token: string): Promise<JWT> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error("Formato JWT inválido: se esperaban 3 partes");
    }
    
    const payloadStr = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadStr);
    
    if (!payload || typeof payload !== "object") {
      throw new Error(`Payload JWT inválido. Valor decodificado: ${JSON.stringify(payload)}`);
    }
    
    const identifier = payload.identifier;
    const fullname = payload.fullname || "";
    const permissions = payload.permissions || [];
    const login = payload.login || "";
    
    if (!identifier) {
      throw new Error(`CUIT no encontrado en token. Claves disponibles: ${Object.keys(payload).join(', ')}`);
    }
    
    return {
      cuit: identifier,
      fullname,
      permissions,
      login,
    };
  } catch (error) {
    throw new Error(`Error al parsear JWT: ${(error as any).message}`);
  }
}
