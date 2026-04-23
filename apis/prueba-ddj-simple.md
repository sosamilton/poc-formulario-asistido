curl http://localhost:3002/api/v1/contribuyente/me
curl "http://localhost:3002/api/v1/contribuyente/me/elegibilidad-ddjj-simple"
curl "http://localhost:3002/api/v1/contribuyente/me/elegibilidad-ddjj-simple?scenario=no-elegible-multiactividad"
curl "http://localhost:3002/api/v1/contribuyente/me/elegibilidad-ddjj-simple?scenario=elegible-con-alerta"

curl -X POST http://localhost:3002/api/v1/ddjj-simple/preview \
  -H "Content-Type: application/json" \
  -d '{"periodo":"2026-02","montoImponible":168817}'

curl -X POST http://localhost:3002/api/v1/ddjj-simple/confirmar \
  -H "Content-Type: application/json" \
  -d '{"periodo":"2026-02","montoImponible":168817,"idempotencyKey":"abc-123"}'

# Escenario DDJJ ya existente
curl -X POST http://localhost:3002/api/v1/ddjj-simple/confirmar \
  -H "Content-Type: application/json" \
  -d '{"periodo":"2025-12","montoImponible":100000}'

# Escenario host caido
curl -X POST http://localhost:3002/api/v1/ddjj-simple/confirmar \
  -H "Content-Type: application/json" \
  -d '{"periodo":"1999-01","montoImponible":100000}'