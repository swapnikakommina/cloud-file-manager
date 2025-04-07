# Cloud File Manager for AWS S3

A simple web-based file manager for AWS S3 buckets. This application allows you to upload, download, organize, and delete files in your S3 bucket through an intuitive UI.

## Project Overview
The Cloud File Manager for AWS S3 is a web-based application that provides an intuitive interface for managing files stored in an Amazon S3 bucket. This solution enables users to perform all essential file management operations through a responsive, user-friendly interface while maintaining security by keeping AWS credentials protected on the server side.

## Key Features
- **File Browsing**: Navigate through folders with a familiar file explorer interface
- **File Operations**: Upload, download, and delete files with ease
- **Folder Management**: Create, navigate, and delete folders within the bucket
- **Drag-and-Drop**: Intuitive drag-and-drop functionality for file uploads
- **Metadata Display**: View file sizes and last modified dates for all files
- **Breadcrumb Navigation**: Easily track and navigate your location in the folder hierarchy

## Technical Implementation
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5
- **Backend**: Python Flask application
- **Cloud Services**: AWS S3 for storage
- **Security**: Server-side credential management

## Architecture
The application follows a two-tier architecture:
1. **Client Tier**: Browser-based UI that communicates with the server via RESTful API calls
2. **Server Tier**: Flask application that interfaces with AWS S3 using the boto3 SDK

## Security Note

This application uses a Flask backend to handle AWS credentials securely. AWS credentials are only stored on the server side and are never exposed to the client.

## Prerequisites

- Python 3.7 or higher
- AWS account with an S3 bucket
- AWS access key and secret key with permissions to the S3 bucket

## Setup and Installation

1. Clone this repository or download the files:

```bash
git clone https://github.com/swapnikakommina/cloud-file-manager.git
cd cloud-file-manager
```

2. Install the required Python packages:

```bash
pip install -r backend/requirements.txt
```

3. Set up your AWS credentials:

The AWS credentials are already configured in the `app.py` file. If you need to change them, update the following lines:

```python
ACCESS_KEY = 'your-access-key'
SECRET_KEY = 'your-secret-key'
BUCKET_NAME = 'your-bucket-name'
```

4. Start the Flask server:

```bash
cd backend
python app.py
```

5. Open your browser and go to:

```
http://localhost:5001
```

## Project Structure

```
cloud-file-manager/
├── backend/
│   ├── app.py                 # Flask application
│   ├── requirements.txt       # Python dependencies
│   └── static/                # Served static files
│       ├── css/
│       │   └── style.css      # Styling
│       ├── js/
│       │   └── main.js        # Frontend JavaScript
│       └── index.html         # Main application page
└── README.md                  # Project documentation
```

## Browser Compatibility

This application is compatible with:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Safari (latest)

## Future Enhancements
- Deploy in Render or Heroku
- User authentication and access control
- File preview capabilities
- Advanced search functionality
- File sharing features
- Version tracking for files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
