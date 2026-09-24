from django.db import models

class ModeloCasa(models.Model):
    nombre = models.CharField(max_length=100)
    metros_cuadrados = models.IntegerField(help_text="Superficie en m²")
    habitaciones = models.IntegerField()
    banos = models.IntegerField()
    descripcion = models.TextField()
    precio = models.BigIntegerField(help_text="Precio en CLP")
    imagen = models.ImageField(upload_to='modelos/', null=True, blank=True)

    class Meta:
        verbose_name = "Modelo de Casa"
        verbose_name_plural = "Modelos de Casas"

    def __str__(self):
        return self.nombre

    @property
    def precio_formateado(self):
        # Formatea el número con comas (11,500,000) y reemplaza las comas por puntos (11.500.000)
        return f"{self.precio:,}".replace(",", ".")

#------- DE AQUI PARA ABAJO ES EL CODIGO NUEVO QUE AGREGUE (MILO) -------
# no es necesario ocuparlo, lo dejare por mientras por si se nos hace mejor en un futuro

class Material(models.Model):  #MATERIALES INDIVIDUALES
    nombre = models.CharField(max_length=150, help_text="Ej: Cemento Polpaico 25kg, Plancha Volcanita 10mm")
    coste = models.BigIntegerField(help_text="Costo unitario del material en CLP")
    dimensiones = models.CharField(max_length=100, blank=True, null=True, help_text="Ej: 1.20m x 2.40m, 6 metros, etc.")
    unidad_medida = models.CharField(max_length=50, default="Unidad", help_text="Ej: Saco, Plancha, Tira, m²")
    archivo_3d = models.FileField(
        upload_to='modelos_3d/materiales/', 
        null=True, 
        blank=True, 
        help_text="Archivo .glb para el modelo 3D"
    )

    class Meta:
        verbose_name = "Material"
        verbose_name_plural = "Materiales"
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} - ${self.coste:,}".replace(",", ".")


class Habitacion(models.Model):  #DESCRIPCION MODULO DE HABITACION
    nombre_modulo = models.CharField(max_length=100, help_text="Ej: Dormitorio Principal, Baño Completo, Cocina")
    dimensiones = models.CharField(max_length=100, help_text="Ej: 3m x 4m (12 m²)")
    descripcion = models.TextField(blank=True, null=True)
    archivo_3d = models.FileField(
        upload_to='modelos_3d/habitaciones/', 
        null=True, 
        blank=True, 
        help_text="Archivo .glb para el módulo prefabricado"
    )
    
    # Relación Mucho a Muchos con Materiales a través de la tabla intermedia
    materiales = models.ManyToManyField(
        Material, 
        through='MaterialHabitacion',
        related_name='habitaciones',
        help_text="Materiales necesarios para construir esta habitación"
    )

    class Meta:
        verbose_name = "Módulo de Habitación"
        verbose_name_plural = "Módulos de Habitaciones"

    def __str__(self):
        return f"{self.nombre_modulo} ({self.dimensiones})"

    @property
    def coste_total(self):
        """Calcula automáticamente el costo total del módulo sumando sus materiales."""
        total = sum(item.coste_subtotal for item in self.detalles_materiales.all())
        return total


class MaterialHabitacion(models.Model):  #MATERIALES DE CADA HABITACION

    habitacion = models.ForeignKey(Habitacion, on_delete=models.CASCADE, related_name='detalles_materiales')
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='detalles_habitaciones')
    cantidad = models.PositiveIntegerField(default=1, help_text="Cantidad requerida de este material")

    class Meta:
        verbose_name = "Material de Habitación"
        verbose_name_plural = "Materiales de Habitaciones"
        unique_together = ('habitacion', 'material')

    def __str__(self):
        return f"{self.cantidad}x {self.material.nombre} para {self.habitacion.nombre_modulo}"

    @property
    def coste_subtotal(self):
        """Subtotal = Precio unitario del material * Cantidad"""
        return self.material.coste * self.cantidad