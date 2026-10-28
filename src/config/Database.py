import os
import sqlite3
import yaml
import mysql.connector
from mysql.connector import Error

CAMINHO_DEMO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "database", "demo.db"))

class _CursorSQLite:
    """Adapta o cursor do SQLite para aceitar as queries no formato do MySQL (%s)"""

    def __init__(self, cursor):
        self._cursor = cursor

    def execute(self, query, values=()):
        self._cursor.execute(query.replace("%s", "?"), values)

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def close(self):
        self._cursor.close()

class _ConexaoSQLite:
    """Conexao usada no modo demonstracao, quando nao ha MySQL instalado"""

    def __init__(self, caminho):
        self._conexao = sqlite3.connect(caminho)
        self._conexao.execute("PRAGMA foreign_keys = ON")

    def is_connected(self):
        return True

    def cursor(self, dictionary = False):
        return _CursorSQLite(self._conexao.cursor())

    def commit(self):
        self._conexao.commit()

    def close(self):
        self._conexao.close()

class Database:

    @staticmethod
    def modo_demo() -> bool:
        """Modo demonstracao: usa SQLite (database/demo.db) no lugar do MySQL"""
        return os.environ.get("AUTOESCOLA_DEMO") == "1"

    @staticmethod
    def carregar_config():
        pasta_config = os.path.dirname(os.path.abspath(__file__))
        caminho_arquivo = os.path.join(pasta_config, "config.yml")
        
        with open(caminho_arquivo, "r", encoding="utf-8") as file:
            return yaml.safe_load(file)

    @staticmethod
    def conectar_DB():
        if Database.modo_demo():
            return _ConexaoSQLite(CAMINHO_DEMO)

        try:
            config = Database.carregar_config()["database"]

            conexao = mysql.connector.connect(
                host = config["host"],
                port = config["port"],
                username = config["username"],
                password = config["password"],
                database = config["name"],
            )

            if conexao.is_connected():
                print("Conexão realizada com sucesso")
                return conexao

        except Error as e:
            print(f"Ocorreu um erro ao tentar conectar com o banco de dados: {e}")
            return None
        except FileNotFoundError:
            print("Erro: o arquivo .yml não foi encontrado")
            return None

    @staticmethod
    def cursor_execute_commit(query: str, values: str) -> bool:
        conexao = Database.conectar_DB()
        if not conexao:
            return False
        else:
            try:
                cursor = conexao.cursor()
                cursor.execute(query, values)
                conexao.commit()
            except Exception as e:
                print(f"\n[ERRO DETALHADO DO BANCO]: {type(e).__name__} -> {e}\n")
            finally:
                cursor.close()
                conexao.close()
            return True

    @staticmethod
    def cursor_execute_fetchone(query: str, values: str):
        conexao = Database.conectar_DB()
        
        if not conexao:
            return False
        else:
            try:
                cursor = conexao.cursor()
                cursor.execute(query, values)
                resultado = cursor.fetchone()

                return resultado
            except Exception as e:
                print(f"\n[ERRO DETALHADO DO BANCO]: {type(e).__name__} -> {e}\n")
            finally:
                cursor.close()
                conexao.close()

    def cursor_execute_fetchall(query: str, values: str):
        conexao = Database.conectar_DB()
        if not conexao:
            return False
        else:
            try:
                cursor = conexao.cursor()
                cursor.execute(query, values)
                resultado = cursor.fetchall()

                return resultado
            except Exception:
                print("Não foi possivel resgatar os dados")
            finally:
                cursor.close()
                conexao.close()
            return True