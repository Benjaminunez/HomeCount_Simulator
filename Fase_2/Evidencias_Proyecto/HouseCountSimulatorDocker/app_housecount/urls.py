from django.urls import path
from . import views

urlpatterns = [
    path('', views.inicio, name='inicio'), #vista inicial de la pagina al iniciar con localhost (este queda como main)
    path('inicio.html', views.inicio, name='inicio_html'),
    path('contrucion.html', views.contrucion, name='contrucion'),
    path('casas_rapidas.html', views.casas_rapidas, name='casas_rapidas'),
    path('creacion_de_Casas.html', views.creacion_de_casas, name='creacion_de_casas'),
    path('casas_modelo_1.html', views.casas_modelo_1, name='casas_modelo_1'),
]