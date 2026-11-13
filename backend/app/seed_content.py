"""Conteúdo inicial do Crabjeu: fases × dificuldades × 6 perguntas.

Para adicionar conteúdo novo, inclua itens aqui e aumente CONTENT_VERSION:
os aparelhos baixam na próxima sincronização tudo o que tiver versão maior
do que a que já possuem.
"""

import uuid

CONTENT_VERSION = 2

# Mantido do protótipo anterior para que tentativas antigas continuem válidas.
LEGACY_MODULE_ID = "33333333-3333-3333-3333-333333333333"
LEGACY_ACTIVITY_ID = "44444444-4444-4444-4444-444444444444"

TRANSLATE_SENTENCE = "Qual a tradução da frase a seguir?"
TRANSLATE_WORD = "Qual a tradução da palavra a seguir?"
SPEAK = "Fale:"


def choice(question, options, correct, prompt=None, id=None):
    assert correct in options, f"Resposta '{correct}' não está nas opções"
    return {"kind": "choice", "question_text": question, "prompt": prompt,
            "options": options, "correct_answer": correct, "id": id}


def voice(phrase):
    return {"kind": "voice", "question_text": SPEAK, "prompt": phrase,
            "options": [], "correct_answer": phrase, "id": None}


MODULES = [
    {
        "id": LEGACY_MODULE_ID,
        "key": "saudacoes",
        "title": "Saudações",
        "description": "Primeiro contato com cumprimentos em francês.",
        "activities": {
            "facil": [
                choice('Como se diz "Bom dia" em francês?',
                       ["Bonsoir", "Bonjour", "Merci", "Salut"], "Bonjour", id=LEGACY_ACTIVITY_ID),
                choice(TRANSLATE_WORD, ["Obrigado", "Por favor", "Desculpe", "Tchau"], "Obrigado", prompt="Merci"),
                voice("Bonjour"),
                choice(TRANSLATE_WORD, ["Oi", "Boa noite", "Obrigado", "Até logo"], "Oi", prompt="Salut"),
                choice('Como se diz "Tchau" em francês?', ["Au revoir", "Bonjour", "Merci", "Oui"], "Au revoir"),
                voice("Merci"),
            ],
            "medio": [
                choice(TRANSLATE_SENTENCE,
                       ["Boa noite, senhor", "Boa noite", "Boa noite, mestre", "Bom dia, princesa"],
                       "Bom dia, princesa", prompt="Bonjour princesse"),
                choice(TRANSLATE_SENTENCE,
                       ["Como vai?", "Qual é o seu nome?", "Onde você mora?", "Quantos anos você tem?"],
                       "Como vai?", prompt="Comment ça va ?"),
                voice("Bonjour princesse"),
                choice(TRANSLATE_SENTENCE,
                       ["Estou bem, obrigado.", "Estou com fome.", "Até amanhã.", "Muito prazer."],
                       "Estou bem, obrigado.", prompt="Ça va bien, merci."),
                choice('Como se diz "Até amanhã" em francês?',
                       ["À demain", "À bientôt", "Bonne nuit", "Au revoir"], "À demain"),
                voice("Comment ça va ?"),
            ],
            "dificil": [
                choice(TRANSLATE_SENTENCE,
                       ["Meu nome é Ana.", "Eu chamo a Ana.", "Ana me chamou.", "Eu sou da Ana."],
                       "Meu nome é Ana.", prompt="Je m'appelle Ana."),
                choice('Como se diz "Muito prazer" em francês?',
                       ["Enchanté", "Excusez-moi", "S'il vous plaît", "De rien"], "Enchanté"),
                voice("Je m'appelle Ana"),
                choice(TRANSLATE_SENTENCE,
                       ["Boa noite, até amanhã!", "Bom dia, até logo!", "Boa tarde, até mais!", "Boa noite, até já!"],
                       "Boa noite, até amanhã!", prompt="Bonne nuit, à demain !"),
                choice('Complete para perguntar "Qual é o seu nome?"',
                       ["appelles", "appelle", "appelez", "appeler"], "appelles", prompt="Comment tu t'___ ?"),
                voice("Enchanté, je m'appelle Ana"),
            ],
        },
    },
    {
        "id": None,
        "key": "numeros-cores",
        "title": "Números e cores",
        "description": "Contar e falar as cores em francês.",
        "activities": {
            "facil": [
                choice(TRANSLATE_WORD, ["Um", "Dois", "Três", "Dez"], "Um", prompt="Un"),
                choice('Como se diz "três" em francês?', ["Trois", "Deux", "Quatre", "Treize"], "Trois"),
                voice("Deux"),
                choice(TRANSLATE_WORD, ["Vermelho", "Azul", "Verde", "Amarelo"], "Vermelho", prompt="Rouge"),
                choice('Como se diz "azul" em francês?', ["Bleu", "Blanc", "Noir", "Vert"], "Bleu"),
                voice("Rouge"),
            ],
            "medio": [
                choice(TRANSLATE_WORD, ["Dez", "Dois", "Doze", "Seis"], "Dez", prompt="Dix"),
                choice('Como se diz "cinco" em francês?', ["Cinq", "Six", "Sept", "Quinze"], "Cinq"),
                voice("Cinq"),
                choice(TRANSLATE_SENTENCE,
                       ["O gato preto", "O cachorro preto", "O gato branco", "O carro preto"],
                       "O gato preto", prompt="Le chat noir"),
                choice('Como se diz "amarelo" em francês?', ["Jaune", "Vert", "Gris", "Rose"], "Jaune"),
                voice("Le chat noir"),
            ],
            "dificil": [
                choice(TRANSLATE_SENTENCE,
                       ["Eu tenho doze anos.", "Eu tenho dois anos.", "São doze horas.", "Eu tenho dez anos."],
                       "Eu tenho doze anos.", prompt="J'ai douze ans."),
                choice('Como se diz "vinte" em francês?', ["Vingt", "Vent", "Douze", "Seize"], "Vingt"),
                voice("J'ai douze ans"),
                choice(TRANSLATE_SENTENCE,
                       ["O mar é azul.", "A mãe é azul.", "O céu é azul.", "O mar é verde."],
                       "O mar é azul.", prompt="La mer est bleue."),
                choice('Complete: "As flores são vermelhas"',
                       ["rouges", "rouge", "rougeur", "rouger"], "rouges", prompt="Les fleurs sont ___"),
                voice("La mer est bleue"),
            ],
        },
    },
]

_NAMESPACE = uuid.UUID("6f1c3c1e-8a3b-4b8e-9c55-2f0d1b7a9e01")


def stable_id(*parts: str) -> str:
    return str(uuid.uuid5(_NAMESPACE, "/".join(parts)))


def iter_content():
    """Gera (module_dict, [activity_dict, ...]) com IDs estáveis."""
    for order, module in enumerate(MODULES, 1):
        module_id = module["id"] or stable_id(module["key"])
        mod = {
            "id": module_id,
            "title": module["title"],
            "description": module["description"],
            "order_index": order,
            "version": CONTENT_VERSION,
        }
        acts = []
        for difficulty, items in module["activities"].items():
            for idx, item in enumerate(items, 1):
                acts.append({
                    "id": item["id"] or stable_id(module["key"], difficulty, str(idx)),
                    "module_id": module_id,
                    "kind": item["kind"],
                    "difficulty": difficulty,
                    "order_index": idx,
                    "question_text": item["question_text"],
                    "prompt": item["prompt"],
                    "options": item["options"],
                    "correct_answer": item["correct_answer"],
                    "version": CONTENT_VERSION,
                })
        yield mod, acts
