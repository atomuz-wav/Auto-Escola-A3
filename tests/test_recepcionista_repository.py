import unittest
from repository.RecepcionistaRepository import RecepcionistaRepository

class test_recepcionista_repository(unittest.TestCase):
    def setUp(self):
        self.repository = RecepcionistaRepository()

    def test_salvar(self):
        cpf = "12345678901"
        nome = "Fabio"
        senha = "1234"

        resultado = self. repository.salvar(cpf, nome, senha)

        self.assertTrue(resultado)

if __name__ == '__main__':
    unittest.main()
