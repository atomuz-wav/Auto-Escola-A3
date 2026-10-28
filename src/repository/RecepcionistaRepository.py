"""Modulo responsavel por fazer a manipulação da tabela Recepcionista no BD"""

from utils.Validador import Validador
from utils.Criptografia import Criptografia
from config.Database import Database

class RecepcionistaRepository:
    """Possui os metodos para a manipulação no BD"""

    cripto = Criptografia()
    validador = Validador()
    
    def salvar(self, cpf: str, nome: str, senha: str):
        """Salva um recepcionista no BD"""

        cpf_validado = self.validador.verificar_cpf(cpf)
        nome_validado = self.validador.verificar_nome(nome)
        senha_cripto = self.cripto.cripto_senha(senha)

        query = "Insert into recepcionista(CPF, nome, senha) values(%s, %s, %s)"
        values = (cpf_validado, nome_validado, senha_cripto)

        Database.cursor_execute_commit(query, values)
    
        print(f"Recepcionista: {nome} cadastrado com sucesso")

    def buscar_por_cpf(self ,cpf: str):

        cpf_validado = self.validador.verificar_cpf(cpf)
        
        query = "select * from recepcionista where CPF = %s"
        values = (cpf_validado,)
        resultado = Database.cursor_execute_fetchone(query, values)

        return resultado

    def login(self, cpf: str, senha: str) -> bool:
        
        query = "select senha from recepcionista where CPF = %s"
        values = (cpf,)
        busca = Database.cursor_execute_fetchone(query, values)
        
        if busca == None:
            return False
        
        senha_tupla = busca[0]

        resultado = self.cripto.verificar_senha_hash(senha, senha_tupla)

        return resultado