"""Arquivo Responsavel pelas diretrizes do Twilio"""

import os
import yaml
from twilio.rest import Client
from config.Database import Database

class TwilioService:
    """A classe possui todos os metodos para implementar a mensageria"""

    # No modo demo as mensagens nao sao enviadas, ficam guardadas aqui
    mensagens_simuladas = []

    def __init__(self):
        """Recebe o account_sid, auth_token e numero de origem do arquivo .yml"""

        # O modo demo so simula o envio, entao funciona mesmo sem o config.yml
        if Database.modo_demo():
            return

        pasta_service = os.path.dirname(os.path.abspath(__file__))
        caminho_config = os.path.abspath(os.path.join(pasta_service, "..", "config", "config.yml"))

        with open(caminho_config, "r", encoding="utf-8") as file:
            config = yaml.safe_load(file)

        self.account_sid = config["twilio"]["account_sid"]
        self.auth_token = config["twilio"]["auth_token"]
        self.from_number = config["twilio"]["from_number"]

        self.client = Client(self.account_sid, self.auth_token)

    def enviar_whatsapp(self, numero_destino: str, mensagem: str) -> str:
        """Recebe o numero do aluno e a mensagem que vai ser enviada"""

        if Database.modo_demo():
            TwilioService.mensagens_simuladas.append({"para": numero_destino, "mensagem": mensagem})
            print(f"[WHATSAPP SIMULADO] para {numero_destino}: {mensagem}")
            return "simulado"

        de = self.from_number if self.from_number.startswith("whatsapp:") else f"whatsapp:{self.from_number}"
        para = numero_destino if numero_destino.startswith("whatsapp:") else f"whatsapp:{numero_destino}"

        msg = self.client.messages.create(
            from_ = de,
            body = mensagem,
            to = para
        )
       
        return msg.sid