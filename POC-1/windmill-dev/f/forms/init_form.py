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
    # El workflow necesita un token JWT, generamos uno mock con los datos del usuario
    import base64
    
    def base64url_encode(data):
        """Codifica en base64url (formato JWT)"""
        if isinstance(data, str):
            data = data.encode('utf-8')
        encoded = base64.urlsafe_b64encode(data).decode('utf-8')
        # Remover padding '=' para formato JWT estándar
        return encoded.rstrip('=')
    
    mock_token_payload = {
        "identifier": cuit,
        "cuit": cuit,
        "fullname": user.get("nombre", ""),
        "permissions": user.get("permissions", []),
        "login": cuit
    }
    # Crear un token JWT mock en formato base64url correcto
    header = base64url_encode('{"alg":"HS256","typ":"JWT"}')
    payload = base64url_encode(json.dumps(mock_token_payload))
    signature = base64url_encode('mock-signature')
    mock_token = f"{header}.{payload}.{signature}"
    
    try:
        print(f"[DEBUG] Ejecutando workflow f/ddjj/init_ddjj con token para CUIT: {cuit}")
        print(f"[DEBUG] Token generado: {mock_token[:50]}...")
        
        # Ejecutar workflow de forma asíncrona
        job_id = wmill.run_flow_async(
            "f/ddjj/init_ddjj",
            args={
                "token": mock_token
            }
        )
        
        print(f"[DEBUG] Job iniciado con ID: {job_id}")
        
        # Esperar a que el job complete usando polling
        import time
        max_wait_time = 60
        poll_interval = 1
        elapsed_time = 0
        
        while elapsed_time < max_wait_time:
            job_status = wmill.get_job(job_id)
            job_type = job_status.get("type")
            
            print(f"[DEBUG] Estado del job: {job_type}, tiempo transcurrido: {elapsed_time}s")
            
            if job_type == "CompletedJob":
                # Job completado exitosamente
                workflow_result = job_status.get("result", {})
                print(f"[DEBUG] Workflow ejecutado exitosamente. Resultado: {workflow_result}")
                break
            elif job_type == "QueuedJob" or job_type == "RunningJob":
                # Job aún en ejecución, esperar
                time.sleep(poll_interval)
                elapsed_time += poll_interval
            else:
                # Job falló o estado desconocido
                raise Exception(f"Job falló o tiene estado desconocido: {job_type}")
        else:
            raise Exception(f"Timeout esperando a que el job complete después de {max_wait_time}s")
        
        # El workflow devuelve los datos sin crear submission en Form.io
        # La submission se creará solo cuando el usuario haga submit
        formio_url = os.getenv("FORMIO_URL", "http://localhost:3010")
        form_name = "iibbSimple"
        
        periodos_adeudados = workflow_result.get("periodosAdeudados", [])
        print(f"[DEBUG] Datos obtenidos del workflow: {workflow_result}")
        
        return {
            "formUrl": f"{formio_url}/{form_name}",
            "submissionId": None,  # No hay submission inicial
            "prefillData": {
                "cuit": workflow_result.get("cuit", cuit),
                "razonSocial": user.get("nombre", ""),
                "actividad": workflow_result.get("actividad", ""),
                "periodoAdeclarar": periodos_adeudados[0] if periodos_adeudados else None,
                "periodosAdeudados": workflow_result.get("periodosAdeudados", []),
                "montoAnterior": workflow_result.get("montoAnterior")
            },
            "dynamicOptions": {
                "periodoAdeclarar": [
                    {"label": periodo, "value": periodo}
                    for periodo in periodos_adeudados
                ]
            }
        }
    except Exception as e:
        print(f"[ERROR] Error ejecutando workflow DDJJ: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback completo:\n{traceback.format_exc()}")
        
        # Fallback: devolver datos mínimos sin submission
        formio_url = os.getenv("FORMIO_URL", "http://localhost:3010")
        form_name = "iibbSimple"
        return {
            "formUrl": f"{formio_url}/{form_name}",
            "submissionId": None,
            "prefillData": {
                "cuit": cuit,
                "razonSocial": user.get("nombre", ""),
                "periodo": periodo
            }
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