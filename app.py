from flask import Flask, render_template, jsonify
import socket
import platform

app = Flask(__name__)

def get_device_info():
    hostname = socket.gethostname()
    try:
        # Get the local IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
    except:
        ip_address = "127.0.0.1"
    
    return {
        "name": platform.node() or hostname,
        "ip": ip_address
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/server')
def server():
    return render_template('server.html')

@app.route('/client')
def client():
    return render_template('client.html')

@app.route('/get_device_info')
def device_info():
    return jsonify(get_device_info())

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
