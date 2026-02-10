import { decode } from "https://deno.land/x/djwt@v2.8/mod.ts";

type JWT = {
  cuit: string;
  fullname: string;
  permissions: string[];
  login: string;
};

export async function main(token: string): Promise<JWT> {
  try {
    // Decode JWT without verification (for demo purposes)
    const [_header, payload, _signature] = decode(token);
    
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid JWT payload");
    }
    
    const identifier = (payload as any).identifier;
    const fullname = (payload as any).fullname || "";
    const permissions = (payload as any).permissions || [];
    const login = (payload as any).login || "";
    
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
