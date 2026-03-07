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
    # 1. Validar token y obtener usuario
    user = validate_token(token)
    
    # 2. Obtener todos los formularios disponibles
    all_forms = get_all_forms()
    
    # 3. Filtrar por permisos
    authorized_routes = []
    for form in all_forms:
        if can_access_form(user, form["formId"]):
            authorized_routes.append(form)
    
    # 4. Retornar configuración
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
            "formId": "ddjj-mensual",
            "metadata": {
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
            "formId": "consulta-deuda",
            "metadata": {
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
            "formId": "requerimiento-fiscal",
            "metadata": {
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
    # Buscar el formulario
    all_forms = get_all_forms()
    form = next((f for f in all_forms if f["formId"] == form_id), None)
    
    if not form:
        return False
    
    # Verificar roles
    required_roles = form["metadata"].get("requiredRoles", [])
    user_roles = user.get("roles", [])
    
    # Si no hay roles requeridos, todos pueden acceder
    if not required_roles:
        return True
    
    # Verificar si tiene alguno de los roles requeridos
    return any(role in user_roles for role in required_roles)
