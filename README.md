
# Api Gateway
## Creado para la empresa: Webtiginoso

# Api Gateway: Documentación

Ésta es una documentación básica y descriptiva de ésta api, que comunica el frontend con los microservicios internos en Google Cloud.

API Gateway gestiona todas las tareas relacionadas con la aceptación y el procesamiento de centenares de miles de llamadas simultáneas a la API. Estas tareas incluyen la administración del tráfico, el control de la autorización, el acceso, el monitoreo y la seguridad en general. Es la primera capa de seguridad y organización de todo el flujo.

## Descripción de archivos

Una guía básica de los archivos principales y más usados de la API Gateway.

### gateway_conf.yml

Archivo YAML que lista los servicios y peticiones disponibles para la app en general. Si se hace una petición a la api gateway y no existe o no está registrada dentro de éste archivo: la app rechazará la petición automáticamente.


### app/utils/configs/config.js

Módulo que exporta un objeto Javascript con cierta data persistente dentro de la APP, como la llave interna, el SALT para el encriptado, entre otros.


### app/src/middlewares/gateway_middleware.js

Éste es el archivo middleware que contiene el router básico de la api. A modo general recibe todas las peticiones, pero hace distinción con algunos condicionales en Javascript. 

Las rutas aceptadas son las siguientes: 

```javascript
router.post('/auth/login')
```
Que recibe la petición del frontend para hacer un login interno entre aplicaciones (no tiene nada que ver con el login del usuario). Si el frontend cumple con los requisitos: ésta función devuelve un token con una duración máxima de 1 hora. Sin éste token: el frontend no podrá acceder a los microservicios ni ninguna data del backend.

Esta siguiente llamada sirve para la renovación de del token (POST): 

```javascript
router.post('/renewtoken')
```

La duración del nuevo token es igualmente de 1 hora.

Todas las demás peticiones pasan directo a una ruta universal

```javascript
router.all('*')
```

### app/src/core/response_resolver.js

Módulo de node que modifica los Headers de la petición para añadir seguridad y eliminar posibles caché, entre otros. Este módulo está basado en:  OWASP Secure Headers Project, que describe los encabezados de respuesta HTTP que una aplicación web puede usar para aumentar su seguridad. Una vez configurados, estos encabezados de respuesta HTTP pueden impedir que los navegadores modernos se encuentren con vulnerabilidades fácilmente prevenibles.

### app/src/core/request_resolver.js

Este módulo tiene varias acciones: 

 - Valida que el usuario/ip está autenticado
 - Valida que el request esté dentro de los servicios registrados en el config yml
 - Crea un log para monitoreo de todas las acciones (aun no está implementado)


Aquí hacemos uso de varias funciones internas como son:

- __grabRequest  -  Una función que modifica el request HTTP básico y lo convierte en un objeto más completo y útil para el uso de la api en general.

- __getServiceInformation - Función que busca en el archivo YAML si existe el servicio al cual está tratando de acceder el frontend. De no existir: directamente devuelve una respuesta 404 al front.


### app/src/core/request_forwarding.js

Módulo que procesa la petición una vez que ha pasado por el filtro anterior de request_resolver. Si no ha habido ningún error: éste módulo cumple la petición. Las tareas de éste módulo son:

- Revisa el tipo de request (GET, POST, PUT, etc) y genera una llamada axios dependiendo del tipo.

- Genera un HASH TOKEN que reciben los microservicios para autenticar la petición. Sin éste TOKEN los microservicios rechazan la petición.

- Completa la petición del cliente devolviendo el resolve con la data.


### app/src/core/management.js

Archivo con funciones generales y útiles. Contiene las funciones internas de:

- hashAnything - Función que genera un hash a partir de una clave secreta interna. Éste hash es el token que comparten la api gateway y los microservicios. Usa el módulo de Bcrypt para NodeJS.

- compareHashes - Función que compara un HASH con la clave interna de la api Gateway. Se usa para saber si un HASH fue generado a partir de esa clave interna (que debe ser pasada como parámetro). Devuelve un TRUE o FALSE cuando termina la comparación.

- devolver401 - Función que recibe como parámetro el response general y el módulo al que se intentó acceder (formato text). Devuelve 401 al frontend. Usado en varias partes del código.


### Otros archivos y funciones internas

Existen otras funciones y código en éste repositorio  no documentado. Si se encuentra alguna función no mencionada en ésta documentación es porque no se le está dando uso.


# Api Gateway: Guía de cómo conectar

Dada la complejidad de la api, se hizo necesaria un pequeño paso a paso para explicar cómo debe ser la conexión y qué requisitos son necesarios para una conexión segura.

## Paso 1: Seguridad

Primeramente es necesario hacer login interno en la api, que generará un token de 1h de duración. la llamada POST de login requiere que usted tenga una clave secreta que solamente se comparte el client con el api gateway. Dicha clave se pasa como un header:

```javascript
basic_auth = "clave aquí"
```
Hace la llamada POST con dicho header a:

```javascript
router.post('/auth/login')
```

Le retornará el token verificado de 1h de duración, con el cual ya puede hacer operaciones en la api.

Para renovar el token de 1h tiene la siguiente llamada:

```javascript
router.post('/renewtoken')
```
Debe pasar por el header el token que esté a punto de vencerse, de la siguiente manera:

```javascript
authorization = "Bearer token-aqui-1234"
```

(la palabra "authorization" sin mayúscula).

De esta misma manera se usa el token para cualquier llamada que quiera hacer en la api. Sin el header "authorization" y el token vigente: la api gateway rechazará la llamada.

## Paso 2: Establecer el servicio

En la carpeta /app se encuentra el archivo gateway_conf.yml, que establece cuales son los servicios y las llamadas autorizadas por el api gateway. Si un endpoint no existe o no está declarado en el archivo: la api gateway rechazará la llamada. Asegúrese de que su servicio está registrado en éste archivo y que tiene todos los endpoints get y post que va a necesitar.

En cada llamada se debe añadir SIEMPRE el HEADER app_id con el nombre del servicio como está escrito en el archivo yml. Ejemplo del header:

```javascript
app_id = "nombre_del_servicio"
```

Sin éste header la api rechazará la llamada.

## Paso 3: Formar la url correcta

Todas las llamadas deben hacerse basado en el siguiente ejemplo:  

#### https://url-base / gateway / nombre-servicio / todo-lo-demás

Ejemplo: GET 

https://miurlaqui.com/gateway/servicio1/getusers

Asegúrese que el getusers (tomando el ejemplo) esté registrado en el archivo yml como una llamada GET.


## Paso 4: Flexibilidad de la api

La api es suficientemente flexible para dejar pasar el BODY completamente libre, siempre y cuando se hayan superado las capas de seguridad. Sin embargo, los headers están limitados a una lista de "exclusivos". Dicha lista se puede conseguir en: /app/src/core/request_resolver.js, en una función llamada: 

```javascript
_grabExtraHeaders(obj)
```

La cual hace un filtrado y solamente deja pasar los headers autorizados que se encuentran en el array de la línea 36:

```javascript
const AllowedHeaders = []
```

Revise ésta lista y asegúrese que sus headers necesarios estén añadidos (sensible a mayúsculas y minúsculas). De lo contrario no serán tomados en cuenta y eso le puede generar problemas.

Si sus servicios necesitan recibir headers específicos: asegúrese que están añadidos a ésta lista exclusiva para que la api los deje pasar.