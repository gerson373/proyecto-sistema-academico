const URL_BASE_API = "/api/v1";

const vistaLogin = document.getElementById("vista-login");
const vistaDashboard = document.getElementById("vista-dashboard");
const formularioLogin = document.getElementById("formulario-login");
const campoUsuario = document.getElementById("campo-usuario");
const campoClave = document.getElementById("campo-clave");
const botonEntrar = document.getElementById("boton-entrar");
const mensajeLogin = document.getElementById("mensaje-login");
const tituloBienvenida = document.getElementById("titulo-bienvenida");
const chipUsuario = document.getElementById("chip-usuario");
const botonActualizar = document.getElementById("boton-actualizar");
const botonSalir = document.getElementById("boton-salir");
const menuLateral = document.getElementById("menu-lateral");

let usuarioActual = null;
let moduloActual = "dashboard";

const cache = {
  carreras: [], docentes: [], asignaturas: [], periodos: [],
  aulas: [], secciones: [], estudiantes: [], matriculas: [],
};

async function api(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_BASE_API}${ruta}`, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });
  if (!respuesta.ok) {
    let detalle = null;
    try { detalle = await respuesta.json(); } catch (_) {}
    const error = new Error(detalle?.detail || `Error HTTP ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }
  if (respuesta.status === 204) return null;
  return respuesta.json();
}

formularioLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensajeLogin.textContent = "";
  botonEntrar.disabled = true;
  botonEntrar.textContent = "Entrando...";
  try {
    usuarioActual = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        usuario: campoUsuario.value.trim(),
        clave: campoClave.value,
      }),
    });
    mostrarDashboard();
  } catch (error) {
    mensajeLogin.textContent = error.status === 401
      ? "Usuario o contraseña incorrectos." : "No se pudo iniciar sesión.";
  } finally {
    botonEntrar.disabled = false;
    botonEntrar.textContent = "Iniciar sesión";
  }
});

botonSalir.addEventListener("click", () => {
  usuarioActual = null;
  formularioLogin.reset();
  vistaDashboard.classList.add("oculto");
  vistaLogin.classList.remove("oculto");
});

function mostrarDashboard() {
  vistaLogin.classList.add("oculto");
  vistaDashboard.classList.remove("oculto");
  tituloBienvenida.textContent = `Hola, ${usuarioActual.nombre_completo}`;
  chipUsuario.textContent = `Rol: ${usuarioActual.rol}`;
  
  const esEstudiante = usuarioActual.rol === "ESTUDIANTE";
  
  const btnMiPortal = document.querySelector('.menu-item[data-modulo="mi-portal"]');
  if (btnMiPortal) {
    btnMiPortal.style.display = esEstudiante ? "block" : "none";
  }

  document.querySelectorAll(".menu-item").forEach(btn => {
    if (btn.dataset.modulo !== "dashboard" && btn.dataset.modulo !== "mi-portal") {
      btn.style.display = esEstudiante ? "none" : "block";
    }
  });
  
  irAModulo(esEstudiante ? "mi-portal" : "dashboard");
  cargarCatalogos();
}

menuLateral.addEventListener("click", (e) => {
  const boton = e.target.closest(".menu-item");
  if (!boton) return;
  irAModulo(boton.dataset.modulo);
});

function irAModulo(nombre) {
  moduloActual = nombre;
  document.querySelectorAll(".menu-item").forEach((b) =>
    b.classList.toggle("activo", b.dataset.modulo === nombre));
  document.querySelectorAll(".modulo").forEach((m) =>
    m.classList.toggle("activo", m.id === `modulo-${nombre}`));
  cargarModulo(nombre);
}

function cargarModulo(nombre) {
  const acciones = {
    dashboard: cargarDashboard,
    estudiantes: cargarEstudiantes,
    carreras: cargarCarreras,
    docentes: cargarDocentes,
    asignaturas: cargarAsignaturas,
    periodos: cargarPeriodos,
    aulas: cargarAulas,
    secciones: cargarSecciones,
    matriculas: cargarMatriculas,
    calificaciones: cargarCalificaciones,
    reportes: cargarReportes,
    "mi-portal": cargarPortalEstudiante,
  };
  if (acciones[nombre]) acciones[nombre]();
}

botonActualizar.addEventListener("click", () => cargarModulo(moduloActual));

// ========== DASHBOARD ==========
const TARJETAS_KPI = [
  { clave: "estudiantes_activos", etiqueta: "Estudiantes activos" },
  { clave: "docentes_activos", etiqueta: "Docentes activos" },
  { clave: "carreras_activas", etiqueta: "Carreras activas" },
  { clave: "asignaturas_activas", etiqueta: "Asignaturas activas" },
  { clave: "secciones_abiertas", etiqueta: "Secciones abiertas" },
  { clave: "matriculas_activas", etiqueta: "Matrículas activas" },
];

async function cargarDashboard() {
  const filaTarjetas = document.getElementById("fila-tarjetas");
  const textoPeriodo = document.getElementById("texto-periodo");
  filaTarjetas.innerHTML = "";
  TARJETAS_KPI.forEach(({ clave, etiqueta }) => {
    const t = document.createElement("article");
    t.className = "tarjeta-kpi";
    t.innerHTML = `<div class="valor" data-kpi="${clave}">—</div>
                   <div class="etiqueta-kpi">${etiqueta}</div>`;
    filaTarjetas.appendChild(t);
  });
  try {
    const resumen = await api("/reportes/dashboard");
    TARJETAS_KPI.forEach(({ clave }) => {
      const nodo = filaTarjetas.querySelector(`[data-kpi="${clave}"]`);
      if (nodo) nodo.textContent = resumen[clave] ?? "—";
    });
    textoPeriodo.textContent = resumen.periodo_activo
      ? `Período académico activo: ${resumen.periodo_activo}`
      : "No hay un período académico activo.";
  } catch {
    textoPeriodo.textContent = "No se pudieron cargar los indicadores.";
  }
}

async function cargarCatalogos() {
  try {
    const [carreras, docentes, asignaturas, periodos, aulas, estudiantes, secciones, matriculas] =
      await Promise.all([
        api("/carreras?solo_activas=true").catch(() => []),
        api("/docentes").catch(() => []),
        api("/asignaturas").catch(() => []),
        api("/periodos").catch(() => []),
        api("/aulas").catch(() => []),
        api("/estudiantes").catch(() => []),
        api("/secciones").catch(() => []),
        api("/matriculas").catch(() => []),
      ]);
    Object.assign(cache, { carreras, docentes, asignaturas, periodos, aulas, estudiantes, secciones, matriculas });
  } catch (e) { console.warn("Catálogos", e); }
}

function llenarSelect(select, items, valorFn, textoFn, placeholder) {
  if (!select) return;
  select.innerHTML = placeholder ? `<option value="">${placeholder}</option>` : "";
  items.forEach((item) => {
    const op = document.createElement("option");
    op.value = valorFn(item);
    op.textContent = textoFn(item);
    select.appendChild(op);
  });
}

// ========== ESTUDIANTES ==========
const cuerpoTablaEstudiantes = document.getElementById("cuerpo-tabla-estudiantes");
const textoSinResultados = document.getElementById("texto-sin-resultados");
const campoBuscar = document.getElementById("campo-buscar");
const formularioEstudiante = document.getElementById("formulario-estudiante");
const mensajeFormulario = document.getElementById("mensaje-formulario");
const campoEstudianteId = document.getElementById("estudiante-id");
let temporizadorBusqueda = null;

async function cargarEstudiantes(buscar = "") {
  try {
    const p = buscar ? `?buscar=${encodeURIComponent(buscar)}` : "";
    const lista = await api(`/estudiantes${p}`);
    renderizarTablaEstudiantes(lista);
    if (!cache.carreras.length) {
      cache.carreras = await api("/carreras?solo_activas=true").catch(() => []);
    }
    llenarSelect(document.getElementById("estudiante-carrera"),
      cache.carreras, (c) => c.id, (c) => `${c.codigo} — ${c.nombre}`, "Seleccione una carrera");
  } catch {
    cuerpoTablaEstudiantes.innerHTML = "";
    textoSinResultados.textContent = "No se pudo cargar la lista.";
    textoSinResultados.classList.remove("oculto");
  }
}

function renderizarTablaEstudiantes(lista) {
  cuerpoTablaEstudiantes.innerHTML = "";
  if (!lista.length) {
    textoSinResultados.textContent = "No se encontraron estudiantes.";
    textoSinResultados.classList.remove("oculto");
    return;
  }
  textoSinResultados.classList.add("oculto");
  
  lista.forEach((e) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${e.cuenta}</td>
      <td>${e.nombres} ${e.apellidos}</td>
      <td>${e.correo}</td>
      <td>${e.carrera_nombre ?? ""}</td>
      <td>${pastillaEstado(e.estado)}</td>
      <td class="acciones-fila">
        <button class="boton-icono" style="background-color:#2563eb; color:white; border:none;" data-a="detalle">Ver Materias</button>
        <button class="boton-icono" data-a="editar">Editar</button>
        <button class="boton-icono peligro" data-a="eliminar">Eliminar</button>
      </td>`;
      
    fila.querySelector('[data-a="detalle"]').onclick = () => mostrarDetalleEstudiante(e);
    fila.querySelector('[data-a="editar"]').onclick = () => editarEstudiante(e);
    fila.querySelector('[data-a="eliminar"]').onclick = () => eliminarEstudiante(e);
    cuerpoTablaEstudiantes.appendChild(fila);
  });
}

async function mostrarDetalleEstudiante(estudiante) {
  irAModulo("reportes"); 
  const salida = document.getElementById("salida-reporte");
  salida.innerHTML = "<p>Cargando materias del estudiante...</p>";

  try {
    const data = await api(`/reportes/historial-estudiante/${estudiante.id}`);
    let html = `
      <div class="tarjeta-reporte">
        <h2>Materias de ${estudiante.nombres} ${estudiante.apellidos}</h2>
        <p><strong>Carrera:</strong> ${estudiante.carrera_nombre}</p>
      </div>
    `;

    if (data.historial && data.historial.length > 0) {
      html += `
        <table class="tabla-datos">
          <thead><tr><th>Asignatura</th><th>Docente (Profesor)</th><th>Sección</th><th>Horario</th><th>Estado</th></tr></thead>
          <tbody>
      `;
      
      data.historial.forEach(materia => {
        html += `
          <tr>
            <td>${materia.asignatura || materia.nombre_asignatura || '-'}</td>
            <td>${materia.docente || materia.nombre_docente || '-'}</td>
            <td>${materia.seccion || '-'}</td>
            <td>${materia.horario || materia.dias_horario || '-'}</td>
            <td>${pastillaEstado(materia.estado || 'PENDIENTE')}</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    } else {
      html += `<p class="texto-vacio">Este estudiante no tiene materias matriculadas.</p>`;
    }
    salida.innerHTML = html;
  } catch (error) {
    salida.innerHTML = `<p class="mensaje-error">Error al cargar materias: ${error.message}</p>`;
  }
}

formularioEstudiante.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  mensajeFormulario.textContent = "";
  const id = campoEstudianteId.value;
  const datos = {
    nombres: document.getElementById("estudiante-nombres").value.trim(),
    apellidos: document.getElementById("estudiante-apellidos").value.trim(),
    cuenta: document.getElementById("estudiante-cuenta").value.trim(),
    correo: document.getElementById("estudiante-correo").value.trim(),
    telefono: document.getElementById("estudiante-telefono").value.trim() || null,
    fecha_nacimiento: document.getElementById("estudiante-nacimiento").value,
    carrera_id: Number(document.getElementById("estudiante-carrera").value),
    estado: document.getElementById("estudiante-estado").value,
  };
  try {
    await api(`/estudiantes${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST", body: JSON.stringify(datos),
    });
    mensajeFormulario.textContent = id ? "Actualizado." : "Creado.";
    mensajeFormulario.className = "mensaje-exito";
    cancelarEdicionEstudiante();
    cargarEstudiantes();
    cargarDashboard();
  } catch (e) {
    mensajeFormulario.textContent = e.message;
    mensajeFormulario.className = "mensaje-error";
  }
});

function editarEstudiante(e) {
  campoEstudianteId.value = e.id;
  document.getElementById("estudiante-nombres").value = e.nombres;
  document.getElementById("estudiante-apellidos").value = e.apellidos;
  document.getElementById("estudiante-cuenta").value = e.cuenta;
  document.getElementById("estudiante-correo").value = e.correo;
  document.getElementById("estudiante-telefono").value = e.telefono ?? "";
  document.getElementById("estudiante-nacimiento").value = e.fecha_nacimiento;
  document.getElementById("estudiante-carrera").value = e.carrera_id;
  document.getElementById("estudiante-estado").value = e.estado;
  document.getElementById("titulo-formulario").textContent = `Editar — ${e.nombres} ${e.apellidos}`;
  document.getElementById("boton-cancelar-edicion").classList.remove("oculto");
}

function cancelarEdicionEstudiante() {
  formularioEstudiante.reset();
  campoEstudianteId.value = "";
  document.getElementById("titulo-formulario").textContent = "Nuevo estudiante";
  document.getElementById("boton-cancelar-edicion").classList.add("oculto");
}
document.getElementById("boton-cancelar-edicion").addEventListener("click", cancelarEdicionEstudiante);

async function eliminarEstudiante(e) {
  if (!confirm(`¿Eliminar a ${e.nombres} ${e.apellidos}?`)) return;
  try {
    await api(`/estudiantes/${e.id}`, { method: "DELETE" });
    cargarEstudiantes();
    cargarDashboard();
  } catch (err) { alert(err.message); }
}

campoBuscar.addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => cargarEstudiantes(campoBuscar.value.trim()), 300);
});

function pastillaEstado(estado) {
  if (estado === "ACTIVO" || estado === "APROBADA" || estado === "MATRICULADA")
    return `<span class="pastilla-estado pastilla-activo">${estado}</span>`;
  return `<span class="pastilla-estado pastilla-neutral">${estado}</span>`;
}

// ========== CARRERAS ==========
async function cargarCarreras() {
  try {
    const lista = await api("/carreras");
    cache.carreras = lista;
    const tbody = document.getElementById("cuerpo-tabla-carreras");
    tbody.innerHTML = "";
    lista.forEach((c) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${c.id}</td><td>${c.codigo}</td><td>${c.nombre}</td>
        <td>${c.duracion_anios}</td><td>${c.activo ? "Sí" : "No"}</td>
        <td class="acciones-fila">
          <button class="boton-icono" data-a="editar">Editar</button>
          <button class="boton-icono peligro" data-a="eliminar">Eliminar</button>
        </td>`;
      fila.querySelector('[data-a="editar"]').onclick = () => editarCarrera(c);
      fila.querySelector('[data-a="eliminar"]').onclick = () => eliminarGenerico("carreras", c.id, cargarCarreras);
      tbody.appendChild(fila);
    });
  } catch (e) { console.error(e); }
}

document.getElementById("form-carrera").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("carrera-id").value;
  const datos = {
    codigo: document.getElementById("carrera-codigo").value.trim(),
    nombre: document.getElementById("carrera-nombre").value.trim(),
    duracion_anios: Number(document.getElementById("carrera-duracion").value),
    activo: document.getElementById("carrera-activo").value === "true",
  };
  try {
    await api(`/carreras${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST", body: JSON.stringify(datos),
    });
    cancelarFormularioCarrera();
    cargarCarreras();
  } catch (e) { document.getElementById("mensaje-carrera").textContent = e.message; }
});

function editarCarrera(c) {
  document.getElementById("carrera-id").value = c.id;
  document.getElementById("carrera-codigo").value = c.codigo;
  document.getElementById("carrera-nombre").value = c.nombre;
  document.getElementById("carrera-duracion").value = c.duracion_anios;
  document.getElementById("carrera-activo").value = String(c.activo);
  document.getElementById("titulo-form-carrera").textContent = `Editar — ${c.nombre}`;
  document.getElementById("boton-cancelar-carrera").classList.remove("oculto");
}
function cancelarFormularioCarrera() {
  document.getElementById("form-carrera").reset();
  document.getElementById("carrera-id").value = "";
  document.getElementById("titulo-form-carrera").textContent = "Nueva carrera";
  document.getElementById("boton-cancelar-carrera").classList.add("oculto");
}
document.getElementById("boton-cancelar-carrera").onclick = cancelarFormularioCarrera;

// ========== DOCENTES ==========
async function cargarDocentes() {
  try {
    const lista = await api("/docentes");
    cache.docentes = lista;
    const tbody = document.getElementById("cuerpo-tabla-docentes");
    tbody.innerHTML = "";
    lista.forEach((d) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${d.id}</td><td>${d.nombres} ${d.apellidos}</td>
        <td>${d.correo}</td><td>${d.especialidad ?? ""}</td>
        <td>${pastillaEstado(d.estado)}</td>
        <td class="acciones-fila">
          <button class="boton-icono" data-a="editar">Editar</button>
          <button class="boton-icono peligro" data-a="eliminar">Eliminar</button>
        </td>`;
      fila.querySelector('[data-a="editar"]').onclick = () => editarDocente(d);
      fila.querySelector('[data-a="eliminar"]').onclick = () => eliminarGenerico("docentes", d.id, cargarDocentes);
      tbody.appendChild(fila);
    });
  } catch (e) { console.error(e); }
}

document.getElementById("form-docente").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("docente-id").value;
  const datos = {
    nombres: document.getElementById("docente-nombres").value.trim(),
    apellidos: document.getElementById("docente-apellidos").value.trim(),
    correo: document.getElementById("docente-correo").value.trim(),
    telefono: document.getElementById("docente-telefono").value.trim() || null,
    especialidad: document.getElementById("docente-especialidad").value.trim() || null,
    estado: document.getElementById("docente-estado").value,
  };
  try {
    await api(`/docentes${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST", body: JSON.stringify(datos),
    });
    cancelarFormularioDocente();
    cargarDocentes();
  } catch (e) { document.getElementById("mensaje-docente").textContent = e.message; }
});

function editarDocente(d) {
  document.getElementById("docente-id").value = d.id;
  document.getElementById("docente-nombres").value = d.nombres;
  document.getElementById("docente-apellidos").value = d.apellidos;
  document.getElementById("docente-correo").value = d.correo;
  document.getElementById("docente-telefono").value = d.telefono ?? "";
  document.getElementById("docente-especialidad").value = d.especialidad ?? "";
  document.getElementById("docente-estado").value = d.estado;
  document.getElementById("titulo-form-docente").textContent = `Editar — ${d.nombres} ${d.apellidos}`;
  document.getElementById("boton-cancelar-docente").classList.remove("oculto");
}
function cancelarFormularioDocente() {
  document.getElementById("form-docente").reset();
  document.getElementById("docente-id").value = "";
  document.getElementById("titulo-form-docente").textContent = "Nuevo docente";
  document.getElementById("boton-cancelar-docente").classList.add("oculto");
}
document.getElementById("boton-cancelar-docente").onclick = cancelarFormularioDocente;

// ========== ASIGNATURAS ==========
async function cargarAsignaturas() {
  try {
    const asignaturas = await api("/asignaturas");
    cache.asignaturas = asignaturas;
    if (!cache.carreras.length) cache.carreras = await api("/carreras").catch(() => []);
    llenarSelect(document.getElementById("asignatura-carrera"),
      cache.carreras, (c) => c.id, (c) => c.nombre, "Seleccione carrera");
    llenarSelect(document.getElementById("asignatura-requisito"),
      asignaturas, (a) => a.id, (a) => `${a.codigo} — ${a.nombre}`);
    const tbody = document.getElementById("cuerpo-tabla-asignaturas");
    tbody.innerHTML = "";
    asignaturas.forEach((a) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${a.id}</td><td>${a.codigo}</td><td>${a.nombre}</td>
        <td>${a.carrera_nombre ?? ""}</td><td>${a.unidades_valorativas}</td>
        <td class="acciones-fila">
          <button class="boton-icono" data-a="editar">Editar</button>
          <button class="boton-icono peligro" data-a="eliminar">Eliminar</button>
        </td>`;
      fila.querySelector('[data-a="editar"]').onclick = () => editarAsignatura(a);
      fila.querySelector('[data-a="eliminar"]').onclick = () => eliminarGenerico("asignaturas", a.id, cargarAsignaturas);
      tbody.appendChild(fila);
    });
  } catch (e) { console.error(e); }
}

document.getElementById("form-asignatura").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("asignatura-id").value;
  const datos = {
    codigo: document.getElementById("asignatura-codigo").value.trim(),
    nombre: document.getElementById("asignatura-nombre").value.trim(),
    carrera_id: Number(document.getElementById("asignatura-carrera").value),
    unidades_valorativas: Number(document.getElementById("asignatura-uv").value),
    requisito_id: document.getElementById("asignatura-requisito").value
      ? Number(document.getElementById("asignatura-requisito").value) : null,
  };
  try {
    await api(`/asignaturas${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST", body: JSON.stringify(datos),
    });
    cancelarFormularioAsignatura();
    cargarAsignaturas();
  } catch (e) { document.getElementById("mensaje-asignatura").textContent = e.message; }
});

function editarAsignatura(a) {
  document.getElementById("asignatura-id").value = a.id;
  document.getElementById("asignatura-codigo").value = a.codigo;
  document.getElementById("asignatura-nombre").value = a.nombre;
  document.getElementById("asignatura-carrera").value = a.carrera_id;
  document.getElementById("asignatura-uv").value = a.unidades_valorativas;
  document.getElementById("asignatura-requisito").value = a.requisito_id ?? "";
  document.getElementById("titulo-form-asignatura").textContent = `Editar — ${a.nombre}`;
  document.getElementById("boton-cancelar-asignatura").classList.remove("oculto");
}
function cancelarFormularioAsignatura() {
  document.getElementById("form-asignatura").reset();
  document.getElementById("asignatura-id").value = "";
  document.getElementById("titulo-form-asignatura").textContent = "Nueva asignatura";
  document.getElementById("boton-cancelar-asignatura").classList.add("oculto");
}
document.getElementById("boton-cancelar-asignatura").onclick = cancelarFormularioAsignatura;

// ========== PERÍODOS ==========
async function cargarPeriodos() {
  try {
    const lista = await api("/periodos");
    cache.periodos = lista;
    const tbody = document.getElementById("cuerpo-tabla-periodos");
    tbody.innerHTML = "";
    lista.forEach((p) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${p.id}</td><td>${p.nombre}</td>
        <td>${p.fecha_inicio}</td><td>${p.fecha_fin}</td>
        <td>${p.activo ? "Sí" : "No"}</td>
        <td class="acciones-fila">
          <button class="boton-icono" data-a="editar">Editar</button>
          <button class="boton-icono peligro" data-a="eliminar">Eliminar</button>
        </td>`;
      fila.querySelector('[data-a="editar"]').onclick = () => editarPeriodo(p);
      fila.querySelector('[data-a="eliminar"]').onclick = () => eliminarGenerico("periodos", p.id, cargarPeriodos);
      tbody.appendChild(fila);
    });
  } catch (e) { console.error(e); }
}

document.getElementById("form-periodo").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("periodo-id").value;
  const datos = {
    nombre: document.getElementById("periodo-nombre").value.trim(),
    fecha_inicio: document.getElementById("periodo-inicio").value,
    fecha_fin: document.getElementById("periodo-fin").value,
    activo: document.getElementById("periodo-activo").value === "true",
  };
  try {
    await api(`/periodos${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST", body: JSON.stringify(datos),
    });
    cancelarFormularioPeriodo();
    cargarPeriodos();
  } catch (e) { document.getElementById("mensaje-periodo").textContent = e.message; }
});

function editarPeriodo(p) {
  document.getElementById("periodo-id").value = p.id;
  document.getElementById("periodo-nombre").value = p.nombre;
  document.getElementById("periodo-inicio").value = p.fecha_inicio;
  document.getElementById("periodo-fin").value = p.fecha_fin;
  document.getElementById("periodo-activo").value = String(p.activo);
  document.getElementById("titulo-form-periodo").textContent = `Editar — ${p.nombre}`;
  document.getElementById("boton-cancelar-periodo").classList.remove("oculto");
}
function cancelarFormularioPeriodo() {
  document.getElementById("form-periodo").reset();
  document.getElementById("periodo-id").value = "";
  document.getElementById("titulo-form-periodo").textContent = "Nuevo período";
  document.getElementById("boton-cancelar-periodo").classList.add("oculto");
}
document.getElementById("boton-cancelar-periodo").onclick = cancelarFormularioPeriodo;

// ========== AULAS ==========
async function cargarAulas() {
  try {
    const lista = await api("/aulas");
    cache.aulas = lista;
    const tbody = document.getElementById("cuerpo-tabla-aulas");
    tbody.innerHTML = "";
    lista.forEach((a) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${a.id}</td><td>${a.codigo}</td>
        <td>${a.capacidad}</td><td>${a.ubicacion ?? ""}</td>
        <td class="acciones-fila">
          <button class="boton-icono" data-a="editar">Editar</button>
          <button class="boton-icono peligro" data-a="eliminar">Eliminar</button>
        </td>`;
      fila.querySelector('[data-a="editar"]').onclick = () => editarAula(a);
      fila.querySelector('[data-a="eliminar"]').onclick = () => eliminarGenerico("aulas", a.id, cargarAulas);
      tbody.appendChild(fila);
    });
  } catch (e) { console.error(e); }
}

document.getElementById("form-aula").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("aula-id").value;
  const datos = {
    codigo: document.getElementById("aula-codigo").value.trim(),
    capacidad: Number(document.getElementById("aula-capacidad").value),
    ubicacion: document.getElementById("aula-ubicacion").value.trim() || null,
  };
  try {
    await api(`/aulas${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST", body: JSON.stringify(datos),
    });
    cancelarFormularioAula();
    cargarAulas();
  } catch (e) { document.getElementById("mensaje-aula").textContent = e.message; }
});

function editarAula(a) {
  document.getElementById("aula-id").value = a.id;
  document.getElementById("aula-codigo").value = a.codigo;
  document.getElementById("aula-capacidad").value = a.capacidad;
  document.getElementById("aula-ubicacion").value = a.ubicacion ?? "";
  document.getElementById("titulo-form-aula").textContent = `Editar — ${a.codigo}`;
  document.getElementById("boton-cancelar-aula").classList.remove("oculto");
}
function cancelarFormularioAula() {
  document.getElementById("form-aula").reset();
  document.getElementById("aula-id").value = "";
  document.getElementById("titulo-form-aula").textContent = "Nueva aula";
  document.getElementById("boton-cancelar-aula").classList.add("oculto");
}
document.getElementById("boton-cancelar-aula").onclick = cancelarFormularioAula;

// ========== SECCIONES ==========
async function cargarSecciones() {
  try {
    const lista = await api("/secciones");
    cache.secciones = lista;
    if (!cache.asignaturas.length) cache.asignaturas = await api("/asignaturas").catch(() => []);
    if (!cache.docentes.length) cache.docentes = await api("/docentes").catch(() => []);
    if (!cache.periodos.length) cache.periodos = await api("/periodos").catch(() => []);
    if (!cache.aulas.length) cache.aulas = await api("/aulas").catch(() => []);
    llenarSelect(document.getElementById("seccion-asignatura"),
      cache.asignaturas, (a) => a.id, (a) => `${a.codigo} — ${a.nombre}`, "Seleccione");
    llenarSelect(document.getElementById("seccion-docente"),
      cache.docentes, (d) => d.id, (d) => `${d.nombres} ${d.apellidos}`, "Seleccione");
    llenarSelect(document.getElementById("seccion-periodo"),
      cache.periodos, (p) => p.id, (p) => p.nombre, "Seleccione");
    llenarSelect(document.getElementById("seccion-aula"),
      cache.aulas, (a) => a.id, (a) => a.codigo, "Sin aula");
    const tbody = document.getElementById("cuerpo-tabla-secciones");
    tbody.innerHTML = "";
    lista.forEach((s) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${s.id}</td><td>${s.codigo}</td>
        <td>${s.asignatura_nombre ?? ""}</td>
        <td>${s.docente_nombre ?? ""}</td>
        <td>${s.dias}</td>
        <td>${s.hora_inicio}–${s.hora_fin}</td>
        <td>${s.cupo_maximo}</td>
        <td>${pastillaEstado(s.estado)}</td>
        <td class="acciones-fila">
          <button class="boton-icono" data-a="editar">Editar</button>
          <button class="boton-icono peligro" data-a="eliminar">Eliminar</button>
        </td>`;
      fila.querySelector('[data-a="editar"]').onclick = () => editarSeccion(s);
      fila.querySelector('[data-a="eliminar"]').onclick = () => eliminarGenerico("secciones", s.id, cargarSecciones);
      tbody.appendChild(fila);
    });
  } catch (e) { console.error(e); }
}

document.getElementById("form-seccion").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("seccion-id").value;
  const datos = {
    codigo: document.getElementById("seccion-codigo").value.trim(),
    asignatura_id: Number(document.getElementById("seccion-asignatura").value),
    docente_id: Number(document.getElementById("seccion-docente").value),
    periodo_id: Number(document.getElementById("seccion-periodo").value),
    aula_id: document.getElementById("seccion-aula").value
      ? Number(document.getElementById("seccion-aula").value) : null,
    dias: document.getElementById("seccion-dias").value.trim(),
    hora_inicio: document.getElementById("seccion-hora-inicio").value,
    hora_fin: document.getElementById("seccion-hora-fin").value,
    cupo_maximo: Number(document.getElementById("seccion-cupo").value),
    estado: document.getElementById("seccion-estado").value,
  };
  try {
    await api(`/secciones${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST", body: JSON.stringify(datos),
    });
    cancelarFormularioSeccion();
    cargarSecciones();
  } catch (e) { document.getElementById("mensaje-seccion").textContent = e.message; }
});

function editarSeccion(s) {
  document.getElementById("seccion-id").value = s.id;
  document.getElementById("seccion-codigo").value = s.codigo;
  document.getElementById("seccion-asignatura").value = s.asignatura_id;
  document.getElementById("seccion-docente").value = s.docente_id;
  document.getElementById("seccion-periodo").value = s.periodo_id;
  document.getElementById("seccion-aula").value = s.aula_id ?? "";
  document.getElementById("seccion-dias").value = s.dias;
  document.getElementById("seccion-hora-inicio").value = s.hora_inicio;
  document.getElementById("seccion-hora-fin").value = s.hora_fin;
  document.getElementById("seccion-cupo").value = s.cupo_maximo;
  document.getElementById("seccion-estado").value = s.estado;
  document.getElementById("titulo-form-seccion").textContent = `Editar — ${s.codigo}`;
  document.getElementById("boton-cancelar-seccion").classList.remove("oculto");
}
function cancelarFormularioSeccion() {
  document.getElementById("form-seccion").reset();
  document.getElementById("seccion-id").value = "";
  document.getElementById("titulo-form-seccion").textContent = "Nueva sección";
  document.getElementById("boton-cancelar-seccion").classList.add("oculto");
}
document.getElementById("boton-cancelar-seccion").onclick = cancelarFormularioSeccion;

// ========== MATRÍCULAS ==========
async function cargarMatriculas() {
  try {
    const lista = await api("/matriculas");
    cache.matriculas = lista;
    if (!cache.estudiantes.length) cache.estudiantes = await api("/estudiantes").catch(() => []);
    if (!cache.secciones.length) cache.secciones = await api("/secciones").catch(() => []);
    llenarSelect(document.getElementById("matricula-estudiante"),
      cache.estudiantes, (e) => e.id, (e) => `${e.cuenta} — ${e.nombres} ${e.apellidos}`, "Seleccione");
    llenarSelect(document.getElementById("matricula-seccion"),
      cache.secciones, (s) => s.id,
      (s) => `${s.codigo} — ${s.asignatura_nombre ?? ""}`, "Seleccione");
    const tbody = document.getElementById("cuerpo-tabla-matriculas");
    tbody.innerHTML = "";
    lista.forEach((m) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${m.id}</td>
        <td>${m.estudiante_nombre ?? m.estudiante_id}</td>
        <td>${m.seccion_codigo ?? m.seccion_id}</td>
        <td>${pastillaEstado(m.estado)}</td>
        <td class="acciones-fila">
          <button class="boton-icono peligro" data-a="cancelar">Cancelar</button>
        </td>`;
      const btn = fila.querySelector('[data-a="cancelar"]');
      if (btn) btn.onclick = async () => {
        if (!confirm("¿Cancelar esta matrícula?")) return;
        try {
          await api(`/matriculas/${m.id}/cancelar`, { method: "PATCH" });
          cargarMatriculas();
        } catch (e) { alert(e.message); }
      };
      tbody.appendChild(fila);
    });
  } catch (e) { console.error(e); }
}

document.getElementById("form-matricula").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const datos = {
    estudiante_id: Number(document.getElementById("matricula-estudiante").value),
    seccion_id: Number(document.getElementById("matricula-seccion").value),
  };
  const msg = document.getElementById("mensaje-matricula");
  msg.textContent = "";
  try {
    await api("/matriculas", { method: "POST", body: JSON.stringify(datos) });
    msg.textContent = "Matriculado correctamente.";
    msg.className = "mensaje-exito";
    cargarMatriculas();
    cargarDashboard();
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "mensaje-error";
  }
});

// ========== CALIFICACIONES ==========
async function cargarCalificaciones() {
  try {
    const matriculas = await api("/matriculas");
    cache.matriculas = matriculas;
    if (!cache.estudiantes.length) cache.estudiantes = await api("/estudiantes").catch(() => []);
    const sel = document.getElementById("calificacion-matricula");
    sel.innerHTML = "";
    matriculas.forEach((m) => {
      const op = document.createElement("option");
      op.value = m.id;
      op.textContent = `#${m.id} — ${m.estudiante_nombre ?? m.estudiante_id} / ${m.seccion_codigo ?? m.seccion_id}`;
      sel.appendChild(op);
    });
    const tbody = document.getElementById("cuerpo-tabla-calificaciones");
    tbody.innerHTML = "";
    for (const m of matriculas) {
      try {
        const c = await api(`/calificaciones/matricula/${m.id}`);
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>#${m.id}</td>
          <td>${c.primer_parcial ?? "-"}</td>
          <td>${c.segundo_parcial ?? "-"}</td>
          <td>${c.tercer_parcial ?? "-"}</td>
          <td>${c.promedio ?? "-"}</td>
          <td>${pastillaEstado(c.resultado ?? "PENDIENTE")}</td>`;
        tbody.appendChild(fila);
      } catch {}
    }
  } catch (e) { console.error(e); }
}

document.getElementById("form-calificacion").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const matriculaId = document.getElementById("calificacion-matricula").value;
  const datos = {
    primer_parcial: Number(document.getElementById("calificacion-p1").value),
    segundo_parcial: Number(document.getElementById("calificacion-p2").value),
    tercer_parcial: Number(document.getElementById("calificacion-p3").value),
    observacion: document.getElementById("calificacion-observacion").value.trim() || null,
  };
  const msg = document.getElementById("mensaje-calificacion");
  try {
    await api(`/calificaciones/matricula/${matriculaId}`, {
      method: "PUT", body: JSON.stringify(datos),
    });
    msg.textContent = "Calificaciones guardadas.";
    msg.className = "mensaje-exito";
    cargarCalificaciones();
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "mensaje-error";
  }
});

// ========== REPORTES ==========
async function cargarReportes() {
  try {
    const [estudiantes, secciones, docentes] = await Promise.all([
      api("/estudiantes"), api("/secciones"), api("/docentes"),
    ]);
    llenarSelect(document.getElementById("reporte-estudiante"),
      estudiantes, (e) => e.id, (e) => `${e.nombres} ${e.apellidos}`, "Seleccione estudiante");
    llenarSelect(document.getElementById("reporte-seccion"),
      secciones, (s) => s.id, (s) => `${s.codigo} — ${s.asignatura_nombre ?? ""}`, "Seleccione sección");
    llenarSelect(document.getElementById("reporte-docente"),
      docentes, (d) => d.id, (d) => `${d.nombres} ${d.apellidos}`, "Seleccione docente");
  } catch (e) { console.error(e); }
}

const salidaReporte = document.getElementById("salida-reporte");

function generarTablaHTML(datos, columnas) {
  if (!datos || datos.length === 0) return "<p class='texto-vacio'>No hay registros para mostrar.</p>";
  let html = '<table class="tabla-datos"><thead><tr>';
  columnas.forEach(col => html += `<th>${col.titulo}</th>`);
  html += '</tr></thead><tbody>';
  datos.forEach(fila => {
    html += '<tr>';
    columnas.forEach(col => {
      const valor = fila[col.campo] ?? '-';
      html += `<td>${col.campo === 'estado' || col.campo === 'resultado' ? pastillaEstado(valor) : valor}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

document.getElementById("btn-ver-historial").onclick = async () => {
  const id = document.getElementById("reporte-estudiante").value;
  if (!id) return;
  salidaReporte.innerHTML = "<p>Cargando...</p>";
  try {
    const r = await api(`/reportes/historial-estudiante/${id}`);
    let html = `
      <div class="tarjeta-reporte">
        <h2>Historial Académico</h2>
        <p><strong>Estudiante:</strong> ${r.estudiante.nombres} ${r.estudiante.apellidos}</p>
        <p><strong>Cuenta:</strong> ${r.estudiante.cuenta} | <strong>Carrera:</strong> ${r.estudiante.carrera_nombre}</p>
        <div class="resumen-datos">
          <div class="dato-resumen"><span>Asignaturas Cursadas</span><strong>${r.resumen.asignaturas_cursadas}</strong></div>
          <div class="dato-resumen"><span>UV Aprobadas</span><strong>${r.resumen.unidades_valorativas_aprobadas}</strong></div>
        </div>
      </div>
    `;
    const columnas = [
      { titulo: "Asignatura", campo: "asignatura" },
      { titulo: "Sección", campo: "seccion" },
      { titulo: "Nota", campo: "nota_final" },
      { titulo: "Estado", campo: "estado" }
    ];
    html += generarTablaHTML(r.historial, columnas);
    salidaReporte.innerHTML = html;
  } catch (e) { salidaReporte.innerHTML = `<p class="mensaje-error">${e.message}</p>`; }
};

document.getElementById("btn-ver-seccion").onclick = async () => {
  const id = document.getElementById("reporte-seccion").value;
  if (!id) return;
  salidaReporte.innerHTML = "<p>Cargando...</p>";
  try {
    const r = await api(`/reportes/lista-seccion/${id}`);
    let html = `
      <div class="tarjeta-reporte">
        <h2>Lista de Sección</h2>
        <p><strong>Sección:</strong> ${r.seccion?.codigo || '-'} | <strong>Asignatura:</strong> ${r.seccion?.asignatura || '-'}</p>
        <p><strong>Docente:</strong> ${r.seccion?.docente || '-'} | <strong>Total estudiantes:</strong> ${r.estudiantes?.length || 0}</p>
      </div>
    `;
    const columnas = [
      { titulo: "Cuenta", campo: "cuenta" },
      { titulo: "Estudiante", campo: "nombre_completo" },
      { titulo: "Estado Matrícula", campo: "estado" },
      { titulo: "Nota Final", campo: "nota_final" }
    ];
    html += generarTablaHTML(r.estudiantes, columnas);
    salidaReporte.innerHTML = html;
  } catch (e) { salidaReporte.innerHTML = `<p class="mensaje-error">${e.message}</p>`; }
};

document.getElementById("btn-ver-carga").onclick = async () => {
  const id = document.getElementById("reporte-docente").value;
  if (!id) return;
  salidaReporte.innerHTML = "<p>Cargando...</p>";
  try {
    const r = await api(`/reportes/carga-docente/${id}`);
    let html = `
      <div class="tarjeta-reporte">
        <h2>Carga Académica</h2>
        <p><strong>Docente:</strong> ${r.docente?.nombres || ''} ${r.docente?.apellidos || ''}</p>
        <p><strong>Total de secciones:</strong> ${r.secciones?.length || 0}</p>
      </div>
    `;
    const columnas = [
      { titulo: "Sección", campo: "codigo" },
      { titulo: "Asignatura", campo: "asignatura" },
      { titulo: "Días", campo: "dias" },
      { titulo: "Horario", campo: "horario" },
      { titulo: "Aula", campo: "aula" }
    ];
    html += generarTablaHTML(r.secciones, columnas);
    salidaReporte.innerHTML = html;
  } catch (e) { salidaReporte.innerHTML = `<p class="mensaje-error">${e.message}</p>`; }
};

// ========== PORTAL DEL ESTUDIANTE ==========
async function cargarPortalEstudiante() {
  const tbody = document.getElementById("cuerpo-mi-portal");
  const textoVacio = document.getElementById("texto-sin-clases");
  tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";
  
  if (!usuarioActual.estudiante_id) {
    tbody.innerHTML = "";
    textoVacio.textContent = "Error: Esta cuenta no está vinculada a un estudiante.";
    textoVacio.classList.remove("oculto");
    return;
  }

  try {
    const r = await api(`/reportes/historial-estudiante/${usuarioActual.estudiante_id}`);
    
    tbody.innerHTML = "";
    if (!r.historial || r.historial.length === 0) {
      textoVacio.classList.remove("oculto");
      return;
    }
    
    textoVacio.classList.add("oculto");
    
    r.historial.forEach(materia => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${materia.asignatura || '-'}</td>
        <td>${materia.docente || '-'}</td>
        <td>${materia.aula || '-'}</td>
        <td>${materia.horario || '-'}</td>
        <td><strong>${materia.nota_final ?? '-'}</strong></td>
        <td>${pastillaEstado(materia.estado)}</td>
      `;
      tbody.appendChild(fila);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="mensaje-error">Error: ${e.message}</td></tr>`;
  }
}

// ========== Eliminar genérico ==========
async function eliminarGenerico(recurso, id, recargar) {
  if (!confirm(`¿Eliminar el registro #${id} de ${recurso}?`)) return;
  try {
    await api(`/${recurso}/${id}`, { method: "DELETE" });
    recargar();
  } catch (e) { alert(e.message); }
}