window.onload = function () {
    // Si la página tiene el cuerpo de la tabla (inicio.html), carga los datos de Mongo
    if (document.getElementById('tablaUsuariosCuerpo')) {
        cargarTablaUsuarios();
    }
    obtenerPaises();
    obtenerComunas();
};

async function cargarTablaUsuarios() {
    try {
        const respuesta = await fetch('http://localhost:3000/usuarios');
        const usuarios = await respuesta.json();

        const cuerpoTabla = document.getElementById('tablaUsuariosCuerpo');
        cuerpoTabla.innerHTML = ''; // Limpia la tabla antes de rellenar

        usuarios.forEach(usuario => {
            const fila = document.createElement('tr');

            // Usamos datosNacionalidad que viene del $lookup del backend
            const nombrePais = usuario.datosNacionalidad ? usuario.datosNacionalidad.nombre : 'No asignado';
            const estadoActivo = usuario.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>';

            fila.innerHTML = `
                <td>${usuario.nombre}</td>
                <td>${usuario.rut}</td>
                <td>${usuario.correo}</td>
                <td>${usuario.telefono || 'N/A'}</td>
                <td>${usuario.genero || 'O'}</td>
                <td><strong>${nombrePais}</strong></td>
                <td>${estadoActivo}</td>
            `;
            cuerpoTabla.appendChild(fila);
        });

        // Inicializa DataTables una vez que la tabla ya tiene las filas de la DB
        new DataTable('#example');

    } catch (error) {
        console.log('Error al obtener los usuarios para la tabla: ', error);
        new DataTable('#example'); // Evita que se rompa la vista si está vacía
    }
}
function validarFormulario() {
    let nombre = document.getElementById('inputNombre');
    let correo = document.getElementById('inputEmail'); // Mapeado a correo
    let rut = document.getElementById('inputRut');
    let telefono = document.getElementById('inputTelefono');
    let contrasena = document.getElementById('inputContrasena');
    let repContrasena = document.getElementById('inputRepetirContrasena');
    let fechaNacimiento = document.getElementById('inputFechaNac');
    let genero = document.querySelector('input[name="radioGenero"]:checked');
    let pais = document.getElementById('selectPais');
    
    // Campos nuevos para armar la dirección estructurada
    let comuna = document.getElementById('selectComuna');
    let calle = document.getElementById('inputCalle') || { value: 'Calle Ficticia' }; // Evita caídas si no existen aún en el HTML
    let numero = document.getElementById('inputNumero') || { value: '123' };
    let depto = document.getElementById('inputDepto') || { value: '' };

    let formularioValido = true;

    if (!validarCampo(nombre)) formularioValido = false;
    if (!validarEmail(correo)) formularioValido = false;
    if (!validarRut(rut)) formularioValido = false;
    if (!validarCampo(telefono)) formularioValido = false;
    if (!validarContrasena(contrasena)) formularioValido = false;
    if (!validarRepetirContrasena(repContrasena, contrasena)) formularioValido = false;
    if (!validarCampo(fechaNacimiento)) formularioValido = false;
    if (!validarCampo(pais)) formularioValido = false;
    if (comuna && !validarCampo(comuna)) formularioValido = false;

    if (formularioValido) {
        alert('Datos ingresados correctamente, enviado al servidor...');

        // Estructuramos el JSON con los campos y el subobjeto de dirección para Mongoose
        const data = {
            nombre: nombre.value,
            rut: rut.value,
            correo: correo.value,
            telefono: telefono.value,
            fechaNacimiento: fechaNacimiento.value,
            nacionalidad: pais.value, // Envía el iso2 (ej: "CL")
            genero: genero ? genero.value : 'O',
            contrasena: contrasena.value,
            direccion: {
                comuna: comuna ? comuna.value : '',
                calle: calle.value,
                numero: numero.value,
                departamento: depto.value
            }
        };

        const enviarDatos = async () => {
            try {
                const respuesta = await fetch('http://localhost:3000/guardarUsuario', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const info = await respuesta.json();
                console.log('Respuesta del servidor: ', info);

                if (respuesta.ok) {
                    document.getElementById('registroUsuario').reset();
                    window.location.href = './inicio.html';
                } else {
                    alert('Error del servidor: ' + info.mensaje);
                }
            }
            catch (error) {
                console.log('Error al guardar los datos: ', error);
            }
        };
        enviarDatos();
    } else {
        alert('Complete todos los datos correctamente antes de enviar el formulario.');
    }
}

function validarCampo(campo) {
    if (!campo || campo.value == '') {
        if(campo) campo.classList.add('is-invalid', 'alerta');
        return false;
    } else {
        campo.classList.remove('is-invalid', 'alerta');
        campo.classList.add('is-valid');
        return true;
    }
}

function validarEmail(campo) {
    if (validarCampo(campo)) {
        const regexEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!regexEmail.test(campo.value)) {
            campo.classList.add('is-invalid', 'alerta');
            return false;
        } else {
            campo.classList.remove('is-invalid', 'alerta');
            campo.classList.add('is-valid');
            return true;
        }
    }
    return false;
}

function validarContrasena(campo) {
    if (validarCampo(campo)) {
        const regexContrasena = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&])([A-Za-z\d$@$!%*?&]|[^ ]){8,15}$/;
        if (regexContrasena.test(campo.value)) {
            campo.classList.remove('is-invalid', 'alerta');
            campo.classList.add('is-valid');
            return true;
        } else {
            campo.classList.add('is-invalid', 'alerta');
            return false;
        }
    }
    return false;
}

function validarRepetirContrasena(campo, campo2) {
    if (validarCampo(campo)) {
        if (campo.value === campo2.value) {
            campo.classList.remove('is-invalid', 'alerta');
            campo.classList.add('is-valid');
            return true;
        } else { 
            campo.classList.add('is-invalid', 'alerta'); 
            return false; 
        }
    }
    return false;
}

function validarRut(campo) {
    if (validarCampo(campo)) {
        var valor = campo.value.replace(/\./g, '').replace(/-/g, '');

        if (valor.length < 8) { 
            campo.classList.add('is-invalid', 'alerta');
            return false; 
        }

        var cuerpo = valor.slice(0, -1);
        var dv = valor.slice(-1).toUpperCase();
        campo.value = cuerpo + '-' + dv;

        var suma = 0;
        var multiplo = 2;

        for (var i = 1; i <= cuerpo.length; i++) {
            var index = multiplo * valor.charAt(cuerpo.length - i);
            suma = suma + index;
            if (multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }
        }

        var dvEsperado = 11 - (suma % 11);
        if (dvEsperado == 11) dvEsperado = 0;
        if (dvEsperado == 10) dvEsperado = 'K';

        if (dvEsperado == dv || (dvEsperado == 0 && dv == '0')) {
            campo.classList.remove('is-invalid', 'alerta');
            campo.classList.add('is-valid');
            return true;
        } else {
            campo.classList.add('is-invalid', 'alerta');
            return false;
        }
    }
    return false;
}

async function obtenerPaises() {
    try {
        const respuesta = await fetch('http://localhost:3000/paises');
        const paises = await respuesta.json();

        const selectPaises = document.getElementById('selectPais');
        if (selectPaises) {
            selectPaises.innerHTML = '<option value="">Seleccione un país...</option>';
            paises.forEach(pais => {
                const opcion = document.createElement('option');
                opcion.value = pais.iso2;
                opcion.textContent = pais.nombre;
                selectPaises.appendChild(opcion);
            });
        }
    } catch (error) {
        console.log('Error: ', error);
    }
}

async function obtenerComunas() {
    try {
        const respuesta = await fetch('http://localhost:3000/comunas');
        const comunas = await respuesta.json();

        const selectComunas = document.getElementById('selectComuna');
        if (selectComunas) {
            selectComunas.innerHTML = '<option value="">Seleccione una comuna...</option>';
            comunas.forEach(comuna => {
                const opcion = document.createElement('option');
                opcion.value = comuna.nombre; // Guardamos el nombre o código
                opcion.textContent = comuna.nombre;
                selectComunas.appendChild(opcion);
            });
        }
    } catch (error) {
        console.log('Error: ', error);
    }
}