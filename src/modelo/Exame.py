"""Classe base para o banco de dados"""

class Exame:

    def __init__(self, tipo = None, data = None):
        self._tipo = tipo
        self._data = data