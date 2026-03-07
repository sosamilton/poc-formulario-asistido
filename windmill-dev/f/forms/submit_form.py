"""
Procesa el submit de un formulario
"""

import wmill
from f.auth.validate_token import main as validate_token
from f.config.get_user_config import can_access_form
from typing import Dict, Any


def main(
    form_id: str,
    submission_id: str,
    data: Dict[str, Any],
    token: str
) -> Dict[str, Any]:
    """
    Procesa el submit de un formulario
    
    Args:
        form_id: ID del formulario
        submission_id: ID de la submission (puede ser None)
        data: Datos del formulario
        token: JWT del usuario
    
    Returns:
        Dict con success, message y opcionalmente redirectUrl
    """
    # 1. Validar token
    user = validate_token(token)
    
    # 2. Verificar permisos
    if not can_access_form(user, form_id):
        raise Exception(f"Usuario no autorizado para enviar el formulario {form_id}")
    
    # 3. Validaciones de negocio
    validation_result = validate_form_data(form_id, data, user)
    if not validation_result["valid"]:
        return {
            "success": False,
            "errors": validation_result["errors"],
            "message": "Errores de validación"
        }
    
    # 4. Procesar según el tipo de formulario
    if form_id == "ddjj-mensual":
        return process_ddjj_mensual(data, user)
    elif form_id == "consulta-deuda":
        return process_consulta_deuda(data, user)
    elif form_id == "requerimiento-fiscal":
        return process_requerimiento_fiscal(data, user)
    else:
        return process_generic_form(form_id, data, user)


def validate_form_data(form_id: str, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validaciones de negocio
    """
    errors = []
    
    if form_id == "ddjj-mensual":
        # Validar que el CUIT coincida
        if data.get("cuit") != user["cuit"]:
            errors.append({
                "path": "cuit",
                "message": "No puede declarar por otro contribuyente"
            })
        
        # Validar monto mínimo
        monto = data.get("montoDeclarado", 0)
        if monto < 0:
            errors.append({
                "path": "montoDeclarado",
                "message": "El monto no puede ser negativo"
            })
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def process_ddjj_mensual(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Procesa una DDJJ mensual
    """
    # Aquí integrarías con tus scripts existentes de DDJJ
    # Por ahora, simulamos el procesamiento
    
    print(f"Procesando DDJJ para {user['cuit']}")
    print(f"Período: {data.get('periodo')}")
    print(f"Monto: {data.get('montoDeclarado')}")
    
    # Simular guardado
    expediente_id = "EXP-2026-001234"
    
    return {
        "success": True,
        "message": "Declaración jurada enviada correctamente",
        "data": {
            "expedienteId": expediente_id,
            "fecha": "2026-03-06",
            "estado": "Presentada"
        },
        "redirectUrl": f"/success?expediente={expediente_id}"
    }


def process_consulta_deuda(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Procesa una consulta de deuda
    """
    # Simular consulta
    deuda_total = 45000.00
    
    return {
        "success": True,
        "message": "Consulta realizada",
        "data": {
            "deudaTotal": deuda_total,
            "periodos": [
                {"periodo": "2026-01", "monto": 15000},
                {"periodo": "2026-02", "monto": 15000},
                {"periodo": "2026-03", "monto": 15000}
            ]
        }
    }


def process_requerimiento_fiscal(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Procesa un requerimiento fiscal
    """
    # Generar número de requerimiento
    req_number = "REQ-2026-5678"
    
    return {
        "success": True,
        "message": "Requerimiento generado correctamente",
        "data": {
            "numeroRequerimiento": req_number,
            "cuitContribuyente": data.get("cuitContribuyente"),
            "tipo": data.get("tipoRequerimiento"),
            "estado": "Pendiente"
        },
        "redirectUrl": f"/requerimientos/{req_number}"
    }


def process_generic_form(form_id: str, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Procesamiento genérico
    """
    return {
        "success": True,
        "message": "Formulario enviado correctamente",
        "data": data
    }
