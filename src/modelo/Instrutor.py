"""Classe base para o banco de dados"""

class Instrutor:

    def __init__(self, cpf = None, nome = None):
        self._cpf = cpf
        self._nome = nome