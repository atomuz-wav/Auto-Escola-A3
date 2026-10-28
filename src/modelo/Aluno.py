"""Classe base para o banco de dados"""

class Aluno:

    def __init__(self, cpf = None, aprovado = False, nome = None, id_instru = 0, numero_cel = None):
        self._cpf = cpf
        self._aprovado = aprovado
        self._nome = nome
        self._id_instrutor = id_instru
        self._numero_cel = numero_cel