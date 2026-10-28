class Validador:
    
    def verificar_nome(self, nome_aluno: str):
        if nome_aluno and nome_aluno.replace(" ", "").isalpha():
            return nome_aluno
        else:
            return print("Nome não pode conter numeros")
    
    def verificar_cpf(self, aluno_cpf: str):
        if aluno_cpf.isnumeric() and self.cpf_valido(aluno_cpf):
            return aluno_cpf
        else:
            return print("cpf não pode conter letras")

    def verificar_numero(self, numero_cel: str):
        if numero_cel.isnumeric():
            return numero_cel
        else:
            return print("numero celular não pode conter letras")

    def somente_digitos(self, texto):
        """remove tudo que nao for numero"""

        resultado = ""

        for caractere in texto:

            if caractere.isdigit():
                resultado = resultado + caractere

        return resultado

    def cpf_valido(self, cpf):
        """verifica se o CPF tem 11 numeros"""

        cpf = self.somente_digitos(cpf)

        if len(cpf) !=11:
            return False
        #verifica se todos os numeros sao iguais
        elif cpf == cpf[0] * 11:
            return False

        return True

    def pedir_cpf(self):
        """Pede o CPF"""

        while True:

            cpf_digitado = input('Digite o CPF: ')

            cpf = self.somente_digitos(cpf_digitado)

            if self.cpf_valido(cpf):
                return cpf

            print('CPF invalido. Tente Novamente.')