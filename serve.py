#!/usr/bin/env python3
"""
Tiny local web server for the Secret Class site.

Why this exists
---------------
You chose pretty URLs (e.g. /chapter/001/ instead of reader.html?chapter=001).
Pretty URLs only work when something on the server rewrites the path. We use
Python's stdlib http.server + a custom handler to do that rewrite.

Usage
-----
    python3 serve.py               # serves on http://localhost:8000
    python3 serve.py --port 9000   # different port
    python3 serve.py --open        # also open the browser

Then open http://localhost:8000/ in your browser.
"""

import argparse
import http.server
import socketserver
import sys
import webbrowser
from pathlib import Path

DEFAULT_PORT = 8000
SITE_DIR = Path(__file__).resolve().parent


class PrettyURLHandler(http.server.SimpleHTTPRequestHandler):
    """
    Static file server with two rewrites:

        /chapter/001/   →  /reader.html?chapter=001
        /chapter/001    →  /reader.html?chapter=001
    """

    def do_GET(self):
        # Rewrite /chapter/N/ → reader.html?chapter=N
        import re
        m = re.match(r"^/chapter/(\d+(?:\.\d+)?)/?$", self.path)
        if m:
            num = m.group(1)
            # Send HTTP redirect so browser sees the query string
            self.send_response(302)
            self.send_header('Location', f'/reader.html?chapter={num}')
            self.end_headers()
            return
        return super().do_GET()

    # Quieter log lines
    def log_message(self, format, *args):
        sys.stderr.write(f"   {self.address_string()} → {format % args}\n")


def main():
    ap = argparse.ArgumentParser(description="Serve the Secret Class site locally.")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument("--open", action="store_true", help="open the browser on start")
    args = ap.parse_args()

    # Serve from the site dir
    import os
    os.chdir(SITE_DIR)

    # Allow port reuse so we don't have to wait 30s after Ctrl-C
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", args.port), PrettyURLHandler) as httpd:
        url = f"http://localhost:{args.port}/"
        print(f"   🟢 Serving {SITE_DIR}")
        print(f"   🟢 Open:  {url}")
        print(f"   🟢 Pretty URL example:  {url}chapter/001/")
        print(f"   🟢 Ctrl-C to stop.\n")
        if args.open:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n   🛑 Stopped.")


if __name__ == "__main__":
    main()
