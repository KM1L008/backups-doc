#!/usr/bin/env bash
# Servidor local con URLs limpias para el Sistema de Backups 3-2-1
python3 -c "
import http.server
import socketserver

PORT = 8000

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path_clean = self.path.split('?')[0].rstrip('/')
        query = ('?' + self.path.split('?')[1]) if '?' in self.path else ''
        if path_clean == '/docs':
            self.path = '/docs.html' + query
        elif path_clean == '':
            self.path = '/index.html' + query
        return super().do_GET()

print(f'🚀 Servidor iniciado en http://localhost:{PORT}')
print(f'📖 Documentación: http://localhost:{PORT}/docs')
print('Presiona Ctrl+C para detener.')
with socketserver.TCPServer(('', PORT), CleanURLHandler) as httpd:
    httpd.serve_forever()
"
