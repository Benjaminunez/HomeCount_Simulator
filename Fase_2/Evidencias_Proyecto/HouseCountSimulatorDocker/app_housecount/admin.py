from django.contrib import admin
from .models import ModeloCasa

# Registra tus modelos aqui.

@admin.register(ModeloCasa)
class ModeloCasaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'metros_cuadrados', 'habitaciones', 'banos', 'precio')
    search_fields = ('nombre',)