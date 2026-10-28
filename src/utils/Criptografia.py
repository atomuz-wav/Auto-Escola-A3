import bcrypt

class Criptografia:

    def cripto_senha(self, senha: str) -> str:
        if not senha == None:
            
            senha_bytes = senha.encode('utf-8')
            salt = bcrypt.gensalt()
            hash_senha = bcrypt.hashpw(senha_bytes, salt)

            return hash_senha.decode('utf-8')
        else:
            print("Erro!! Senha vazia")

    def verificar_senha_hash(self, senha_digitada: str, hash_salvo: str) -> bool:
        senha_bytes = senha_digitada.encode('utf-8')
        hash_bytes = hash_salvo.encode('utf-8')

        return bcrypt.checkpw(senha_bytes, hash_bytes)