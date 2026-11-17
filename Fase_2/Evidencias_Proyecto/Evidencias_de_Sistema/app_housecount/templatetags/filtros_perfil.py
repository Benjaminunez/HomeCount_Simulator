from django import template

# Registramos nuestra librería de filtros
register = template.Library()

@register.filter(name='quitar_barras')
def quitar_barras(valor):
    # Verifica que el valor sea texto y reemplaza la barra por espacio
    if isinstance(valor, str):
        return valor.replace('_', ' ')
    return valor