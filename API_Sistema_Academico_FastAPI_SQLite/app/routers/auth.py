from fastapi import APIRouter, HTTPException
from app.database import conexion_lectura, hash_clave
from app.schemas import UsuarioLogin, UsuarioRespuesta

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=UsuarioRespuesta)
def iniciar_sesion(datos: UsuarioLogin):
    with conexion_lectura() as conexion:
        fila = conexion.execute(
            "SELECT * FROM usuarios WHERE usuario = ?", (datos.usuario,)
        ).fetchone()

    if fila is None or fila["clave_hash"] != hash_clave(datos.clave):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    if not fila["activo"]:
        raise HTTPException(status_code=403, detail="Este usuario está inactivo")

    return {
        "id": fila["id"],
        "usuario": fila["usuario"],
        "nombre_completo": fila["nombre_completo"],
        "rol": fila["rol"],
        "estudiante_id": fila["estudiante_id"]
    }