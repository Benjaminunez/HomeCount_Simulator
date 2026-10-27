from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Rutas principales con nombres limpios (sin extensiones .html expuestas) para mayor seguridad
    path('', views.inicio, name='inicio'),
    path('construccion/', views.contrucion, name='contrucion'),
    path('proyectos/casas-rapidas/', views.casas_rapidas, name='casas_rapidas'),
    path('proyectos/creacion-3d/', views.creacion_de_casas, name='creacion_de_casas'),
    path('casas/modelo-1/', views.casas_modelo_1, name='casas_modelo_1'),
    
    # APIs
    path('api/propiedades/', views.api_propiedades_unica, name='api_propiedades'),
    path('api/materiales-3d/', views.api_materiales_3d, name='api_materiales_3d'),
    path('api/guardar-diseno/', views.guardar_diseno, name='guardar_diseno'),
    path('api/obtener-disenos/', views.obtener_disenos, name='obtener_disenos'),
    path('api/eliminar-diseno/', views.eliminar_diseno, name='eliminar_diseno'),
    
    # Autenticación y Recuperación
    path('registro/', views.registro, name='registro'),
    path('login/', views.iniciar_sesion, name='login'),
    path('logout/', views.cerrar_sesion, name='logout'),
    path('recuperar-clave/', views.recuperar_clave_correo, name='recuperar_clave_correo'),
    path('recuperar-clave/codigo/', views.recuperar_clave_codigo, name='recuperar_clave_codigo'),
    path('recuperar-clave/nueva-clave/', views.recuperar_clave_nueva, name='recuperar_clave_nueva'),
    
    # Rutas de perfil y contacto
    path('mi-perfil/', views.editar_perfil, name='editar_perfil'),
    path('contacto/enviar/', views.enviar_contacto, name='enviar_contacto'),
]

# ESTO PERMITE VER LAS IMÁGENES SUBIDAS EN LOCALHOST
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)