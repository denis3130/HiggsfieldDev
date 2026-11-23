"""Avvia scripts/bivio/voce.py così com'è (il file non si tocca), con una sola differenza nel controllo finale:
Whisper scrive in cifre i numeri che il narratore dice per esteso («tredici» → «13», «la dodici» → «la 12»), e il controllo
comune conosce solo i numeri fino a 10, quindi segnava «quasi» o «DA RIFARE» pezzi detti giusti. Qui la tabella dei numeri
si allunga (11-20 e 300): il controllo resta parola per parola, l'audio generato non cambia.
Uso: python data/horror/ep1_uscita_13/voce_numeri.py data/horror/ep1_uscita_13"""
import sys
from pathlib import Path

B = Path(__file__).resolve().parents[3] / "scripts" / "bivio"
src = (B / "voce.py").read_text()
PIU = {"11": "undici", "12": "dodici", "13": "tredici", "14": "quattordici", "15": "quindici", "16": "sedici", "17": "diciassette",
       "18": "diciotto", "19": "diciannove", "20": "venti", "300": "trecento"}
nuovo = src.replace('"10": "dieci"}', '"10": "dieci", ' + ", ".join(f'"{k}": "{v}"' for k, v in PIU.items()) + "}")
assert nuovo != src, "voce.py è cambiato: la tabella dei numeri non si trova più"
sys.argv = [str(B / "voce.py")] + sys.argv[1:]
exec(compile(nuovo, str(B / "voce.py"), "exec"), {"__name__": "__main__", "__file__": str(B / "voce.py")})
