import unittest
from repository.InstrutorRepository import InstrutorRepository

class test_instrutor_repository(unittest.TestCase):
    def setUp(self):
        self.repository = InstrutorRepository()

    def test_salvar(self):
        cpf = "12345678901"
        nome = "Pedro"

        resultado = self.repository.salvar(cpf, nome)

        self.assertTrue(resultado)

    def test_buscar_por_cpf(self):
        cpf = "12345678901"

        resultado = self.repository.buscar_por_cpf(cpf)

        self.assertTrue(len(resultado) > 0)

    def test_pegar_alunos(self):
        cpf = "12345678901"

        resultado = self.repository.pegar_alunos(cpf)

        self.assertTrue(len(resultado) > 0)

if __name__ == '__main__':
    unittest.main()