# 🚀 Guía de Ejecución: Contenedor Docker de HouseCount Simulator

Esta guía detalla el paso a paso para levantar el entorno de desarrollo del proyecto en tu máquina local de forma estandarizada utilizando Docker.

## 🛠️ Requisitos Previos (Solo la primera vez)

**1. Instalación de Docker Desktop para Windows:**
Descarga el instalador desde la página oficial: [Docker Desktop](https://www.docker.com/products/docker-desktop/). 
*(Asegúrate de elegir la opción "Download for Windows - AMD64").* Completa la instalación con las opciones por defecto.

**2. Iniciar sesión en Docker:**
Ejecuta la aplicación Docker Desktop. Te pedirá iniciar sesión; puedes usar una cuenta personal o tu cuenta institucional (ej. la del DUOC). 
> ⚠️ **Importante:** Deja la aplicación Docker Desktop abierta corriendo en segundo plano antes de continuar con los siguientes pasos.


## 💻 Paso a Paso para Levantar el Proyecto

**3. Obtener el proyecto desde GitHub:**
Abre tu terminal (Git Bash, CMD o PowerShell) y clona el repositorio, o actualízalo si ya lo tienes:
`git clone https://github.com/Benjaminunez/HomeCount_Simulator.git` (Si es tu primera vez)
`git pull` (Si ya tienes la carpeta y quieres actualizar)

**4. Ingresar a la carpeta del contenedor:**
Navega hasta la carpeta raíz donde se encuentra el archivo `docker-compose.yml`. Si usas la interfaz gráfica de Windows, entra a la carpeta `HouseCountSimulatorDocker`, haz clic derecho en un espacio en blanco y elige la opción **"Abrir en terminal"**.

**5. Verificar que Docker esté funcionando:**
En la terminal, ejecuta el siguiente comando para comprobar que Docker está activo:
`docker info`
*(Si te salen errores, significa que Docker no está corriendo o no se instaló bien. Asegúrate de que Docker Desktop esté abierto. A veces es necesario reiniciar el PC tras instalarlo).*

**6. Construir y levantar el contenedor por primera vez:**
Como es la primera vez (o acabas de hacer un `git pull` con cambios nuevos), necesitas construir la imagen e instalar las dependencias. Ejecuta:
`docker compose up -d --build`
*(El parámetro `-d` hace que se ejecute en segundo plano para que puedas seguir usando tu terminal).*

**7. Visualizar el proyecto en local:**
¡Listo! No necesitas ejecutar comandos extra para levantar servidores. Solo abre tu navegador web (Chrome, Edge, etc.) e ingresa a:
👉 **http://localhost:8000**


## ⏸️ Uso Diario (Apagar y Encender)

Para no consumir recursos de tu computadora cuando no estés trabajando, no es necesario borrar todo, simplemente apaga y enciende el contenedor:

* **Para apagar el contenedor:**
`docker compose stop`

* **Para volver a prenderlo al día siguiente:**
`docker compose start`


## 🔄 Actualización de Dependencias (Resolución de problemas)

Si un compañero agrega nuevas librerías al proyecto (modifica el `requirements.txt` o el `Dockerfile`) y haces un `git pull`, tu contenedor quedará desactualizado y podría dar errores. 

Para aplicar los nuevos cambios internos, **borra lo pre-instalado y vuelve a construir** con estos comandos:
`docker compose down`
`docker compose up -d --build`

