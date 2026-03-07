"""
Obtiene la configuración de la aplicación filtrada por permisos del usuario
"""

import wmill
from f.auth.validate_token import main as validate_token
from typing import Dict, Any, List


def main(token: str) -> Dict[str, Any]:
    """
    Retorna la configuración de la app con solo los formularios autorizados
    
    Args:
        token: JWT del usuario
    
    Returns:
        Configuración filtrada por permisos
    """
    # 1. Validar el token JWT y extraer información del usuario
    user = validate_token(token)
    
    # 2. Obtener catálogo completo de formularios disponibles en el sistema
    all_forms = get_all_forms()
    
    # 3. Filtrar formularios según los permisos y roles del usuario
    authorized_routes = []
    for form in all_forms:
        if can_access_form(user, form["metadata"]["formId"]):
            authorized_routes.append(form)
    
    # 4. Retornar configuración personalizada con formularios autorizados
    return {
        "user": {
            "cuit": user["cuit"],
            "nombre": user["nombre"],
            "roles": user["roles"]
        },
        "branding": {
            "title": "Sistema de Formularios IIBB",
            "logo": "/assets/logo.png",
            "theme": "rentas-ba"
        },
        "routes": authorized_routes
    }


def get_all_forms() -> List[Dict[str, Any]]:
    """
    Define todos los formularios disponibles en el sistema
    """
    return [
        {
            "path": "/ddjj/:periodo",
            "metadata": {
                "formId": "ddjj-mensual",
                "title": "Declaración Jurada Mensual",
                "description": "Complete su declaración jurada del período",
                "lifecycle": {
                    "init": "f/forms/init_form",
                    "submit": "f/forms/submit_form"
                },
                "requiredRoles": ["contribuyente", "contador"]
            }
        },
        {
            "path": "/consulta-deuda",
            "metadata": {
                "formId": "consulta-deuda",
                "title": "Consulta de Deuda",
                "description": "Consulte su estado de deuda",
                "lifecycle": {
                    "init": "f/forms/init_form",
                    "submit": "f/forms/submit_form"
                },
                "requiredRoles": ["contribuyente", "contador"]
            }
        },
        {
            "path": "/fiscalizacion/requerimiento",
            "metadata": {
                "formId": "requerimiento-fiscal",
                "title": "Requerimiento Fiscal",
                "description": "Generar requerimiento de fiscalización",
                "lifecycle": {
                    "init": "f/forms/init_form",
                    "submit": "f/forms/submit_form"
                },
                "requiredRoles": ["agente-fiscalizacion", "admin"]
            }
        }
    ]


def can_access_form(user: Dict[str, Any], form_id: str) -> bool:
    """
    Verifica si el usuario puede acceder a un formulario
    """
    # Buscar el formulario en el catálogo por su ID
    all_forms = get_all_forms()
    form = next((f for f in all_forms if f["metadata"]["formId"] == form_id), None)
    
    if not form:
        return False
    
    # Obtener roles requeridos para acceder al formulario
    required_roles = form["metadata"].get("requiredRoles", [])
    user_roles = user.get("roles", [])
    
    # Si el formulario no requiere roles específicos, permitir acceso a todos
    if not required_roles:
        return True
    
    # Verificar si el usuario posee al menos uno de los roles requeridos
    return any(role in user_roles for role in required_roles)
