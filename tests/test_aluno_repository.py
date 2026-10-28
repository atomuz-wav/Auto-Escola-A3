import unittest
from repository.AlunoRepository import AlunoRepository

class test_aluno_repository(unittest.TestCase):
    def setUp(self):
        self.repository = AlunoRepository()

    def test_salvar(self):
        cpf = "12345678901"
        nome = "Teste aluno"
        instrutor_id = 3
        numero_cel = 55811234567

        resultado = self.repository.salvar(cpf, nome, instrutor_id, numero_cel)

        self.assertTrue(resultado)

    def test_salvar_erro(self):
            cpf = "12345678901"
            nome = "Teste aluno"
            instrutor_id = "aaa"
            numero_cel = 55811234567
    
            
            resultado = self.repository.salvar(cpf, nome, instrutor_id, numero_cel)
    
            self.assertFalse(resultado)

    def test_setar_aprovacao(self):
        aprovacao = "aprovado"
        id = 15

        try:
            self.repository.setar_aprovacao(aprovacao, id)
            sucesso = True
        except Exception:
            sucesso = False

        self.assertTrue(sucesso)

    def test_setar_aprovacao_erro(self):
        aprovacao = "paulo"
        id = "aaaaaa"

        resultado =  self.repository.setar_aprovacao(aprovacao, id)

        self.assertFalse(resultado)

    def test_pegar_exame(self):
        cpf ="12345678901"
        
        resultado = self.repository.pegar_exame(cpf)

        self.assertIsInstance(resultado, list)
        self.assertTrue(len(resultado) > 0)

    def test_pegar_exame_erro(self):
            cpf ="1234567"
            
            resultado = self.repository.pegar_exame(cpf)
    
            self.assertIsInstance(resultado, list)
            self.assertFalse(len(resultado) > 0)

    def test_pegar_numero(self):
        cpf ="12345678901"

        resultado = self.repository.pegar_numero(cpf)

        self.assertTrue(len(resultado) > 0)

    def test_pegar_nome_instrutor(self):
        cpf = "12345678901"

        resultado = self.repository.pegar_nome_instrutor(cpf)

        self.assertTrue(len(resultado) > 0)

    def test_setar_id_provas(self):
        quant_alunos = 1
        id_prova = 3

        resultado = self.repository.setar_id_provas(quant_alunos, id_prova)

        self.assertTrue(resultado)

    def test_setar_id_provas_erro(self):
            quant_alunos = 1
            id_prova = "aaaa"
    
            resultado = self.repository.setar_id_provas(quant_alunos, id_prova)
    
            self.assertFalse(resultado)

    def test_buscar_por_cpf(self):
        cpf = "12345678901"

        resultado = self.repository.buscar_por_cpf(cpf)

        self.assertTrue(len(resultado) > 0)
        
if __name__ == '__main__':
    unittest.main()