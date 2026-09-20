paso a paso para prender contenedor Docker de HouseCount

1- instalación de Docker desktop para Windows : https://www.docker.com/products/docker-desktop/ (elegir la opción AMD64 para Windows)

2- ejecutar la aplicación y iniciar sesión con cuenta personal o empresarial (yo la hice con la del DUOC)

3- ingresar a la dirección del contenedor, en mi caso esta ubicado ene esta dirección:  HouseCount\_Simulator\\Fase\_2\\Evidencias\_Proyecto\\HouseCountSimulatorDocker>
    Método más fácil: Ve a la carpeta HouseCountSimulatorDocker en tu explorador de archivos, haz clic derecho en un espacio en blanco y elige la opción "Abrir en terminal".

4- para saber si Docker se instalo de manera correcta en cmd ejecutar : Docker info (si sale errores, eso quiere decir que Docker no esta instalado / si lo instalaste , cierra la pestaña cmd de la dirección del carpeta y inténtalo nuevamente)

5- ejecutar lo siguiente : docker compose up -d --build (para la generación del contenedor) de manera automatica se prendera el contenedor

6- para prender el contenedor se use este comando : docker compose start / para apagarlo se utiliza : docker compose stop 

7- por ultimo si quieres ver en localhost los resultados, levantar en local host es de mediante : docker compose exec web python -m http.server 8000

8- listo por ahora. (ctrl + c para salir del localhost)

Extra:  si por casualidad se genera mejora en archivos internos de configuración del contenedor, se recomienda borrar lo pre-instalado mediante este comando: docker compose down y volver a instalar las dependencia de este modo: docker compose up -d --build (luego de eso repites el paso 5 hasta el 6) 

