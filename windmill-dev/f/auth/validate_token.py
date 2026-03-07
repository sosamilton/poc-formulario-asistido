"""
Validación de tokens JWT
Soporta:
- Tokens mock (desarrollo)
- Tokens Keycloak (producción)
"""

import json
import base64
from typing import Dict, Any


def main(token: str) -> Dict[str, Any]:
    """
    Valida un token JWT y retorna los datos del usuario
    
    Args:
        token: Token JWT (mock o real)
    
    Returns:
        Dict con datos del usuario: cuit, nombre, email, roles
    
    Raises:
        Exception si el token es inválido
    """
    if not token:
        raise Exception("Token no proporcionado")
    
    try:
        # Separar partes del JWT
        parts = token.split('.')
        if len(parts) != 3:
            raise Exception("Token JWT inválido")
        
        # Decodificar payload
        payload_b64 = parts[1]
        # Agregar padding si es necesario
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload_json = base64.b64decode(payload_b64)
        payload = json.loads(payload_json)
        
        # Verificar expiración
        import time
        if 'exp' in payload:
            if payload['exp'] < time.time():
                raise Exception("Token expirado")
        
        # Extraer datos del usuario (soporta formato ARBA y mock)
        user_data = {
            "cuit": payload.get("identifier") or payload.get("cuit") or payload.get("login"),
            "nombre": payload.get("fullname") or payload.get("name", "Usuario"),
            "email": payload.get("email", ""),
            "roles": payload.get("realm_access", {}).get("roles", []),
            "permissions": payload.get("permissions", []),
            "type": payload.get("type", "EXTERNO")
        }
        
        if not user_data["cuit"]:
            raise Exception("Token no contiene CUIT")
        
        return user_data
        
    except json.JSONDecodeError:
        raise Exception("Token JWT malformado")
    except Exception as e:
        raise Exception(f"Error validando token: {str(e)}")


# Para producción con Keycloak real, usar esta función:
def validate_keycloak_token(token: str, keycloak_url: str, realm: str) -> Dict[str, Any]:
    """
    Valida token contra Keycloak real
    TODO: Implementar cuando tengas Keycloak
    """
    import requests
    
    # Verificar token con Keycloak
    introspect_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token/introspect"
    
    response = requests.post(
        introspect_url,
        data={
            'token': token,
            'client_id': 'admin-cli'  # Configurar según tu setup
        }
    )
    
    if not response.ok:
        raise Exception("Error validando token con Keycloak")
    
    token_info = response.json()
    
    if not token_info.get('active'):
        raise Exception("Token inactivo o inválido")
    
    return {
        "cuit": token_info.get("cuit"),
        "nombre": token_info.get("name"),
        "email": token_info.get("email"),
        "roles": token_info.get("realm_access", {}).get("roles", [])
    }
