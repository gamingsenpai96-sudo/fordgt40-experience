import http.server
import socketserver
import os
import re

PORT = 8090
DIRECTORY = '/Users/perfectlyimperfect/Downloads/fordgt40-experience'

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_len)

        if self.path.startswith('/api/save-ar-usdz'):
            target_path = os.path.join(DIRECTORY, 'assets/models/ar/gt40-ar.usdz')
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, 'wb') as f:
                f.write(post_data)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Saved AR USDZ ({len(post_data)} bytes) to {target_path}'.encode('utf-8'))
            return

        if self.path.startswith('/api/save-usdz'):
            target_path = os.path.join(DIRECTORY, 'assets/models/car/source/gt40.usdz')
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, 'wb') as f:
                f.write(post_data)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Saved USDZ ({len(post_data)} bytes) to {target_path}'.encode('utf-8'))
            return

        if self.path.startswith('/api/save-glb'):
            target_path = os.path.join(DIRECTORY, 'assets/models/car/source/gt40.glb')
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, 'wb') as f:
                f.write(post_data)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Saved GLB ({len(post_data)} bytes) to {target_path}'.encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def guess_type(self, path):
        if path.endswith('.wasm'):
            return 'application/wasm'
        if path.endswith('.glb'):
            return 'model/gltf-binary'
        if path.endswith('.usdz'):
            return 'model/vnd.usdz+zip'
        if path.endswith('.mp3'):
            return 'audio/mpeg'
        if path.endswith('.wav'):
            return 'audio/wav'
        if path.endswith('.m4a') or path.endswith('.mp4'):
            return 'video/mp4'
        return super().guess_type(path)

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, 'File not found')
            return None

        fs = os.fstat(f.fileno())
        total_len = fs.st_size
        range_header = self.headers.get('Range')

        content_type = self.guess_type(path)

        if not range_header:
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(total_len))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            return f

        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not match:
            self.send_error(416, 'Requested Range Not Satisfiable')
            f.close()
            return None

        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else total_len - 1

        if start >= total_len or start > end:
            self.send_error(416, 'Requested Range Not Satisfiable')
            f.close()
            return None

        end = min(end, total_len - 1)
        length = end - start + 1

        self.send_response(206)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Range', f'bytes {start}-{end}/{total_len}')
        self.send_header('Content-Length', str(length))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()

        f.seek(start)

        class SlicedFile:
            def __init__(self, file_obj, max_bytes):
                self.file_obj = file_obj
                self.remaining = max_bytes

            def read(self, size=-1):
                if self.remaining <= 0:
                    return b''
                if size < 0 or size > self.remaining:
                    size = self.remaining
                data = self.file_obj.read(size)
                self.remaining -= len(data)
                return data

            def close(self):
                self.file_obj.close()

        return SlicedFile(f, length)

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    with ThreadingServer(('0.0.0.0', PORT), CustomHandler) as httpd:
        print(f'Serving {DIRECTORY} on port {PORT}...')
        httpd.serve_forever()
