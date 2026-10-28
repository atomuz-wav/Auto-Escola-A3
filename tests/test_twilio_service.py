import unittest
from service.TwilioService import TwilioService

class test_twilio_service(unittest.TestCase):
    def setUp(self):
        self.service = TwilioService()

    def test_enviar_whatsapp(self):
        numero_destino = "558183194243"
        msg = "olaa, nino"

        resultado = self.service.enviar_whatsapp(numero_destino, msg)

        self.assertTrue(len(resultado) > 0)

if __name__ == '__main__':
    unittest.main()
