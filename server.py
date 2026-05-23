#!/usr/bin/env python3
"""⚡ Lightning Wallets Comparison — Local dev server with CORS."""

import http.server
import socketserver
import os
import sys

PORT = int(os.environ.get('PORT', 8080))
DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        print(f'  {args[0]}')


if __name__ == '__main__':
    print(f'\n  ⚡ Lightning Wallets Comparison')
    print(f'  Serving on: http://localhost:{PORT}\n')
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n  Shutting down. ⚡\n')
            sys.exit(0)
