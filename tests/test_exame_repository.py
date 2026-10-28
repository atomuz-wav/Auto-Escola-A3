import unittest
from repository.ExameRepository import ExameRepository

class test_exame_repository(unittest.TestCase):
    def setUp(self):
        self.repository = ExameRepository()

    def test_save(self):
        tipo = "teorica"
        data_exame = "20/09/2026"

        resultado = self.repository.save(tipo, data_exame)

        self.assertTrue(resultado)

    def test_save_erro(self):
            tipo = "olaaa"
            data_exame = "20/09/2026"
    
            resultado = self.repository.save(tipo, data_exame)
    
            self.assertFalse(resultado)

    def test_pegar_id(self):
        data_exame = "12/02/2026"

        resultado = self.repository.pegar_id(data_exame)

        self.assertTrue(len(resultado) > 0)

    def test_deletar_prova(self):
        id_exame = 14

        resultado = self.repository.deletar_prova(id_exame)

        self.assertTrue(resultado)

    def test_deletar_prova_erro(self):
            id_exame = "BBB"
    
            resultado = self.repository.deletar_prova(id_exame)
    
            self.assertFalse(resultado)

    def test_buscar_por_data(self):
        data = "12/02/2026"

        resultado = self.repository.buscar_por_data(data)

        self.assertTrue(len(resultado) > 0)

if __name__ == '__main__':
    unittest.main()