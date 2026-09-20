paso a paso para prender contenedor Docker de HouseCount



1- instalación de Docker desktop para Windows : https://www.docker.com/products/docker-desktop/ (elegir la opción AMD64 para Windows)



2- ejecutar la aplicación y iniciar sesión con cuenta personal o empresarial (yo la hice con la del DUOC)



3- ingresar a la dirección del contenedor, en mi caso esta ubicado ene esta dirección:  HouseCount\_Simulator\\Fase\_2\\Evidencias\_Proyecto\\HouseCountSimulatorDocker> (en caso que no puedas llegar a esta dirección, dentro de la carpeta : HouseCountSimulatorDocker con el mouse da click derecho y elige la opción "abrir en terminal" 



4- para saber si Docker se instalo de manera correcta en cmd ejecutar : Docker info (si sale errores, eso quiere decir que Docker no esta instalado / si lo instalaste , cierra la pestaña cmd de la dirección del carpeta y inténtalo nuevamente)



5- para prender el contenedor se use este comando : docker compose start / para apagarlo se utiliza : docker compose stop 



6- por ultimo si quieres ver en localhost los resultados, levantar en local host es de mediante : docker exec -it django\_app python -m http.server 8000



7- listo por ahora.



8- si por casualidad se genera mejora en archivos internos de configuración del contenedor, se recomienda borrar lo pre-instalado mediante este comando: docker compose down y volver a instalar las dependencia de este modo: docker compose up -d --build (luego de eso repites el paso 5 hasta el 6) 

