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
    # 1. Validar token
    user = validate_token(token)
    
    # 2. Verificar permisos
    if not can_access_form(user, form_id):
        raise Exception(f"Usuario no autorizado para acceder al formulario {form_id}")
    
    # 3. Ejecutar lógica específica del formulario
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
    Inicializa formulario de DDJJ mensual con datos precargados
    Integrado con scripts existentes de f/ddjj/
    """
    periodo = params.get("periodo", "2026-03")
    cuit = user["cuit"]
    
    # Llamar a scripts existentes para obtener datos reales
    try:
        # 1. Obtener datos del padrón
        padron = wmill.run_script_sync(
            "f/ddjj/fetch_padron",
            args={"codigoActividad": cuit}
        )
        
        # 2. Obtener alícuota
        alicuota_data = wmill.run_script_sync(
            "f/ddjj/fetch_alicuota",
            args={"codigoActividad": padron.get("codigoActividad", "620")}
        )
        
        # 3. Obtener historial
        historial = wmill.run_script_sync(
            "f/ddjj/fetch_historial",
            args={"cuit": cuit}
        )
        
        # 4. Obtener períodos adeudados
        periodos = wmill.run_script_sync(
            "f/ddjj/fetch_periodos_adeudados",
            args={"cuit": cuit}
        )
        
        # 5. Calcular monto mínimo
        monto_minimo = wmill.run_script_sync(
            "f/ddjj/calcular_periodo_minimo",
            args={
                "regimen": padron.get("regimen", "CM"),
                "alicuota": alicuota_data.get("alicuota", 3.5)
            }
        )
        
        prefill_data = {
            "cuit": cuit,
            "razonSocial": padron.get("razonSocial", user["nombre"]),
            "periodo": periodo,
            "actividad": padron.get("actividad", ""),
            "codigoActividad": padron.get("codigoActividad", ""),
            "regimen": padron.get("regimen", "CM"),
            "alicuota": alicuota_data.get("alicuota", 3.5),
            "montoAnterior": historial.get("montoAnterior", 0),
            "montoMinimo": monto_minimo,
            "periodosAdeudados": periodos.get("periodosAdeudados", [])
        }
        
    except Exception as e:
        # Fallback a datos de ejemplo si falla
        print(f"Error obteniendo datos reales: {e}")
        prefill_data = {
            "cuit": cuit,
            "razonSocial": user["nombre"],
            "periodo": periodo,
            "actividad": "Servicios profesionales",
            "alicuota": 3.5,
            "montoAnterior": 15000.00
        }
    
    # Schema del formulario (simplificado)
    form_schema = {
        "components": [
            {
                "type": "textfield",
                "key": "cuit",
                "label": "CUIT",
                "disabled": True
            },
            {
                "type": "textfield",
                "key": "razonSocial",
                "label": "Razón Social",
                "disabled": True
            },
            {
                "type": "textfield",
                "key": "periodo",
                "label": "Período",
                "disabled": True
            },
            {
                "type": "number",
                "key": "ingresosBrutos",
                "label": "Ingresos Brutos",
                "required": True,
                "validate": {
                    "min": 0
                }
            },
            {
                "type": "number",
                "key": "montoDeclarado",
                "label": "Monto a Declarar",
                "required": True,
                "validate": {
                    "min": 0
                }
            },
            {
                "type": "textarea",
                "key": "observaciones",
                "label": "Observaciones"
            },
            {
                "type": "button",
                "action": "submit",
                "label": "Enviar Declaración",
                "theme": "primary"
            }
        ]
    }
    
    return {
        "submissionId": None,  # Por ahora sin draft
        "prefillData": prefill_data,
        "formSchema": form_schema
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
