"""
Captive Portal Detection Handler
Runs on port 80 — intercepts connectivity checks from all phone brands
and redirects users to the Department Guide System
"""

from flask import Flask, redirect, request, Response

app = Flask(__name__)

PORTAL = 'http://192.168.1.1:5000'

REDIRECT_HTML = f'''<html>
<head><meta http-equiv="refresh" content="0;url={PORTAL}"></head>
<body>
<script>window.location.href="{PORTAL}";</script>
<p>Redirecting... <a href="{PORTAL}">Click here</a></p>
</body></html>'''


# Android / Google (all brands — Samsung, Xiaomi, Redmi, Poco, Vivo, Oppo)
@app.route('/generate_204')
@app.route('/generate204')
def generate_204():
    return Response(REDIRECT_HTML, status=200, mimetype='text/html')


# Apple iOS / macOS
@app.route('/hotspot-detect.html')
@app.route('/library/test/success.html')
@app.route('/success.txt')
@app.route('/canonical.html')
def apple_check():
    return Response(
        f'<HTML><HEAD><TITLE>Success</TITLE></HEAD>'
        f'<BODY><script>window.location.href="{PORTAL}";</script>'
        f'<a href="{PORTAL}">Open Department Guide</a></BODY></HTML>',
        status=200, mimetype='text/html'
    )


# Windows / Microsoft
@app.route('/connecttest.txt')
@app.route('/ncsi.txt')
def windows_check():
    return Response(REDIRECT_HTML, status=200, mimetype='text/html')


# Catch all — redirect everything else to Flask app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return redirect(PORTAL, code=302)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=False)
