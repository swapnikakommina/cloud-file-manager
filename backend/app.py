from flask import Flask, request, jsonify, send_file, render_template
import boto3
import os
import tempfile
from werkzeug.utils import secure_filename
from botocore.exceptions import ClientError
import logging
from io import BytesIO
from datetime import datetime

app = Flask(__name__)

# AWS S3 Configuration
ACCESS_KEY = 'AKIAQ54QQ6TAHCDI5C5F'
SECRET_KEY = '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'
BUCKET_NAME = 'my-cloud-file-manager-swapnika'

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY
)

# Serve static files
@app.route('/')
def index():
    return app.send_static_file('index.html')

# List files and folders
@app.route('/api/list')
def list_objects():
    prefix = request.args.get('prefix', '')
    
    # Initialize empty lists for files and folders
    files = []
    folders = set()
    
    try:
        # List objects with the given prefix
        response = s3_client.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix=prefix,
            Delimiter='/'
        )
        
        # Process common prefixes (folders)
        if 'CommonPrefixes' in response:
            for obj in response['CommonPrefixes']:
                folder_name = obj['Prefix']
                folders.add(folder_name)
        
        # Process objects (files)
        if 'Contents' in response:
            for obj in response['Contents']:
                key = obj['Key']
                
                # Skip the current prefix if it's returned as an object
                if key == prefix:
                    continue
                
                # Skip objects that end with '/' (empty folders)
                if key.endswith('/'):
                    folders.add(key)
                    continue
                
                # Add file info
                files.append({
                    'key': key,
                    'size': obj['Size'],
                    'lastModified': obj['LastModified'].isoformat()
                })
        
        return jsonify({
            'files': files,
            'folders': list(folders)
        })
        
    except ClientError as e:
        logger.error(f"S3 Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

# Upload a file
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    prefix = request.form.get('prefix', '')
    filename = secure_filename(file.filename)
    key = os.path.join(prefix, filename).replace('\\', '/')
    
    try:
        s3_client.upload_fileobj(file, BUCKET_NAME, key)
        return jsonify({'success': True, 'key': key})
    except ClientError as e:
        logger.error(f"S3 Upload Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Upload Error: {e}")
        return jsonify({'error': str(e)}), 500

# Download a file
@app.route('/api/download')
def download_file():
    key = request.args.get('key')
    
    if not key:
        return jsonify({'error': 'No key provided'}), 400
    
    try:
        # Get the object
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
        
        # Create a BytesIO object
        file_data = response['Body'].read()
        file_like_object = BytesIO(file_data)
        
        # Extract the filename from the key
        filename = os.path.basename(key)
        
        # Send the file to the client
        return send_file(
            file_like_object,
            as_attachment=True,
            download_name=filename,
            mimetype=response.get('ContentType', 'application/octet-stream')
        )
    except ClientError as e:
        logger.error(f"S3 Download Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Download Error: {e}")
        return jsonify({'error': str(e)}), 500

# Delete a file
@app.route('/api/delete', methods=['POST'])
def delete_file():
    data = request.json
    key = data.get('key')
    
    if not key:
        return jsonify({'error': 'No key provided'}), 400
    
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
        return jsonify({'success': True})
    except ClientError as e:
        logger.error(f"S3 Delete Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Delete Error: {e}")
        return jsonify({'error': str(e)}), 500

# Create a folder
@app.route('/api/create-folder', methods=['POST'])
def create_folder():
    data = request.json
    path = data.get('path')
    
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    
    # Ensure path ends with '/'
    if not path.endswith('/'):
        path += '/'
    
    try:
        # Create an empty object with the folder name as the key
        s3_client.put_object(Bucket=BUCKET_NAME, Key=path, Body='')
        return jsonify({'success': True})
    except ClientError as e:
        logger.error(f"S3 Create Folder Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Create Folder Error: {e}")
        return jsonify({'error': str(e)}), 500

# Delete a folder and all its contents
@app.route('/api/delete-folder', methods=['POST'])
def delete_folder():
    data = request.json
    path = data.get('path')
    
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    
    # Ensure path ends with '/'
    if not path.endswith('/'):
        path += '/'
    
    try:
        # List all objects with the folder prefix
        objects_to_delete = []
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=BUCKET_NAME, Prefix=path)
        
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects_to_delete.append({'Key': obj['Key']})
        
        # Delete all objects in the folder
        if objects_to_delete:
            s3_client.delete_objects(
                Bucket=BUCKET_NAME,
                Delete={'Objects': objects_to_delete}
            )
        
        return jsonify({'success': True})
    except ClientError as e:
        logger.error(f"S3 Delete Folder Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Delete Folder Error: {e}")
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)