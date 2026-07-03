// Importamos las librerías instaladas
const express = require('express'); // Express permite generar la aplicación backend
const cors = require('cors'); // Cors permite que el servidor reciba solicitudes externas
const mongoose = require('mongoose'); // ORM que permite trabajar con objetos y DBs
const bcrypt = require('bcrypt');

// Iniciar la aplicación express holaaaaaaaa
const aplicacion = express();
const puerto = 3000;

// Instanciar las clases necesarias en nuestra aplicación
aplicacion.use(cors());
aplicacion.use(express.json());

// Crear la conexión a DB
mongoose.connect('mongodb://localhost:27017/AP_N3_C1')
    .then(() => console.log('Conexión Exitosa!'))
    .catch((excepcion) => console.log('No ha sido posible conectarse por el siguiente error: ', excepcion));

const puerto = process.env.PORT || 3000;
aplicacion.listen(puerto, () => console.log(`Corriendo en el puerto ${puerto}`));

// ==========================================
// ESQUEMAS Y MODELOS DE MONGOOSE
// ==========================================

const comuna = new mongoose.Schema({
    codigo: String,
    nombre: String,
    region: String
});
const Comuna = mongoose.model('Comuna', comuna, 'comunas');

// Esquema secundario para la dirección (Nivel 3 - Objeto estructurado)
const direccionSchema = new mongoose.Schema({
    comuna: { type: String, required: true },
    calle: { type: String, required: true },
    numero: { type: String, required: true },
    departamento: { type: String } 
}, { _id: false });

// Esquema principal de Usuario con todas las validaciones de la rúbrica
const usuarioSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre es obligatorio.'] 
    },
    rut: { 
        type: String, 
        required: [true, 'El RUT es obligatorio.'] 
    },
    correo: { 
        type: String, 
        required: [true, 'El correo electrónico es obligatorio.'] 
    },
    telefono: { 
        type: String 
    },
    fechaNacimiento: { 
        type: Date,
        validate: {
            validator: function(valor) {
                return valor < new Date(); // Valida que sea menor a la fecha actual
            },
            message: 'La fecha de nacimiento debe ser anterior a la fecha actual.'
        }
    },
    nacionalidad: { 
        type: String, 
        required: [true, 'La nacionalidad (Código ISO-3166 Alpha-2) es obligatoria.'] 
    },
    genero: { 
        type: String, 
        enum: {
            values: ['M', 'F', 'O'],
            message: 'El género debe ser M, F u O.'
        }
    },
    direccion: { 
        type: direccionSchema, 
        required: [true, 'La dirección es obligatoria.'] 
    },
    contrasena: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria.'] 
    },
    fechaRegistro: { 
        type: Date, 
        default: Date.now // Automática
    },
    activo: { 
        type: Boolean, 
        default: true // Por defecto true
    }
});
const Usuario = mongoose.model('Usuario', usuarioSchema, 'usuarios');

const pais = new mongoose.Schema({
    nombre: String,
    iso2: String,
    iso3: String,
    codigoPais: String,
    nacionalidad: String
});
const Pais = mongoose.model('Pais', pais, 'paises');


// ==========================================
// MÉTODOS Y RUTAS DE LA API (Nivel 3)
// ==========================================

// 1. Método POST para Crear/Guardar Usuario con todas las validaciones
aplicacion.post('/guardarUsuario', async (request, response) => {
    try {
        const { 
            nombre, 
            rut, 
            correo, 
            telefono, 
            fechaNacimiento, 
            nacionalidad, 
            genero, 
            direccion, // objeto con: comuna, calle, numero, departamento
            contrasena 
        } = request.body;

        // Validar que venga la contraseña antes de encriptar
        if (!contrasena) {
            return response.status(400).json({ 
                mensaje: 'No se han podido almacenar los datos: La contraseña es obligatoria.' 
            });
        }

        // Encriptar la contraseña con Bcrypt 
        const saltRounds = 10;
        const contrasenaEncriptada = await bcrypt.hash(contrasena, saltRounds);

        // Crear la instancia del modelo con la estructura limpia
        const nuevoUsuario = new Usuario({
            nombre,
            rut,
            correo,
            telefono,
            fechaNacimiento,
            nacionalidad, // Código ISO-3166 Alpha-2 (Ej: "CL", "AR")
            genero,
            direccion,
            contrasena: contrasenaEncriptada
        });

        
        await nuevoUsuario.save();
        
        response.status(200).json({ 
            mensaje: 'Datos almacenados correctamente.' 
        });

    } catch (excepcion) {
        let mensajeError = 'No se han podido almacenar los datos: ';
        if (excepcion.errors) {
            // Extrae los mensajes limpios que definiste en tu Schema
            const errores = Object.values(excepcion.errors).map(err => err.message);
            mensajeError += errores.join(' ');
        } else {
            mensajeError += excepcion.message;
        }
        
        response.status(400).json({ mensaje: mensajeError });
    }

aplicacion.get('/usuarios', async (request, response) => {
    try {
        // Implementación de Pipeline de Agregación para asociar con "paises"
        const usuariosConPais = await Usuario.aggregate([
            {
                $lookup: {
                    from: 'paises',           // Colección con la que unimos
                    localField: 'nacionalidad', // Campo en "usuarios" (código ISO, ej: "CL")
                    foreignField: 'iso2',      // Campo equivalente en "paises"
                    as: 'datosNacionalidad'    
                }
            },
            {
                // Convierte el arreglo "datosNacionalidad" en un objeto directo para que sea limpio
                $unwind: {
                    path: '$datosNacionalidad',
                    preserveNullAndEmptyArrays: true // Muestra al usuario incluso si el país no existe
                }
            }
        ]);

        if (!usuariosConPais || usuariosConPais.length === 0) {
            return response.status(404).json({ mensaje: 'No se encontraron usuarios registrados.' });
        }

        response.status(200).json(usuariosConPais);

    } catch (error) {
    response.status(500).json({ mensaje: `No ha sido posible obtener los datos: ${error.message}` });
}
