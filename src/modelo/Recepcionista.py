"""Classe base para o banco de dados"""

class Recepcionista:

    def __init__(self, senha = None, nome = None, cpf = None):
        self._senha = senha
        self._nome = nome
        self._cpf = cpf