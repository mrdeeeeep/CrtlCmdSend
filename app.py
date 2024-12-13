from flask import Flask, render_template, jsonify, request, send_from_directory, url_for
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import socket
import platform
import os
from werkzeug.utils import secure_filename
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads folder if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Store connected clients
connected_clients = {}

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

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        socketio.emit('file_uploaded', {'filename': filename}, broadcast=True)
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': filename
        })

@app.route('/files', methods=['GET'])
def list_files():
    files = []
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.isfile(file_path):
            files.append({
                'name': filename,
                'size': os.path.getsize(file_path),
                'url': url_for('download_file', filename=filename)
            })
    return jsonify(files)

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

@socketio.on('connect')
def handle_connect():
    client_id = request.sid
    device_info = get_device_info()
    connected_clients[client_id] = device_info
    emit('client_connected', {'client': device_info}, broadcast=True)
    emit('update_clients', {'clients': list(connected_clients.values())}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    client_id = request.sid
    if client_id in connected_clients:
        device_info = connected_clients.pop(client_id)
        emit('client_disconnected', {'client': device_info}, broadcast=True)
        emit('update_clients', {'clients': list(connected_clients.values())}, broadcast=True)

@socketio.on('file_uploaded')
def handle_file_upload(data):
    emit('refresh_files', broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)
