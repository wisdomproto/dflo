"""리플렛 검토 서버 — 정적 서빙 + /save(수정사항 파일 기록).
실행: python review_server.py  (포트 8765)
검토 페이지: http://localhost:8765/review.html
저장 결과: docs/Leaflet/revisions.md (+ revisions.json)
"""
import http.server, socketserver, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765

def render_md(data):
    lines = ["# 리플렛 검토 수정사항", ""]
    g = (data.get("general") or "").strip()
    if g:
        lines += ["## 전체 메모", "", g, ""]
    notes = [n for n in data.get("notes", []) if (n.get("text") or "").strip()]
    if notes:
        lines += ["## 페이지별 수정사항", ""]
        for n in sorted(notes, key=lambda x: x.get("page", "")):
            lines.append(f"### {n.get('page','?')}")
            lines.append("")
            lines.append((n.get("text") or "").strip())
            lines.append("")
    if not g and not notes:
        lines += ["_(작성된 수정사항 없음)_"]
    return "\n".join(lines)

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def do_GET(self):
        if self.path == "/api/load":
            p = os.path.join(ROOT, "revisions.json")
            body = open(p, "rb").read() if os.path.exists(p) else b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == "/save":
            ln = int(self.headers.get("Content-Length", 0))
            try:
                data = json.loads(self.rfile.read(ln) or b"{}")
            except Exception:
                data = {}
            with open(os.path.join(ROOT, "revisions.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            with open(os.path.join(ROOT, "revisions.md"), "w", encoding="utf-8") as f:
                f.write(render_md(data))
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_response(404)
        self.end_headers()

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), H) as httpd:
        print(f"리플렛 검토 서버: http://localhost:{PORT}/review.html")
        httpd.serve_forever()
