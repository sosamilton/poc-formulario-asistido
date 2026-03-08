"""
Inicializa un formulario con datos precargados
"""

import wmill
from f.auth.validate_token import main as validate_token
from f.config.get_user_config import can_access_form
from typing import Dict, Any


def main(
    form_id: str,
    token: str,
    params: Dict[str, Any] = {}
) -> Dict[str, Any]:
    """
    Inicializa un formulario
    
    Args:
        form_id: ID del formulario
        token: JWT del usuario
        params: Parámetros adicionales de la ruta
    
    Returns:
        Dict con submissionId, prefillData y formSchema
    """
    # 1. Validar el token JWT y extraer datos del usuario
    user = validate_token(token)
    
    # 2. Verificar que el usuario tenga permisos para acceder al formulario solicitado
    if not can_access_form(user, form_id):
        raise Exception(f"Usuario no autorizado para acceder al formulario {form_id}")
    
    # 3. Ejecutar lógica de inicialización específica según el tipo de formulario
    if form_id == "ddjj-mensual":
        return init_ddjj_mensual(user, params)
    elif form_id == "consulta-deuda":
        return init_consulta_deuda(user, params)
    elif form_id == "requerimiento-fiscal":
        return init_requerimiento_fiscal(user, params)
    else:
        # Formulario genérico
        return init_generic_form(form_id, user, params)


def init_ddjj_mensual(user: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inicializa formulario de DDJJ mensual ejecutando el workflow de precarga
    y devolviendo URL de Form.io
    """
    import os
    import urllib.request
    import json
    
    periodo = params.get("periodo", "2026-03")
    cuit = user["cuit"]
    
    # 1. Ejecutar workflow de DDJJ para obtener datos precargados desde APIs externas
    try:
        workflow_result = wmill.run_flow_sync(
            "f/ddjj/init_ddjj",
            args={
                "cuit": cuit,
                "periodo": periodo
            }
        )
        prefill_data = workflow_result.get("data", {})
    except Exception as e:
        print(f"Error ejecutando workflow DDJJ: {e}")
        # Fallback: usar datos mínimos si falla la consulta a APIs externas
        prefill_data = {
            "cuit": cuit,
            "razonSocial": user.get("nombre", ""),
            "periodo": periodo
        }
    
    # 2. Crear una nueva submission en Form.io con los datos precargados
    formio_url = os.getenv("FORMIO_URL", "https://formio.mdsoluciones.ar")
    form_name = "iibbSimple"  # Nombre del formulario configurado en Form.io
    
    try:
        # Enviar datos precargados a Form.io para crear un borrador de submission
        url = f"{formio_url}/{form_name}/submission"
        data = json.dumps({"data": prefill_data}).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req) as response:
            submission = json.loads(response.read().decode('utf-8'))
            submission_id = submission.get("_id")
    except Exception as e:
        print(f"Error conectando con Form.io: {e}")
        submission_id = None
    
    # 3. Retornar URL del formulario y datos para que el frontend lo renderice
    return {
        "formUrl": f"{formio_url}/{form_name}",
        "submissionId": submission_id,
        "prefillData": prefill_data
    }


def init_consulta_deuda(user: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inicializa formulario de consulta de deuda
    """
    prefill_data = {
        "cuit": user["cuit"],
        "razonSocial": user["nombre"]
    }
    
    form_schema = {
        "components": [
            {
                "type": "textfield",
                "key": "cuit",
                "label": "CUIT",
                "disabled": True
            },
            {
                "type": "select",
                "key": "tipoConsulta",
                "label": "Tipo de Consulta",
                "data": {
                    "values": [
                        {"label": "Deuda Total", "value": "total"},
                        {"label": "Por Período", "value": "periodo"},
                        {"label": "Histórico", "value": "historico"}
                    ]
                }
            },
            {
                "type": "button",
                "action": "submit",
                "label": "Consultar",
                "theme": "primary"
            }
        ]
    }
    
    return {
        "submissionId": None,
        "prefillData": prefill_data,
        "formSchema": form_schema
    }


def init_requerimiento_fiscal(user: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inicializa formulario de requerimiento fiscal (solo agentes)
    """
    prefill_data = {
        "agente": user["nombre"],
        "fecha": "2026-03-06"
    }
    
    form_schema = {
        "components": [
            {
                "type": "textfield",
                "key": "cuitContribuyente",
                "label": "CUIT del Contribuyente",
                "required": True
            },
            {
                "type": "select",
                "key": "tipoRequerimiento",
                "label": "Tipo de Requerimiento",
                "data": {
                    "values": [
                        {"label": "Documentación", "value": "doc"},
                        {"label": "Inspección", "value": "inspeccion"},
                        {"label": "Intimación", "value": "intimacion"}
                    ]
                }
            },
            {
                "type": "textarea",
                "key": "detalle",
                "label": "Detalle del Requerimiento",
                "required": True
            },
            {
                "type": "button",
                "action": "submit",
                "label": "Generar Requerimiento",
                "theme": "danger"
            }
        ]
    }
    
    return {
        "submissionId": None,
        "prefillData": prefill_data,
        "formSchema": form_schema
    }


def init_generic_form(form_id: str, user: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inicialización genérica para formularios sin lógica específica
    """
    return {
        "submissionId": None,
        "prefillData": {},
        "formSchema": {
            "components": [
                {
                    "type": "textfield",
                    "key": "campo1",
                    "label": "Campo de ejemplo"
                },
                {
                    "type": "button",
                    "action": "submit",
                    "label": "Enviar"
                }
            ]
        }
    }
