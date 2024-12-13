from flask import Flask, render_template, jsonify, request, send_from_directory, url_for, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import socket
import platform
import os
from werkzeug.utils import secure_filename
import json

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'secret!'  # Add a secret key for security
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads folder if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Store connected clients
connected_clients = {}
server_sid = None

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

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')  # Use eventlet as async_mode

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
    try:
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
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    global server_sid
    client_id = request.sid
    device_info = get_device_info()
    
    # Check if this is the server connecting
    if not server_sid and request.args.get('mode') == 'server':
        server_sid = client_id
        emit('server_connected', {'server': device_info})
        return
    
    # If this is a client connecting
    if server_sid and client_id != server_sid:
        connected_clients[client_id] = device_info
        # Emit to server only
        emit('client_connected', {'client': device_info}, to=server_sid)
        # Emit to the client its connection status
        emit('connection_established', {'server': connected_clients.get(server_sid, {})}, to=client_id)

@socketio.on('disconnect')
def handle_disconnect():
    global server_sid
    client_id = request.sid
    
    if client_id == server_sid:
        # Server disconnected
        server_sid = None
        connected_clients.clear()
    elif client_id in connected_clients:
        # Client disconnected
        device_info = connected_clients.pop(client_id)
        if server_sid:
            emit('client_disconnected', {'client': device_info}, to=server_sid)

@socketio.on('file_uploaded')
def handle_file_upload(data):
    emit('refresh_files', broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8000, debug=True, allow_unsafe_werkzeug=True)
