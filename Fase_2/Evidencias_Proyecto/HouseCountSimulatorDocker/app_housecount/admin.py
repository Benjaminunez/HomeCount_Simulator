from django.contrib import admin
from .models import ModeloCasa, Material, Habitacion, MaterialHabitacion

# Registra tus modelos aqui.

@admin.register(ModeloCasa)
class ModeloCasaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'metros_cuadrados', 'habitaciones', 'banos', 'precio')
    search_fields = ('nombre',)


#------- Modelos creados por milo -------
# no es necesario ocuparlo, lo dejare por mientras por si se nos hace mejor en un futuro

class MaterialHabitacionInline(admin.TabularInline):
    model = MaterialHabitacion
    extra = 1  
    autocomplete_fields = ['material'] 

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'coste_formateado', 'dimensiones', 'unidad_medida')
    search_fields = ('nombre',)
    list_filter = ('unidad_medida',)

    def coste_formateado(self, obj):
        return f"${obj.coste:,}".replace(",", ".")
    coste_formateado.short_description = "Coste (CLP)"

@admin.register(Habitacion)
class HabitacionAdmin(admin.ModelAdmin):
    list_display = ('nombre_modulo', 'dimensiones', 'coste_total_formateado')
    search_fields = ('nombre_modulo', 'descripcion')
    inlines = [MaterialHabitacionInline] 

    def coste_total_formateado(self, obj):
        return f"${obj.coste_total:,}".replace(",", ".")
    coste_total_formateado.short_description = "Coste Total Estimado"

@admin.register(MaterialHabitacion)
class MaterialHabitacionAdmin(admin.ModelAdmin):
    list_display = ('habitacion', 'material', 'cantidad', 'coste_subtotal_formateado')
    list_filter = ('habitacion',)
    search_fields = ('habitacion__nombre_modulo', 'material__nombre')

    def coste_subtotal_formateado(self, obj):
        return f"${obj.coste_subtotal:,}".replace(",", ".")
    coste_subtotal_formateado.short_description = "Subtotal"