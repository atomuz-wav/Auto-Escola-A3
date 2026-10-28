"""Modulo responsavel por fazer a manipulação da tabela Instrutor no BD"""

from utils.Validador import Validador
from config.Database import Database

class InstrutorRepository:
    """Possui os metodos para a manipulação no BD"""

    validador = Validador()

    def salvar(self, cpf = None, nome = None):
        """Salva um instrutor no BD"""

        cpf_validado = self.validador.verificar_cpf(cpf)
        nome_validado = self.validador.verificar_nome(nome)

        query = "Insert into instrutor(CPF, nome) values(%s, %s)"
        values = (cpf_validado, nome_validado)
        Database.cursor_execute_commit(query, values)
        
        print(f"Instrutor: {nome} cadastrado com sucesso")


    def buscar_por_cpf(self, cpf = None):
        """Buscar instrutor por pcf"""

        query = "select * from instrutor where CPF = %s"
        value = (cpf,)
        resultado = Database.cursor_execute_fetchone(query, value)

        return resultado

    def pegar_alunos(self, cpf = None):
        """Buscar aluno de um instrutor"""

        query = "SELECT aluno.nome FROM aluno INNER JOIN instrutor ON aluno.instrutor_id = instrutor.id WHERE instrutor.CPF = %s"
        values = (cpf,)

        resultado = Database.cursor_execute_fetchall(query, values)

        if not resultado: 
            return False
        else:
            return resultado

    def completar_cadastro(self, cpf = None, telefone = None, categorias = None, status = None):
        """Preenche os campos que o salvar original nao recebe"""

        query = "update instrutor set telefone = %s, categorias = %s, status = %s where CPF = %s"
        Database.cursor_execute_commit(query, (telefone, categorias, status, cpf))

    def atualizar(self, cpf = None, nome = None, telefone = None, categorias = None, status = None):
        """Atualiza os dados de um instrutor (o CPF nao muda)"""

        query = "update instrutor set nome = %s, telefone = %s, categorias = %s, status = %s where CPF = %s"
        Database.cursor_execute_commit(query, (nome, telefone, categorias, status, cpf))

    def deletar(self, cpf = None):
        """Remove um instrutor: os alunos ficam sem instrutor e as aulas dele sao apagadas"""

        Database.cursor_execute_commit("update aluno set instrutor_id = NULL where instrutor_id = (select id from instrutor where CPF = %s)", (cpf,))
        Database.cursor_execute_commit("delete from aula where instrutor_id = (select id from instrutor where CPF = %s)", (cpf,))
        Database.cursor_execute_commit("delete from instrutor where CPF = %s", (cpf,))

    def listar_todos(self):
        """Lista todos os instrutores com a quantidade de alunos e de aulas"""

        query = ("select instrutor.id, instrutor.CPF, instrutor.nome, instrutor.telefone, instrutor.categorias, instrutor.status, "
                 "(select count(*) from aluno where aluno.instrutor_id = instrutor.id), "
                 "(select count(*) from aula where aula.instrutor_id = instrutor.id and aula.status <> 'Cancelada') "
                 "from instrutor order by instrutor.nome")
        resultado = Database.cursor_execute_fetchall(query, ())

        if not isinstance(resultado, list):
            return []

        chaves = ("id", "cpf", "nome", "telefone", "categorias", "status", "total_alunos", "total_aulas")
        return [dict(zip(chaves, linha)) for linha in resultado]
