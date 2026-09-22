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