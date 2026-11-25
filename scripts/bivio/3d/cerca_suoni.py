# cerca_suoni.py "query" [n]: suoni CC0 da Openverse (titolo | autore | durata | file | pagina)
import sys, json, time, urllib.request, urllib.parse
q = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
u = 'https://api.openverse.org/v1/audio/?' + urllib.parse.urlencode({'q': q, 'license': 'cc0', 'page_size': n})
for prova in range(4):
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'curl/8'}), timeout=40)); break
    except Exception as e:
        d = None; time.sleep(3)
if not d: print('niente risposta'); sys.exit(1)
print(f"== {q}: {d.get('result_count')} risultati")
for r in d.get('results', []):
    print(f"  {r.get('title')} | {r.get('creator')} | {r.get('duration')} ms | {r.get('url')} | {r.get('foreign_landing_url')}")
