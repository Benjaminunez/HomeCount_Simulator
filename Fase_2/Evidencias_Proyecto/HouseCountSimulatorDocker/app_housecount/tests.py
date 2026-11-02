from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from .models import TutorialSimulador


class TutorialSimuladorTests(TestCase):
    def setUp(self):
        self.usuario = User.objects.create_user(username='tutorial', password='test-pass')

    def test_eleccion_persiste_por_cuenta(self):
        self.client.force_login(self.usuario)
        for estado in ('omitido', 'completado'):
            respuesta = self.client.post(reverse('estado_tutorial'), {'estado': estado}, content_type='application/json')
            self.assertEqual(respuesta.status_code, 200)
            self.assertEqual(TutorialSimulador.objects.get(usuario=self.usuario).estado, estado)
        self.assertContains(self.client.get(reverse('casas_modelo_1')), 'data-tutorial-visto="true"')
        self.client.force_login(User.objects.create_user(username='otro'))
        self.assertContains(self.client.get(reverse('casas_modelo_1')), 'data-tutorial-visto="false"')

    def test_visitante_no_crea_preferencia_de_cuenta(self):
        respuesta = self.client.post(reverse('estado_tutorial'), {'estado': 'omitido'}, content_type='application/json')
        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(TutorialSimulador.objects.exists())

    def test_rechaza_estados_invalidos_y_get(self):
        self.assertEqual(self.client.get(reverse('estado_tutorial')).status_code, 405)
        for datos in ('{', '[]', '{"estado":"otro"}'):
            self.assertEqual(self.client.post(reverse('estado_tutorial'), datos, content_type='application/json').status_code, 400)

    def test_requiere_csrf(self):
        from django.test import Client
        cliente = Client(enforce_csrf_checks=True)
        cliente.force_login(self.usuario)
        self.assertEqual(cliente.post(reverse('estado_tutorial'), {'estado': 'omitido'}, content_type='application/json').status_code, 403)
