"""Banco de perguntas do Crabjeu, organizado por tema e dificuldade.

Cada tema tem perguntas fáceis, médias e difíceis. O aluno não escolhe a
dificuldade: o jogo monta cada rodada a partir do nível dele
(veja TIERS em game_rules.py).

Há dois jeitos de escrever conteúdo aqui:
- perguntas escritas à mão em "activities" (as 36 originais ficam assim,
  com os mesmos IDs, para que tentativas antigas continuem valendo);
- listas de vocabulário e frases ("words", "medio", "dificil", "blanks"),
  das quais as perguntas são geradas automaticamente (veja generate()).

Para publicar conteúdo novo, inclua itens aqui e aumente CONTENT_VERSION:
os aparelhos baixam na próxima sincronização tudo o que tiver versão maior
do que a que já possuem.
"""

import random
import uuid

CONTENT_VERSION = 4

# Mantido do protótipo anterior para que tentativas antigas continuem válidas.
LEGACY_MODULE_ID = "33333333-3333-3333-3333-333333333333"
LEGACY_ACTIVITY_ID = "44444444-4444-4444-4444-444444444444"

TRANSLATE_SENTENCE = "Qual a tradução da frase a seguir?"
TRANSLATE_WORD = "Qual a tradução da palavra a seguir?"
SPEAK = "Fale:"
TRANSLATE_TO_FR = "Qual é a frase em francês?"
LISTEN = "Ouça e escolha o que significa"


def choice(question, options, correct, prompt=None, id=None):
    assert correct in options, f"Resposta '{correct}' não está nas opções"
    return {"kind": "choice", "question_text": question, "prompt": prompt,
            "options": options, "correct_answer": correct, "id": id}


def listen(phrase, options, correct):
    """O aparelho fala a frase em francês (sem mostrar o texto); o aluno escolhe a tradução."""
    assert correct in options, f"Resposta '{correct}' não está nas opções"
    return {"kind": "listen", "question_text": LISTEN, "prompt": phrase,
            "options": options, "correct_answer": correct, "id": None}


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

# ---------------------------------------------------------------------------
# Vocabulário e frases. Cada item é (francês, português).
#   words   -> fácil: traduzir a palavra; médio: dizer a palavra em francês;
#              as 3 primeiras viram perguntas de voz (fácil).
#   medio   -> frases curtas: traduzir; as 2 primeiras viram voz (médio).
#   dificil -> frases longas: traduzir nos dois sentidos; 2 primeiras viram voz.
#   blanks  -> completar a frase (difícil): (enunciado, frase com ___, opções, certa).
# ---------------------------------------------------------------------------

EXTRA_FOR_ORIGINAL_MODULES = {
    "saudacoes": {
        "words": [
            ("Bonsoir", "Boa noite"),
            ("Oui", "Sim"),
            ("Non", "Não"),
            ("S'il te plaît", "Por favor"),
            ("Pardon", "Desculpe"),
            ("De rien", "De nada"),
            ("À bientôt", "Até logo"),
            ("Madame", "Senhora"),
            ("Monsieur", "Senhor"),
            ("Un ami", "Um amigo"),
        ],
        "medio": [
            ("Bonne journée !", "Tenha um bom dia!"),
            ("Bienvenue !", "Bem-vindo!"),
            ("Merci beaucoup.", "Muito obrigado."),
            ("Excusez-moi.", "Com licença."),
            ("Et toi ?", "E você?"),
        ],
        "dificil": [
            ("Comment tu t'appelles ?", "Como você se chama?"),
            ("J'habite à Recife.", "Eu moro em Recife."),
            ("Tu as quel âge ?", "Quantos anos você tem?"),
            ("Je viens du Brésil.", "Eu venho do Brasil."),
            ("Je parle portugais.", "Eu falo português."),
        ],
        "blanks": [
            ('Complete: "Eu moro em Recife"', "J'___ à Recife.", ["habite", "habites", "habitons", "habiter"], "habite"),
            ('Complete: "Como vai você?"', "Comment ___ va ?", ["ça", "sa", "se", "ce"], "ça"),
            ('Complete: "Eu venho do Brasil"', "Je viens ___ Brésil.", ["du", "de la", "des", "à"], "du"),
        ],
    },
    "numeros-cores": {
        "words": [
            ("Quatre", "Quatro"),
            ("Six", "Seis"),
            ("Sept", "Sete"),
            ("Huit", "Oito"),
            ("Neuf", "Nove"),
            ("Vert", "Verde"),
            ("Blanc", "Branco"),
            ("Noir", "Preto"),
            ("Rose", "Rosa"),
            ("Violet", "Roxo"),
        ],
        "medio": [
            ("J'ai sept ans.", "Eu tenho sete anos."),
            ("La fleur est rose.", "A flor é rosa."),
            ("Un, deux, trois !", "Um, dois, três!"),
            ("Le ciel est bleu.", "O céu é azul."),
            ("J'ai quatre crayons.", "Eu tenho quatro lápis."),
        ],
        "dificil": [
            ("Ma couleur préférée est le vert.", "Minha cor favorita é o verde."),
            ("Il y a quinze élèves dans la classe.", "Há quinze alunos na sala."),
            ("Le drapeau du Brésil est vert et jaune.", "A bandeira do Brasil é verde e amarela."),
            ("Mon frère a neuf ans.", "Meu irmão tem nove anos."),
            ("J'ai trois chats noirs.", "Eu tenho três gatos pretos."),
        ],
        "blanks": [
            ("Qual número vem depois?", "huit, neuf, ___", ["dix", "onze", "sept", "douze"], "dix"),
            ('Complete: "As casas brancas"', "Les maisons ___", ["blanches", "blanc", "blancs", "blanche"], "blanches"),
            ('Complete: "Os carros verdes"', "Les voitures ___", ["vertes", "vert", "verte", "verts"], "vertes"),
        ],
    },
}

NEW_THEMES = [
    {
        "key": "familia",
        "title": "Família",
        "description": "Falar sobre as pessoas da sua família.",
        "words": [
            ("La mère", "A mãe"),
            ("Le père", "O pai"),
            ("Le frère", "O irmão"),
            ("La sœur", "A irmã"),
            ("La grand-mère", "A avó"),
            ("Le grand-père", "O avô"),
            ("Le bébé", "O bebê"),
            ("L'oncle", "O tio"),
            ("La tante", "A tia"),
            ("La famille", "A família"),
        ],
        "medio": [
            ("Voici ma mère.", "Esta é a minha mãe."),
            ("J'ai un frère.", "Eu tenho um irmão."),
            ("Mon père est grand.", "Meu pai é alto."),
            ("Ma sœur s'appelle Léa.", "Minha irmã se chama Léa."),
            ("J'aime ma famille.", "Eu amo a minha família."),
        ],
        "dificil": [
            ("Ma grand-mère habite à Recife.", "Minha avó mora em Recife."),
            ("Mon oncle a deux enfants.", "Meu tio tem dois filhos."),
            ("Nous sommes cinq dans ma famille.", "Somos cinco na minha família."),
            ("Mon frère est plus petit que moi.", "Meu irmão é menor do que eu."),
            ("Ma tante fait un gâteau.", "Minha tia faz um bolo."),
        ],
        "blanks": [
            ('Complete: "Minha mãe"', "___ mère", ["Ma", "Mon", "Mes", "Me"], "Ma"),
            ('Complete: "Meu pai"', "___ père", ["Mon", "Ma", "Mes", "Moi"], "Mon"),
            ('Complete: "Eu tenho dois irmãos"', "J'ai deux ___", ["frères", "frère", "sœurs", "pères"], "frères"),
        ],
    },
    {
        "key": "animais",
        "title": "Animais",
        "description": "Os bichos da casa, da fazenda e do mangue.",
        "words": [
            ("Le chien", "O cachorro"),
            ("Le chat", "O gato"),
            ("Le crabe", "O caranguejo"),
            ("L'oiseau", "O pássaro"),
            ("Le poisson", "O peixe"),
            ("Le cheval", "O cavalo"),
            ("La vache", "A vaca"),
            ("Le lapin", "O coelho"),
            ("La souris", "O rato"),
            ("Le singe", "O macaco"),
        ],
        "medio": [
            ("Le chien est petit.", "O cachorro é pequeno."),
            ("J'ai un chat.", "Eu tenho um gato."),
            ("Le poisson nage.", "O peixe nada."),
            ("L'oiseau chante.", "O pássaro canta."),
            ("Le crabe est rouge.", "O caranguejo é vermelho."),
        ],
        "dificil": [
            ("Le crabe marche sur le sable.", "O caranguejo anda na areia."),
            ("Mon chat dort sur le lit.", "Meu gato dorme na cama."),
            ("Les singes mangent des bananes.", "Os macacos comem bananas."),
            ("Le cheval court très vite.", "O cavalo corre muito rápido."),
            ("Il y a des poissons dans la mer.", "Há peixes no mar."),
        ],
        "blanks": [
            ('Complete: "Os gatos"', "Les ___", ["chats", "chat", "chiens", "chatte"], "chats"),
            ('Complete: "O caranguejo anda"', "Le crabe ___", ["marche", "marcher", "marches", "marchons"], "marche"),
            ('Complete: "Os cavalos"', "Les ___", ["chevaux", "chevals", "cheval", "chevaus"], "chevaux"),
        ],
    },
    {
        "key": "comida",
        "title": "Comida e bebida",
        "description": "Pedir, comer e beber em francês.",
        "words": [
            ("Le pain", "O pão"),
            ("L'eau", "A água"),
            ("Le lait", "O leite"),
            ("Le fromage", "O queijo"),
            ("La pomme", "A maçã"),
            ("La banane", "A banana"),
            ("Le riz", "O arroz"),
            ("Le poulet", "O frango"),
            ("Le gâteau", "O bolo"),
            ("Le jus", "O suco"),
        ],
        "medio": [
            ("J'ai faim.", "Eu estou com fome."),
            ("J'ai soif.", "Eu estou com sede."),
            ("Je mange du pain.", "Eu como pão."),
            ("Je bois de l'eau.", "Eu bebo água."),
            ("C'est délicieux !", "Está delicioso!"),
        ],
        "dificil": [
            ("Je voudrais un jus d'orange, s'il vous plaît.", "Eu gostaria de um suco de laranja, por favor."),
            ("Nous mangeons du riz et du poulet.", "Nós comemos arroz e frango."),
            ("Ma mère prépare le dîner.", "Minha mãe prepara o jantar."),
            ("Je n'aime pas le fromage.", "Eu não gosto de queijo."),
            ("Le petit-déjeuner est prêt.", "O café da manhã está pronto."),
        ],
        "blanks": [
            ('Complete: "Eu como pão"', "Je mange ___ pain.", ["du", "de la", "des", "à"], "du"),
            ('Complete: "Eu bebo água"', "Je bois ___ eau.", ["de l'", "du", "des", "de la"], "de l'"),
            ('Complete: "Eu não gosto de queijo"', "Je n'aime ___ le fromage.", ["pas", "non", "ne", "pa"], "pas"),
        ],
    },
    {
        "key": "corpo",
        "title": "Corpo",
        "description": "As partes do corpo e como você se sente.",
        "words": [
            ("La tête", "A cabeça"),
            ("La main", "A mão"),
            ("Le pied", "O pé"),
            ("L'œil", "O olho"),
            ("La bouche", "A boca"),
            ("Le nez", "O nariz"),
            ("L'oreille", "A orelha"),
            ("Le bras", "O braço"),
            ("La jambe", "A perna"),
            ("Les cheveux", "O cabelo"),
        ],
        "medio": [
            ("J'ai mal à la tête.", "Estou com dor de cabeça."),
            ("Lave tes mains.", "Lave as mãos."),
            ("Ouvre la bouche.", "Abra a boca."),
            ("J'ai deux yeux.", "Eu tenho dois olhos."),
            ("Mes cheveux sont noirs.", "Meu cabelo é preto."),
        ],
        "dificil": [
            ("Je me brosse les dents tous les jours.", "Eu escovo os dentes todos os dias."),
            ("Il a les yeux bleus.", "Ele tem olhos azuis."),
            ("Elle lève la main pour parler.", "Ela levanta a mão para falar."),
            ("J'ai mal au pied droit.", "Estou com dor no pé direito."),
            ("Touche ton nez avec ton doigt.", "Toque o nariz com o dedo."),
        ],
        "blanks": [
            ('Complete: "Um olho, dois olhos"', "Un œil, deux ___", ["yeux", "œils", "œil", "yeus"], "yeux"),
            ('Complete: "Estou com dor de cabeça"', "J'ai mal ___ tête.", ["à la", "au", "aux", "à le"], "à la"),
            ('Complete: "Estou com dor no pé"', "J'ai mal ___ pied.", ["au", "à la", "à le", "aux"], "au"),
        ],
    },
    {
        "key": "escola",
        "title": "Escola",
        "description": "Materiais e frases da sala de aula.",
        "words": [
            ("L'école", "A escola"),
            ("Le livre", "O livro"),
            ("Le cahier", "O caderno"),
            ("Le stylo", "A caneta"),
            ("Le crayon", "O lápis"),
            ("La table", "A mesa"),
            ("Le professeur", "O professor"),
            ("L'élève", "O aluno"),
            ("La classe", "A sala de aula"),
            ("La gomme", "A borracha"),
        ],
        "medio": [
            ("J'aime l'école.", "Eu gosto da escola."),
            ("Ouvrez vos livres.", "Abram os livros."),
            ("Le professeur parle.", "O professor fala."),
            ("J'ai un crayon.", "Eu tenho um lápis."),
            ("Écoutez, s'il vous plaît.", "Escutem, por favor."),
        ],
        "dificil": [
            ("Je fais mes devoirs après l'école.", "Eu faço meu dever de casa depois da escola."),
            ("Le livre est sur la table.", "O livro está em cima da mesa."),
            ("Est-ce que je peux aller aux toilettes ?", "Posso ir ao banheiro?"),
            ("Nous apprenons le français.", "Nós aprendemos francês."),
            ("Je ne comprends pas.", "Eu não entendo."),
        ],
        "blanks": [
            ('Complete: "Nós aprendemos francês"', "Nous ___ le français.", ["apprenons", "apprend", "apprenez", "apprendre"], "apprenons"),
            ('Complete: "O livro está em cima da mesa"', "Le livre est ___ la table.", ["sur", "sous", "dans", "avec"], "sur"),
            ('Complete: "Eu tenho um caderno"', "J'ai ___ cahier.", ["un", "une", "des", "la"], "un"),
        ],
    },
    {
        "key": "casa",
        "title": "Casa",
        "description": "Os cômodos e as coisas de casa.",
        "words": [
            ("La maison", "A casa"),
            ("La porte", "A porta"),
            ("La fenêtre", "A janela"),
            ("La cuisine", "A cozinha"),
            ("La chambre", "O quarto"),
            ("Le lit", "A cama"),
            ("La chaise", "A cadeira"),
            ("La salle de bain", "O banheiro"),
            ("Le jardin", "O jardim"),
            ("La clé", "A chave"),
        ],
        "medio": [
            ("C'est ma maison.", "Esta é a minha casa."),
            ("Ferme la porte.", "Feche a porta."),
            ("Ouvre la fenêtre.", "Abra a janela."),
            ("Je suis dans ma chambre.", "Eu estou no meu quarto."),
            ("Le chat est dans le jardin.", "O gato está no jardim."),
        ],
        "dificil": [
            ("Ma maison a trois chambres.", "Minha casa tem três quartos."),
            ("Je dors dans mon lit.", "Eu durmo na minha cama."),
            ("La cuisine est à côté du salon.", "A cozinha fica ao lado da sala."),
            ("Où est la clé ?", "Onde está a chave?"),
            ("Il y a une chaise sous la fenêtre.", "Há uma cadeira debaixo da janela."),
        ],
        "blanks": [
            ('Complete: "A cadeira está debaixo da mesa"', "La chaise est ___ la table.", ["sous", "sur", "dans", "entre"], "sous"),
            ('Complete: "Onde está a chave?"', "___ est la clé ?", ["Où", "Qui", "Quand", "Quoi"], "Où"),
            ('Complete: "Minha casa"', "___ maison", ["Ma", "Mon", "Mes", "Me"], "Ma"),
        ],
    },
    {
        "key": "natureza",
        "title": "Tempo e natureza",
        "description": "O clima, o mar, o mangue e o céu.",
        "words": [
            ("Le soleil", "O sol"),
            ("La pluie", "A chuva"),
            ("La mer", "O mar"),
            ("La plage", "A praia"),
            ("L'arbre", "A árvore"),
            ("La fleur", "A flor"),
            ("Le ciel", "O céu"),
            ("La lune", "A lua"),
            ("L'étoile", "A estrela"),
            ("Le vent", "O vento"),
        ],
        "medio": [
            ("Il fait chaud.", "Está calor."),
            ("Il fait froid.", "Está frio."),
            ("Il pleut.", "Está chovendo."),
            ("La mer est belle.", "O mar é bonito."),
            ("J'aime la plage.", "Eu gosto da praia."),
        ],
        "dificil": [
            ("Aujourd'hui, il fait beau à Recife.", "Hoje o tempo está bonito em Recife."),
            ("La mangrove est pleine de crabes.", "O mangue está cheio de caranguejos."),
            ("La nuit, on voit la lune et les étoiles.", "À noite, vemos a lua e as estrelas."),
            ("Il y a beaucoup d'arbres dans le parc.", "Há muitas árvores no parque."),
            ("Demain, il va pleuvoir.", "Amanhã vai chover."),
        ],
        "blanks": [
            ('Complete: "Está calor"', "Il ___ chaud.", ["fait", "est", "a", "va"], "fait"),
            ('Complete: "Está chovendo"', "Il ___.", ["pleut", "pleuvoir", "pluie", "pleure"], "pleut"),
            ('Complete: "As flores"', "Les ___", ["fleurs", "fleur", "fleures", "fleurent"], "fleurs"),
        ],
    },
    {
        "key": "dias-horas",
        "title": "Dias e horas",
        "description": "Os dias da semana e as horas.",
        "words": [
            ("Lundi", "Segunda-feira"),
            ("Mardi", "Terça-feira"),
            ("Mercredi", "Quarta-feira"),
            ("Jeudi", "Quinta-feira"),
            ("Vendredi", "Sexta-feira"),
            ("Samedi", "Sábado"),
            ("Dimanche", "Domingo"),
            ("Aujourd'hui", "Hoje"),
            ("Demain", "Amanhã"),
            ("Hier", "Ontem"),
        ],
        "medio": [
            ("Quel jour sommes-nous ?", "Que dia é hoje?"),
            ("Aujourd'hui, c'est lundi.", "Hoje é segunda-feira."),
            ("Le week-end, je joue.", "No fim de semana, eu brinco."),
            ("Il est midi.", "É meio-dia."),
            ("À samedi !", "Até sábado!"),
        ],
        "dificil": [
            ("Quelle heure est-il ?", "Que horas são?"),
            ("Il est huit heures du matin.", "São oito horas da manhã."),
            ("Samedi, je vais à la plage.", "No sábado, eu vou à praia."),
            ("Hier, j'ai joué au football.", "Ontem, eu joguei futebol."),
            ("Le dimanche, nous mangeons en famille.", "Aos domingos, nós comemos em família."),
        ],
        "blanks": [
            ('Complete: "Que horas são?"', "Quelle ___ est-il ?", ["heure", "jour", "temps", "âge"], "heure"),
            ("Qual dia vem no meio?", "lundi, ___, mercredi", ["mardi", "jeudi", "samedi", "dimanche"], "mardi"),
            ('Complete: "Ontem, eu joguei"', "___, j'ai joué.", ["Hier", "Demain", "Aujourd'hui", "Bientôt"], "Hier"),
        ],
    },
    {
        "key": "acoes",
        "title": "Ações do dia a dia",
        "description": "Verbos para contar o que você faz.",
        "words": [
            ("Manger", "Comer"),
            ("Boire", "Beber"),
            ("Dormir", "Dormir"),
            ("Jouer", "Brincar"),
            ("Courir", "Correr"),
            ("Chanter", "Cantar"),
            ("Danser", "Dançar"),
            ("Lire", "Ler"),
            ("Écrire", "Escrever"),
            ("Parler", "Falar"),
        ],
        "medio": [
            ("Je joue au ballon.", "Eu jogo bola."),
            ("Tu chantes bien.", "Você canta bem."),
            ("Il lit un livre.", "Ele lê um livro."),
            ("Nous dansons.", "Nós dançamos."),
            ("Elle court vite.", "Ela corre rápido."),
        ],
        "dificil": [
            ("Je parle un peu français.", "Eu falo um pouco de francês."),
            ("Vous écrivez une lettre.", "Vocês escrevem uma carta."),
            ("Ils jouent dans la rue.", "Eles brincam na rua."),
            ("Je vais dormir tôt ce soir.", "Eu vou dormir cedo hoje à noite."),
            ("Qu'est-ce que tu aimes faire ?", "O que você gosta de fazer?"),
        ],
        "blanks": [
            ('Complete: "Eu falo"', "Je ___", ["parle", "parles", "parlons", "parlez"], "parle"),
            ('Complete: "Nós cantamos"', "Nous ___", ["chantons", "chante", "chantez", "chantent"], "chantons"),
            ('Complete: "Eles brincam"', "Ils ___", ["jouent", "joue", "jouons", "jouez"], "jouent"),
        ],
    },
    {
        "key": "sentimentos",
        "title": "Sentimentos",
        "description": "Dizer como você está e o que sente.",
        "words": [
            ("Heureux", "Feliz"),
            ("Triste", "Triste"),
            ("Fatigué", "Cansado"),
            ("Malade", "Doente"),
            ("Calme", "Calmo"),
            ("Timide", "Tímido"),
            ("Fort", "Forte"),
            ("La peur", "O medo"),
            ("L'amour", "O amor"),
            ("Content", "Contente"),
        ],
        "medio": [
            ("Je suis content.", "Eu estou contente."),
            ("Tu es triste ?", "Você está triste?"),
            ("J'ai peur.", "Eu estou com medo."),
            ("Je suis fatigué.", "Eu estou cansado."),
            ("Elle est gentille.", "Ela é gentil."),
        ],
        "dificil": [
            ("Je suis heureux de te voir.", "Estou feliz em te ver."),
            ("Mon ami est malade aujourd'hui.", "Meu amigo está doente hoje."),
            ("Pourquoi tu pleures ?", "Por que você está chorando?"),
            ("Ne t'inquiète pas !", "Não se preocupe!"),
            ("Je t'aime beaucoup.", "Eu gosto muito de você."),
        ],
        "blanks": [
            ('Complete: "Ela é gentil"', "Elle est ___", ["gentille", "gentil", "gentils", "gentilles"], "gentille"),
            ('Complete: "Eu estou com medo"', "J'___ peur.", ["ai", "suis", "es", "as"], "ai"),
            ('Complete: "Eu estou cansado"', "Je ___ fatigué.", ["suis", "ai", "es", "est"], "suis"),
        ],
    },
]


# ---------------------------------------------------------------------------
# Ampliação do banco (versão 4): mais vocabulário em todos os temas e 4 temas novos.
# ---------------------------------------------------------------------------

MORE = {
    "saudacoes": {
        "words": [("Une amie", "Uma amiga"), ("Mademoiselle", "Senhorita"), ("Enchanté", "Muito prazer"), ("Ça va ?", "Tudo bem?")],
        "medio": [("Je vais bien.", "Eu estou bem."), ("À plus tard !", "Até mais tarde!"), ("Bonne soirée !", "Tenha uma boa noite!")],
        "dificil": [("Je suis ravi de te connaître.", "Estou feliz em te conhecer."), ("Comment s'appelle ton ami ?", "Como se chama o seu amigo?")],
        "blanks": [
            ('Complete: "Muito obrigado"', "Merci ___.", ["beaucoup", "très", "grand", "plus"], "beaucoup"),
            ('Complete: "Eu me chamo Léo"', "Je m'___ Léo.", ["appelle", "appelles", "appelons", "appeler"], "appelle"),
        ],
    },
    "numeros-cores": {
        "words": [("Treize", "Treze"), ("Douze", "Doze"), ("Quinze", "Quinze"), ("Cent", "Cem"), ("Gris", "Cinza"), ("Marron", "Marrom")],
        "medio": [("Il y a six pommes.", "Há seis maçãs."), ("Le chat est gris.", "O gato é cinza."), ("Mon sac est marron.", "Minha bolsa é marrom.")],
        "dificil": [("Ma sœur a quatorze ans.", "Minha irmã tem catorze anos."), ("Il y a cent personnes ici.", "Há cem pessoas aqui.")],
        "blanks": [
            ("Qual número vem depois?", "dix, onze, ___", ["douze", "treize", "deux", "vingt"], "douze"),
            ('Complete: "Os gatos cinzas"', "Les chats ___", ["gris", "grise", "grises", "grisé"], "gris"),
        ],
    },
    "familia": {
        "words": [("Le fils", "O filho"), ("La fille", "A filha"), ("Le cousin", "O primo"), ("La cousine", "A prima")],
        "medio": [("Mon cousin est drôle.", "Meu primo é engraçado."), ("Ma mère travaille.", "Minha mãe trabalha."), ("Où est ton père ?", "Onde está o seu pai?")],
        "dificil": [("Mes grands-parents habitent à la campagne.", "Meus avós moram no campo."), ("Le bébé dort dans sa chambre.", "O bebê dorme no quarto dele.")],
        "blanks": [
            ('Complete: "Meus pais"', "___ parents", ["Mes", "Mon", "Ma", "Me"], "Mes"),
            ('Complete: "Ela é minha irmã"', "C'est ___ sœur.", ["ma", "mon", "mes", "moi"], "ma"),
        ],
    },
    "animais": {
        "words": [("Le canard", "O pato"), ("La tortue", "A tartaruga"), ("Le lion", "O leão"), ("L'éléphant", "O elefante")],
        "medio": [("Le lion est fort.", "O leão é forte."), ("Le canard nage dans le lac.", "O pato nada no lago."), ("J'aime les tortues.", "Eu gosto das tartarugas.")],
        "dificil": [("L'éléphant a de grandes oreilles.", "O elefante tem orelhas grandes."), ("Les oiseaux volent au-dessus de la mer.", "Os pássaros voam sobre o mar.")],
        "blanks": [
            ('Complete: "Os pássaros"', "Les ___", ["oiseaux", "oiseaus", "oiseau", "oiseles"], "oiseaux"),
            ('Complete: "O pássaro voa"', "L'oiseau ___", ["vole", "voler", "voles", "volons"], "vole"),
        ],
    },
    "comida": {
        "words": [("L'œuf", "O ovo"), ("La soupe", "A sopa"), ("Le sucre", "O açúcar"), ("La viande", "A carne")],
        "medio": [("J'aime les bananes.", "Eu gosto de bananas."), ("Encore un peu, s'il te plaît.", "Mais um pouco, por favor."), ("Le gâteau est sucré.", "O bolo é doce.")],
        "dificil": [("Nous prenons le déjeuner à midi.", "Nós almoçamos ao meio-dia."), ("Tu veux du jus ou de l'eau ?", "Você quer suco ou água?")],
        "blanks": [
            ('Complete: "Eu como uma maçã"', "Je mange ___ pomme.", ["une", "un", "des", "le"], "une"),
            ('Complete: "Nós comemos"', "Nous ___", ["mangeons", "mangons", "mange", "mangez"], "mangeons"),
        ],
    },
    "corpo": {
        "words": [("Le dos", "As costas"), ("Le ventre", "A barriga"), ("La dent", "O dente"), ("Le doigt", "O dedo")],
        "medio": [("J'ai mal au ventre.", "Estou com dor de barriga."), ("Lève les bras !", "Levante os braços!"), ("Ferme les yeux.", "Feche os olhos.")],
        "dificil": [("Après le sport, j'ai mal aux jambes.", "Depois do esporte, estou com dor nas pernas."), ("Elle a les cheveux longs et bruns.", "Ela tem cabelos longos e castanhos.")],
        "blanks": [
            ('Complete: "Estou com dor nas pernas"', "J'ai mal ___ jambes.", ["aux", "au", "à la", "à les"], "aux"),
            ('Complete: "Dois braços"', "Deux ___", ["bras", "brass", "brases", "braux"], "bras"),
        ],
    },
    "escola": {
        "words": [("La règle", "A régua"), ("Le sac à dos", "A mochila"), ("Le tableau", "O quadro"), ("La récréation", "O recreio")],
        "medio": [("C'est la récréation !", "É hora do recreio!"), ("Je lis mon livre.", "Eu leio o meu livro."), ("Le tableau est noir.", "O quadro é preto.")],
        "dificil": [("Est-ce que tu peux répéter, s'il te plaît ?", "Você pode repetir, por favor?"), ("J'ai oublié mon cahier à la maison.", "Eu esqueci meu caderno em casa.")],
        "blanks": [
            ('Complete: "Vocês escutam"', "Vous ___", ["écoutez", "écoutons", "écoute", "écoutent"], "écoutez"),
            ('Complete: "Eu não entendo"', "Je ne comprends ___.", ["pas", "non", "no", "ne"], "pas"),
        ],
    },
    "casa": {
        "words": [("Le toit", "O telhado"), ("Le canapé", "O sofá"), ("Le miroir", "O espelho"), ("L'escalier", "A escada")],
        "medio": [("Assieds-toi sur le canapé.", "Sente-se no sofá."), ("La maison est grande.", "A casa é grande."), ("Je monte l'escalier.", "Eu subo a escada.")],
        "dificil": [("Ma chambre est au premier étage.", "Meu quarto fica no primeiro andar."), ("Nous regardons la télé dans le salon.", "Nós assistimos TV na sala.")],
        "blanks": [
            ('Complete: "Nós assistimos TV"', "Nous ___ la télé.", ["regardons", "regardez", "regarde", "regardent"], "regardons"),
            ('Complete: "Feche a porta"', "___ la porte.", ["Ferme", "Fermer", "Fermés", "Fermé"], "Ferme"),
        ],
    },
    "natureza": {
        "words": [("La montagne", "A montanha"), ("La rivière", "O rio"), ("Le nuage", "A nuvem"), ("La neige", "A neve")],
        "medio": [("Il y a des nuages.", "Tem nuvens."), ("Le soleil brille.", "O sol brilha."), ("Il neige en France.", "Neva na França.")],
        "dificil": [("En hiver, il fait froid et il neige.", "No inverno, faz frio e neva."), ("Nous nageons dans la rivière en été.", "Nós nadamos no rio no verão.")],
        "blanks": [
            ('Complete: "Está ventando"', "Il y a du ___.", ["vent", "vente", "venté", "vents"], "vent"),
            ('Complete: "As nuvens"', "Les ___", ["nuages", "nuage", "nuagis", "nuageux"], "nuages"),
        ],
    },
    "dias-horas": {
        "words": [("Le matin", "A manhã"), ("L'après-midi", "A tarde"), ("La semaine", "A semana"), ("Le mois", "O mês")],
        "medio": [("Bonne semaine !", "Boa semana!"), ("Il est tard.", "Está tarde."), ("C'est le matin.", "É de manhã.")],
        "dificil": [("Le lundi, je vais à l'école à sept heures.", "Na segunda, eu vou à escola às sete horas."), ("Il est trois heures et demie.", "São três e meia.")],
        "blanks": [
            ('Complete: "São duas horas"', "Il est deux ___.", ["heures", "heure", "jours", "temps"], "heures"),
            ("Qual dia vem depois?", "samedi, ___", ["dimanche", "lundi", "vendredi", "mardi"], "dimanche"),
        ],
    },
    "acoes": {
        "words": [("Nager", "Nadar"), ("Marcher", "Andar"), ("Regarder", "Olhar"), ("Écouter", "Escutar")],
        "medio": [("Je nage à la plage.", "Eu nado na praia."), ("Nous écoutons de la musique.", "Nós escutamos música."), ("Regarde !", "Olhe!")],
        "dificil": [("Le week-end, nous allons au parc pour jouer.", "No fim de semana, nós vamos ao parque para brincar."), ("Elle écrit son nom au tableau.", "Ela escreve o nome dela no quadro.")],
        "blanks": [
            ('Complete: "Você nada"', "Tu ___", ["nages", "nage", "nageons", "nagez"], "nages"),
            ('Complete: "Vocês leem"', "Vous ___", ["lisez", "lisons", "lis", "lisent"], "lisez"),
        ],
    },
    "sentimentos": {
        "words": [("Surpris", "Surpreso"), ("Nerveux", "Nervoso"), ("Courageux", "Corajoso"), ("La joie", "A alegria")],
        "medio": [("Je suis surpris !", "Estou surpreso!"), ("Tu es courageux.", "Você é corajoso."), ("Quelle joie !", "Que alegria!")],
        "dificil": [("Je suis nerveux avant l'examen.", "Estou nervoso antes da prova."), ("Quand il pleut, je suis un peu triste.", "Quando chove, eu fico um pouco triste.")],
        "blanks": [
            ('Complete: "Eles estão cansados"', "Ils sont ___", ["fatigués", "fatigué", "fatiguée", "fatiguer"], "fatigués"),
            ('Complete: "Você está com medo?"', "Tu as ___ ?", ["peur", "peurs", "apeuré", "peureux"], "peur"),
        ],
    },
}

NEW_THEMES_V4 = [
    {
        "key": "roupas",
        "title": "Roupas",
        "description": "O que vestir em cada ocasião.",
        "words": [
            ("Le t-shirt", "A camiseta"), ("Le pantalon", "A calça"), ("La robe", "O vestido"), ("La jupe", "A saia"),
            ("Les chaussures", "Os sapatos"), ("Les chaussettes", "As meias"), ("Le chapeau", "O chapéu"),
            ("La casquette", "O boné"), ("Le manteau", "O casaco"), ("Le pull", "O suéter"), ("Le short", "A bermuda"),
            ("Les lunettes", "Os óculos"), ("Le maillot de bain", "A roupa de banho"), ("Le pyjama", "O pijama"),
        ],
        "medio": [
            ("Je porte un t-shirt bleu.", "Eu estou usando uma camiseta azul."),
            ("Où sont mes chaussures ?", "Onde estão meus sapatos?"),
            ("La robe est jolie.", "O vestido é bonito."),
            ("Mets ton manteau.", "Vista o seu casaco."),
            ("J'aime ta casquette.", "Eu gosto do seu boné."),
            ("Il fait chaud, je mets un short.", "Está calor, eu coloco uma bermuda."),
            ("Mes chaussettes sont blanches.", "Minhas meias são brancas."),
            ("C'est mon pyjama.", "Este é o meu pijama."),
        ],
        "dificil": [
            ("Pour aller à la plage, je prends mon maillot de bain.", "Para ir à praia, eu levo minha roupa de banho."),
            ("Ma grand-mère porte des lunettes.", "Minha avó usa óculos."),
            ("En hiver, je porte un pull et un manteau.", "No inverno, eu uso um suéter e um casaco."),
            ("Ce pantalon est trop grand pour moi.", "Esta calça é grande demais para mim."),
            ("Elle achète une jupe rouge au marché.", "Ela compra uma saia vermelha na feira."),
            ("Enlève tes chaussures avant d'entrer.", "Tire os sapatos antes de entrar."),
            ("Quelle est ta couleur préférée ?", "Qual é a sua cor favorita?"),
        ],
        "blanks": [
            ('Complete: "Eu uso um chapéu"', "Je porte ___ chapeau.", ["un", "une", "des", "la"], "un"),
            ('Complete: "Os sapatos pretos"', "Les chaussures ___", ["noires", "noir", "noire", "noirs"], "noires"),
            ('Complete: "Ela usa um vestido"', "Elle ___ une robe.", ["porte", "portes", "portons", "portez"], "porte"),
            ('Complete: "Meus óculos"', "___ lunettes", ["Mes", "Ma", "Mon", "Me"], "Mes"),
            ('Complete: "Vista o seu casaco"', "___ ton manteau.", ["Mets", "Mettre", "Mis", "Mettez"], "Mets"),
        ],
    },
    {
        "key": "cidade",
        "title": "Lugares da cidade",
        "description": "Andar pela cidade e pedir informações.",
        "words": [
            ("La ville", "A cidade"), ("La rue", "A rua"), ("Le marché", "A feira"), ("La boulangerie", "A padaria"),
            ("L'hôpital", "O hospital"), ("Le parc", "O parque"), ("La bibliothèque", "A biblioteca"),
            ("La pharmacie", "A farmácia"), ("Le bus", "O ônibus"), ("La voiture", "O carro"), ("Le vélo", "A bicicleta"),
            ("La gare", "A estação de trem"), ("L'église", "A igreja"), ("Le magasin", "A loja"),
        ],
        "medio": [
            ("Je vais au parc.", "Eu vou ao parque."),
            ("La bibliothèque est fermée.", "A biblioteca está fechada."),
            ("Je prends le bus.", "Eu pego o ônibus."),
            ("Où est la boulangerie ?", "Onde fica a padaria?"),
            ("J'ai un vélo rouge.", "Eu tenho uma bicicleta vermelha."),
            ("La rue est longue.", "A rua é comprida."),
            ("Ma mère va au marché.", "Minha mãe vai à feira."),
            ("C'est une grande ville.", "É uma cidade grande."),
        ],
        "dificil": [
            ("La pharmacie est à côté de l'hôpital.", "A farmácia fica ao lado do hospital."),
            ("Pour aller à l'école, je prends le bus.", "Para ir à escola, eu pego o ônibus."),
            ("Le samedi, nous achetons du pain à la boulangerie.", "No sábado, nós compramos pão na padaria."),
            ("Tournez à gauche après le parc.", "Virem à esquerda depois do parque."),
            ("Il y a beaucoup de voitures dans la rue.", "Há muitos carros na rua."),
            ("La bibliothèque de mon quartier a beaucoup de livres.", "A biblioteca do meu bairro tem muitos livros."),
            ("Excusez-moi, où est la gare ?", "Com licença, onde fica a estação de trem?"),
        ],
        "blanks": [
            ('Complete: "Eu vou ao parque"', "Je vais ___ parc.", ["au", "à la", "aux", "à le"], "au"),
            ('Complete: "Eu vou à padaria"', "Je vais ___ boulangerie.", ["à la", "au", "aux", "à le"], "à la"),
            ('Complete: "Vire à direita"', "Tourne à ___", ["droite", "droit", "gauche", "drôle"], "droite"),
            ('Complete: "Eu ando de bicicleta"', "Je fais du ___", ["vélo", "voiture", "bus", "marché"], "vélo"),
            ('Complete: "Onde fica a farmácia?"', "Où ___ la pharmacie ?", ["est", "es", "sont", "être"], "est"),
        ],
    },
    {
        "key": "esportes",
        "title": "Esportes e brincadeiras",
        "description": "Jogar, correr e brincar com os amigos.",
        "words": [
            ("Le football", "O futebol"), ("Le ballon", "A bola"), ("Le basket", "O basquete"), ("La natation", "A natação"),
            ("Le jeu", "O jogo"), ("La course", "A corrida"), ("L'équipe", "O time"), ("Le but", "O gol"),
            ("Gagner", "Ganhar"), ("Perdre", "Perder"), ("Sauter", "Pular"), ("La corde à sauter", "A corda de pular"),
            ("Le cerf-volant", "A pipa"), ("La poupée", "A boneca"),
        ],
        "medio": [
            ("On joue au foot ?", "Vamos jogar futebol?"),
            ("Lance le ballon !", "Jogue a bola!"),
            ("Mon équipe gagne.", "Meu time está ganhando."),
            ("J'aime la natation.", "Eu gosto de natação."),
            ("Il a marqué un but !", "Ele fez um gol!"),
            ("Je saute très haut.", "Eu pulo muito alto."),
            ("On a perdu le match.", "Nós perdemos a partida."),
            ("Mon cerf-volant vole haut.", "Minha pipa voa alto."),
        ],
        "dificil": [
            ("Après l'école, je joue au football avec mes amis.", "Depois da escola, eu jogo futebol com meus amigos."),
            ("Notre équipe a gagné trois à un.", "Nosso time ganhou de três a um."),
            ("Ma sœur fait de la natation le mercredi.", "Minha irmã faz natação às quartas."),
            ("Qui veut jouer à la corde à sauter ?", "Quem quer brincar de pular corda?"),
            ("Le vent est fort, c'est parfait pour le cerf-volant.", "O vento está forte, perfeito para soltar pipa."),
            ("Il court plus vite que son frère.", "Ele corre mais rápido que o irmão."),
            ("Ce n'est pas grave, on joue encore !", "Não tem problema, vamos jogar de novo!"),
        ],
        "blanks": [
            ('Complete: "Eu jogo futebol"', "Je joue ___ football.", ["au", "à la", "du", "de"], "au"),
            ('Complete: "Nós ganhamos"', "Nous avons ___", ["gagné", "gagner", "gagnons", "gagne"], "gagné"),
            ('Complete: "Ela faz natação"', "Elle fait ___ natation.", ["de la", "du", "des", "au"], "de la"),
            ('Complete: "Eles correm"', "Ils ___", ["courent", "court", "courons", "courez"], "courent"),
            ('Complete: "Meu time"', "___ équipe", ["Mon", "Ma", "Mes", "Me"], "Mon"),
        ],
    },
    {
        "key": "profissoes",
        "title": "Profissões",
        "description": "O que as pessoas fazem no trabalho.",
        "words": [
            ("Le médecin", "O médico"), ("L'infirmière", "A enfermeira"), ("Le pompier", "O bombeiro"),
            ("Le policier", "O policial"), ("Le cuisinier", "O cozinheiro"), ("Le boulanger", "O padeiro"),
            ("Le pêcheur", "O pescador"), ("L'agriculteur", "O agricultor"), ("Le chanteur", "O cantor"),
            ("Le dentiste", "O dentista"), ("Le vendeur", "O vendedor"), ("L'artiste", "O artista"),
            ("Le facteur", "O carteiro"), ("Le chauffeur", "O motorista"),
        ],
        "medio": [
            ("Mon père est pêcheur.", "Meu pai é pescador."),
            ("Le médecin est gentil.", "O médico é gentil."),
            ("Je veux être pompier.", "Eu quero ser bombeiro."),
            ("Le boulanger fait du pain.", "O padeiro faz pão."),
            ("Ma tante est infirmière.", "Minha tia é enfermeira."),
            ("Le facteur apporte une lettre.", "O carteiro traz uma carta."),
            ("Le chauffeur conduit le bus.", "O motorista dirige o ônibus."),
            ("Elle chante bien.", "Ela canta bem."),
        ],
        "dificil": [
            ("Quand je serai grand, je serai médecin.", "Quando eu crescer, vou ser médico."),
            ("Le pêcheur attrape des crabes dans la mangrove.", "O pescador pega caranguejos no mangue."),
            ("Le pompier éteint le feu.", "O bombeiro apaga o fogo."),
            ("Ma mère travaille à l'hôpital comme infirmière.", "Minha mãe trabalha no hospital como enfermeira."),
            ("Le cuisinier prépare un plat délicieux.", "O cozinheiro prepara um prato delicioso."),
            ("Qu'est-ce que tu veux faire plus tard ?", "O que você quer ser quando crescer?"),
            ("Le dentiste dit de brosser les dents.", "O dentista diz para escovar os dentes."),
        ],
        "blanks": [
            ('Complete: "Eu quero ser cantor"', "Je veux ___ chanteur.", ["être", "suis", "es", "été"], "être"),
            ('Complete: "Ela é médica"', "Elle ___ médecin.", ["est", "es", "sont", "être"], "est"),
            ('Complete: "O padeiro faz pão"', "Le boulanger ___ du pain.", ["fait", "fais", "faisons", "faire"], "fait"),
            ('Complete: "Os bombeiros"', "Les ___", ["pompiers", "pompier", "pompieres", "pompiés"], "pompiers"),
            ('Complete: "Ele trabalha"', "Il ___", ["travaille", "travailles", "travaillons", "travailler"], "travaille"),
        ],
    },
]

# Ordem da trilha: unidades de 4 temas, do mais concreto ao mais abstrato.
THEME_ORDER = [
    "saudacoes", "numeros-cores", "familia", "animais",
    "comida", "corpo", "roupas", "escola",
    "casa", "cidade", "natureza", "dias-horas",
    "acoes", "esportes", "sentimentos", "profissoes",
]

for _module in MODULES:
    _module.update(EXTRA_FOR_ORIGINAL_MODULES.get(_module["key"], {}))
MODULES.extend({**theme, "id": None, "activities": {}} for theme in NEW_THEMES + NEW_THEMES_V4)
for _module in MODULES:
    for _field, _items in MORE.get(_module["key"], {}).items():
        _module[_field] = [*_module.get(_field, []), *_items]
MODULES.sort(key=lambda m: THEME_ORDER.index(m["key"]))

_NAMESPACE = uuid.UUID("6f1c3c1e-8a3b-4b8e-9c55-2f0d1b7a9e01")


def stable_id(*parts: str) -> str:
    return str(uuid.uuid5(_NAMESPACE, "/".join(parts)))


def _options(correct, pool, seed, count=4):
    """Resposta certa + distratores do mesmo tema, sempre os mesmos para a mesma pergunta."""
    others = sorted({p for p in pool if p != correct})
    rng = random.Random(seed)
    picked = rng.sample(others, min(count - 1, len(others)))
    return [correct, *picked]


# Quantas palavras/frases de cada tema também viram pergunta de voz ou de escuta.
VOICE_WORDS = 4
VOICE_SENTENCES = 3
LISTEN_WORDS = 6
LISTEN_SENTENCES = 4


def generate(module):
    """Perguntas geradas a partir das listas do tema, em sequência lógica.

    Fácil:   para cada palavra, ler e traduzir; nas primeiras, logo depois falar a palavra.
    Médio:   para cada palavra, lembrar como se diz em francês e (nas primeiras) reconhecer
             ouvindo; depois, para cada frase curta, traduzir, ouvir e falar.
    Difícil: para cada frase longa, traduzir nos dois sentidos e (nas primeiras) falar;
             por fim, completar frases (gramática).
    """
    key = module["key"]
    words = module.get("words", [])
    medio = module.get("medio", [])
    dificil = module.get("dificil", [])
    out = {"facil": [], "medio": [], "dificil": []}
    if not words:
        return out

    fr_words = [fr for fr, _ in words]
    pt_words = [pt for _, pt in words]
    for i, (fr, pt) in enumerate(words):
        out["facil"].append(choice(TRANSLATE_WORD, _options(pt, pt_words, f"{key}/w/{fr}"), pt, prompt=fr))
        if i < VOICE_WORDS:
            out["facil"].append(voice(fr))

    for i, (fr, pt) in enumerate(words):
        out["medio"].append(choice(f'Como se diz "{pt}" em francês?', _options(fr, fr_words, f"{key}/wf/{fr}"), fr))
        if i < LISTEN_WORDS:
            out["medio"].append(listen(fr, _options(pt, pt_words, f"{key}/lw/{fr}"), pt))
    pt_medio = [pt for _, pt in medio]
    for i, (fr, pt) in enumerate(medio):
        out["medio"].append(choice(TRANSLATE_SENTENCE, _options(pt, pt_medio, f"{key}/m/{fr}"), pt, prompt=fr))
        if i < LISTEN_SENTENCES:
            out["medio"].append(listen(fr, _options(pt, pt_medio, f"{key}/lm/{fr}"), pt))
        if i < VOICE_SENTENCES:
            out["medio"].append(voice(fr))

    fr_dificil = [fr for fr, _ in dificil]
    pt_dificil = [pt for _, pt in dificil]
    for i, (fr, pt) in enumerate(dificil):
        out["dificil"].append(choice(TRANSLATE_SENTENCE, _options(pt, pt_dificil, f"{key}/d/{fr}"), pt, prompt=fr))
        out["dificil"].append(choice(TRANSLATE_TO_FR, _options(fr, fr_dificil, f"{key}/df/{fr}"), fr, prompt=pt))
        if i < VOICE_SENTENCES:
            out["dificil"].append(voice(fr))
    for question, prompt, options, correct in module.get("blanks", []):
        out["dificil"].append(choice(question, options, correct, prompt=prompt))
    return out


def _generated_id(key, difficulty, item):
    # O ID depende do conteúdo (e não da posição): reordenar a lista não troca perguntas.
    return stable_id(key, difficulty, "gen", item["kind"], item["question_text"], item["prompt"] or "", item["correct_answer"])


def iter_content():
    """Gera (module_dict, [activity_dict, ...]) com IDs estáveis."""
    for order, module in enumerate(MODULES, 1):
        key = module["key"]
        module_id = module["id"] or stable_id(key)
        mod = {
            "id": module_id,
            "title": module["title"],
            "description": module["description"],
            "order_index": order,
            "version": CONTENT_VERSION,
        }
        acts = []
        generated = generate(module)
        for difficulty in ("facil", "medio", "dificil"):
            handmade = module["activities"].get(difficulty, [])
            items = [(item["id"] or stable_id(key, difficulty, str(i)), item) for i, item in enumerate(handmade, 1)]
            items += [(_generated_id(key, difficulty, item), item) for item in generated[difficulty]]
            for idx, (activity_id, item) in enumerate(items, 1):
                acts.append({
                    "id": activity_id,
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
