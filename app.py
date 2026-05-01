from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify, session, flash
import json
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from functools import wraps
import shutil
from datetime import datetime
app = Flask(__name__)
app.secret_key = os.urandom(24).hex()
from datetime import datetime
# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'txt', 'zip'}

# Create necessary directories
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads'), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data'), exist_ok=True)

# Path to data directory
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

def load_json(filename):
    """Load JSON data from a file."""
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def save_json(filename, data):
    """Save JSON data to a file."""
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving JSON: {e}")
        return False

def load_config():
    """Load configuration (including admin password hash)."""
    config = load_json('config.json')
    if config is None:
        config = {'admin_password': None, 'setup_complete': False}
        save_json('config.json', config)
    return config

def save_config(config):
    """Save configuration."""
    save_json('config.json', config)

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin_login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def landing():
    """Landing page with options."""
    return render_template('landing.html')

@app.route('/timetable')
def view_timetable():
    """View timetable based on selected program and section."""
    # Get program and section from URL parameters
    program = request.args.get('program', 'cyber')
    section = request.args.get('section', 'A')
    
    # Load the appropriate timetable file
    timetable_file = f'timetable_{program}_{section}.json'
    timetable = load_json(timetable_file)
    
    # If timetable file doesn't exist, try to load default
    if timetable is None:
        timetable = load_json('timetable_cyber_A.json')
        program = 'cyber'
        section = 'A'
    
    # Load other data
    teachers = load_json('teachers.json')
    announcements = load_json('announcements.json')
    programs = load_programs()  # Load dynamic programs

    # Current day and time
    now = datetime.now()
    current_day = now.strftime('%A')
    current_time = now.strftime('%H:%M')

    # Get program display name from programs.json
    program_display = programs.get(program, program.title())

    return render_template('index.html',
                           timetable=timetable,
                           teachers=teachers,
                           announcements=announcements,
                           current_day=current_day,
                           current_time=current_time,
                           program=program_display,
                           section=section,
                           programs=programs)  # Pass programs to template
@app.route('/guide')
def guide():
    """Redirect to timetable with default values."""
    return redirect(url_for('view_timetable', program='cyber', section='A'))

@app.route('/submit', methods=['GET', 'POST'])
def submit():
    """Submission form page."""
    if request.method == 'POST':
        # Get form data
        name = request.form.get('name')
        email = request.form.get('email')
        department = request.form.get('department')
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Handle file upload
        file = request.files.get('file')
        filename = None
        file_size = None
        
        if file and file.filename != '' and allowed_file(file.filename):
            original_filename = secure_filename(file.filename)
            ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
            filename = f"{uuid.uuid4().hex}.{ext}"
            file_path = os.path.join(UPLOAD_DIR, filename)
            file.save(file_path)
            file_size = os.path.getsize(file_path)
        
        # Create submission record
        submission = {
            'id': str(uuid.uuid4()),
            'name': name,
            'email': email,
            'department': department,
            'subject': subject,
            'message': message,
            'filename': filename,
            'original_filename': file.filename if file else None,
            'file_size': file_size,
            'timestamp': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        # Load existing submissions
        submissions = load_json('submissions.json')
        if submissions is None:
            submissions = {'submissions': []}
        
        # Add new submission
        submissions['submissions'].append(submission)
        
        # Save submissions
        save_json('submissions.json', submissions)
        
        return render_template('submit.html', success=True)
    
    return render_template('submit.html', success=False)

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page."""
    config = load_config()
    error = None
    
    if request.method == 'POST':
        password = request.form.get('password')
        
        # If no password set yet (first time)
        if config['admin_password'] is None:
            # Set the password
            config['admin_password'] = generate_password_hash(password)
            config['setup_complete'] = True
            save_config(config)
            session['admin_logged_in'] = True
            flash('Admin password set successfully!', 'success')
            return redirect(request.args.get('next', url_for('view_submissions')))
        else:
            # Verify password
            if check_password_hash(config['admin_password'], password):
                session['admin_logged_in'] = True
                flash('Logged in successfully!', 'success')
                return redirect(request.args.get('next', url_for('view_submissions')))
            else:
                error = 'Invalid password'
    
    return render_template('admin_login.html', error=error, is_first_time=config['admin_password'] is None)

@app.route('/admin/logout')
def admin_logout():
    """Logout admin."""
    session.pop('admin_logged_in', None)
    flash('Logged out successfully', 'success')
    return redirect(url_for('landing'))
# ==================== PROGRAMS MANAGEMENT ====================
PROGRAMS_FILE = os.path.join(DATA_DIR, 'programs.json')

def load_programs():
    """Load all programs from programs.json"""
    programs = load_json('programs.json')
    if programs is None:
        # Default programs
        programs = {
            'cyber': 'Cyber Security',
            'ce': 'Computer Engineering',
            'ist': 'Information Security Technology'
        }
        save_json('programs.json', programs)
    return programs

def save_programs(programs):
    """Save programs to programs.json"""
    save_json('programs.json', programs)

def add_program(code, name):
    """Add a new program to programs.json"""
    programs = load_programs()
    programs[code] = name
    save_programs(programs)
    return True
@app.route('/admin/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    """Change admin password."""
    config = load_config()
    error = None
    success = None
    
    if request.method == 'POST':
        current = request.form.get('current_password')
        new = request.form.get('new_password')
        confirm = request.form.get('confirm_password')
        
        # Verify current password
        if not check_password_hash(config['admin_password'], current):
            error = 'Current password is incorrect'
        elif new != confirm:
            error = 'New passwords do not match'
        elif len(new) < 4:
            error = 'Password must be at least 4 characters'
        else:
            # Update password
            config['admin_password'] = generate_password_hash(new)
            save_config(config)
            success = 'Password changed successfully!'
    
    return render_template('change_password.html', error=error, success=success)

@app.route('/submissions')
@login_required
def view_submissions():
    """View all submissions (protected)."""
    submissions = load_json('submissions.json')
    if submissions is None:
        submissions = {'submissions': []}
    return render_template('view_submissions.html', submissions=submissions['submissions'])

@app.route('/download/<filename>')
@login_required
def download_file(filename):
    """Download uploaded file (protected)."""
    return send_from_directory(UPLOAD_DIR, filename, as_attachment=True)

@app.route('/api/submissions')
@login_required
def api_submissions():
    """API endpoint for submissions (protected)."""
    submissions = load_json('submissions.json')
    if submissions is None:
        submissions = {'submissions': []}
    return jsonify(submissions)

@app.route('/api/update_status/<submission_id>', methods=['POST'])
@login_required
def update_status(submission_id):
    """Update submission status (protected)."""
    data = request.get_json()
    new_status = data.get('status')
    
    submissions = load_json('submissions.json')
    if submissions:
        for sub in submissions['submissions']:
            if sub['id'] == submission_id:
                sub['status'] = new_status
                save_json('submissions.json', submissions)
                return jsonify({'success': True})
    
    return jsonify({'success': False}), 404

@app.route('/my-submissions')
def my_submissions():
    """Page for students to view their own submissions."""
    return render_template('my_submissions.html')

@app.route('/api/my-submissions')
def api_my_submissions():
    """API endpoint for students to get their submissions by email."""
    email = request.args.get('email')
    if not email:
        return jsonify({'submissions': []})
    
    submissions = load_json('submissions.json')
    if submissions is None:
        return jsonify({'submissions': []})
    
    # Filter submissions by email
    user_submissions = [s for s in submissions['submissions'] if s.get('email', '').lower() == email.lower()]
    
    return jsonify({'submissions': user_submissions})
# ========== ADMIN DATA MANAGEMENT ROUTES ==========

@app.route('/admin/data')
@login_required
def admin_data():
    """Admin dashboard for managing all JSON data."""
    # Get all timetable files
    timetable_files = []
    for file in os.listdir(DATA_DIR):
        if file.startswith('timetable_') and file.endswith('.json'):
            timetable_files.append(file)
    
    teachers = load_json('teachers.json')
    announcements = load_json('announcements.json')
    programs = load_programs()  # Load dynamic programs
    
    return render_template('admin_data.html',
                         timetable_files=timetable_files,
                         teachers=teachers,
                         announcements=announcements,
                         programs=programs)

@app.route('/admin/edit_timetable/<filename>', methods=['GET', 'POST'])
@login_required
def edit_timetable(filename):
    """Edit a specific timetable JSON file."""
    filepath = os.path.join(DATA_DIR, filename)
    
    if request.method == 'POST':
        # Get the schedule data from form
        schedule = {}
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for day in days:
            classes = []
            class_count = int(request.form.get(f'{day}_count', 0))
            
            for i in range(class_count):
                time_start = request.form.get(f'{day}_{i}_time_start')
                time_end = request.form.get(f'{day}_{i}_time_end')
                subject = request.form.get(f'{day}_{i}_subject')
                teacher = request.form.get(f'{day}_{i}_teacher')
                room = request.form.get(f'{day}_{i}_room')
                
                if time_start and subject:
                    classes.append({
                        'time_start': time_start,
                        'time_end': time_end,
                        'subject': subject,
                        'teacher': teacher,
                        'room': room
                    })
            
            if classes:
                schedule[day] = {'classes': classes}
        
        # Save to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({'schedule': schedule}, f, indent=4, ensure_ascii=False)
        
        flash(f'Timetable {filename} updated successfully!', 'success')
        return redirect(url_for('admin_data'))
    
    # Load existing data
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return render_template('edit_timetable.html', filename=filename, data=data)

@app.route('/admin/create_timetable', methods=['GET', 'POST'])
@login_required
def create_timetable():
    """Create a new timetable from scratch (supports new programs/sections)."""
    if request.method == 'POST':
        # Get program selection
        program_option = request.form.get('program_option', 'existing')
        
        if program_option == 'existing':
            program = request.form.get('program')
            if not program:
                flash('Please select a program', 'warning')
                return redirect(url_for('create_timetable'))
        else:
            # New program
            program_name = request.form.get('new_program', '').strip()
            program_code = request.form.get('new_program_code', '').strip()
            
            if not program_name or not program_code:
                flash('Please enter both session name and code', 'warning')
                return redirect(url_for('create_timetable'))
            
            # Use the code as the program identifier
            program = program_code
            
            # Save the new program to programs.json
            add_program(program_code, program_name)
            flash(f'New session "{program_name}" has been added!', 'success')
        
        # Get section selection
        section_option = request.form.get('section_option', 'existing')
        
        if section_option == 'existing':
            section = request.form.get('section')
            if not section:
                flash('Please select a section', 'warning')
                return redirect(url_for('create_timetable'))
        else:
            section = request.form.get('new_section', '').strip().upper()
            if not section or len(section) != 1 or not section.isalpha():
                flash('Please enter a single letter for section (A-Z)', 'warning')
                return redirect(url_for('create_timetable'))
        
        filename = f'timetable_{program}_{section}.json'
        filepath = os.path.join(DATA_DIR, filename)
        
        # Check if file already exists
        if os.path.exists(filepath):
            flash(f'Timetable {filename} already exists!', 'warning')
            return redirect(url_for('create_timetable'))
        
        # Create empty schedule structure
        schedule = {}
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for day in days:
            schedule[day] = {'classes': []}
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({'schedule': schedule}, f, indent=4, ensure_ascii=False)
        
        flash(f'✅ New timetable {filename} created! Now add classes.', 'success')
        return redirect(url_for('edit_timetable', filename=filename))
    
    # For GET request, load existing programs for the dropdown
    programs = load_programs()
    return render_template('create_timetable.html', programs=programs)
@app.route('/admin/edit_teachers', methods=['GET', 'POST'])
@login_required
def edit_teachers():
    """Edit teachers.json file."""
    filepath = os.path.join(DATA_DIR, 'teachers.json')
    
    if request.method == 'POST':
        teachers = []
        teacher_count = int(request.form.get('teacher_count', 0))
        
        for i in range(teacher_count):
            name = request.form.get(f'teacher_{i}_name')
            if name:
                teacher = {
                    'name': name,
                    'subject': request.form.get(f'teacher_{i}_subject', ''),
                    'email': request.form.get(f'teacher_{i}_email', ''),
                    'phone': request.form.get(f'teacher_{i}_phone', ''),
                    'room': request.form.get(f'teacher_{i}_room', ''),
                    'type': request.form.get(f'teacher_{i}_type', '')
                }
                teachers.append(teacher)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(teachers, f, indent=4, ensure_ascii=False)
        
        flash('Teachers data updated successfully!', 'success')
        return redirect(url_for('admin_data'))
    
    teachers = load_json('teachers.json')
    if teachers is None:
        teachers = []
    
    return render_template('edit_teachers.html', teachers=teachers)

@app.route('/admin/edit_announcements', methods=['GET', 'POST'])
@login_required
def edit_announcements():
    """Edit announcements.json file."""
    filepath = os.path.join(DATA_DIR, 'announcements.json')
    
    if request.method == 'POST':
        announcements = []
        ann_count = int(request.form.get('announcement_count', 0))
        
        for i in range(ann_count):
            title = request.form.get(f'announcement_{i}_title')
            if title:
                announcement = {
                    'title': title,
                    'description': request.form.get(f'announcement_{i}_description', ''),
                    'badge': request.form.get(f'announcement_{i}_badge', 'INFO'),
                    'badge_type': request.form.get(f'announcement_{i}_badge_type', 'info')
                }
                announcements.append(announcement)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({'announcements': announcements}, f, indent=4, ensure_ascii=False)
        
        flash('Announcements updated successfully!', 'success')
        return redirect(url_for('admin_data'))
    
    announcements = load_json('announcements.json')
    if announcements is None:
        announcements = {'announcements': []}
    
    return render_template('edit_announcements.html', announcements=announcements['announcements'])

@app.route('/admin/delete_timetable/<filename>')
@login_required
def delete_timetable(filename):
    """Delete a timetable file (with confirmation)."""
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        flash(f'Timetable {filename} deleted!', 'warning')
    return redirect(url_for('admin_data'))

@app.route('/admin/backup')
@login_required
def backup_data():
    """Create a backup of all JSON files."""
    backup_dir = os.path.join(DATA_DIR, f'backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
    os.makedirs(backup_dir, exist_ok=True)
    
    for file in os.listdir(DATA_DIR):
        if file.endswith('.json'):
            shutil.copy2(os.path.join(DATA_DIR, file), os.path.join(backup_dir, file))
    
    flash(f'Backup created in {backup_dir}', 'success')
    return redirect(url_for('admin_data'))
# ==================== CHAT FEATURE ====================
# ==================== CHAT FEATURE ====================
CHAT_FILE = os.path.join(DATA_DIR, 'chat_messages.json')
CHAT_UPLOAD_FOLDER = os.path.join(UPLOAD_DIR, 'chat_files')
os.makedirs(CHAT_UPLOAD_FOLDER, exist_ok=True)

def load_chat():
    """Load chat messages, delete orphaned files, and auto-delete old messages"""
    messages = load_json('chat_messages.json')
    if messages is None:
        messages = []
    
    # Get all valid filenames from messages
    valid_files = set()
    for msg in messages:
        if msg.get('filename'):
            valid_files.add(msg['filename'])
    
    # Delete orphaned files (files without matching messages)
    if os.path.exists(CHAT_UPLOAD_FOLDER):
        for filename in os.listdir(CHAT_UPLOAD_FOLDER):
            if filename not in valid_files:
                filepath = os.path.join(CHAT_UPLOAD_FOLDER, filename)
                try:
                    os.remove(filepath)
                    print(f"Deleted orphaned chat file: {filename}")
                except Exception as e:
                    print(f"Error deleting orphaned file {filename}: {e}")
    
    # Keep only today's messages
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    new_messages = [m for m in messages if m.get('timestamp', '') >= today_start]
    
    # Also clean up submission.json old entries (optional)
    clean_old_submissions()
    
    if len(new_messages) != len(messages):
        save_json('chat_messages.json', new_messages)
    
    return new_messages

def clean_old_submissions():
    """Delete submission records older than 30 days"""
    submissions = load_json('submissions.json')
    if submissions and 'submissions' in submissions:
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        old_count = len(submissions['submissions'])
        submissions['submissions'] = [s for s in submissions['submissions'] 
                                       if s.get('timestamp', '') >= thirty_days_ago]
        if len(submissions['submissions']) != old_count:
            save_json('submissions.json', submissions)
            print(f"Deleted {old_count - len(submissions['submissions'])} old submission records")
def save_chat(messages):
    save_json('chat_messages.json', messages)

@app.route('/faculty-chat')
def faculty_chat():
    """Faculty chat page"""
    return render_template('faculty_chat.html')

@app.route('/api/send_message', methods=['POST'])
def send_message():
    """Send a new chat message (requires authentication)"""
    # Check if user is authenticated
    if not session.get('faculty_authenticated'):
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    name = session.get('faculty_name')  # Use the authenticated name
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'error': 'Message cannot be empty'}), 400
    
    messages = load_chat()
    messages.append({
        'name': name,
        'message': message[:500],
        'timestamp': datetime.now().isoformat()
    })
    save_chat(messages)
    return jsonify({'status': 'ok'})

@app.route('/api/get_messages')
def get_messages():
    """Get all chat messages (only today's)"""
    messages = load_chat()
    return jsonify(messages)

@app.route('/api/upload_chat_file', methods=['POST'])
def upload_chat_file():
    """Upload a file (requires authentication)"""
    if not session.get('faculty_authenticated'):
        return jsonify({'error': 'Not authenticated'}), 401
    
    name = session.get('faculty_name')
    file = request.files.get('file')
    
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    original_filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_filename = f"{timestamp}_{original_filename}"
    file_path = os.path.join(CHAT_UPLOAD_FOLDER, safe_filename)
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    
    messages = load_chat()
    messages.append({
        'name': name,
        'message': f"📎 Shared file: {original_filename}",
        'filename': safe_filename,
        'original_filename': original_filename,
        'file_size': file_size,
        'timestamp': datetime.now().isoformat()
    })
    save_chat(messages)
    
    return jsonify({'status': 'ok', 'filename': safe_filename})

@app.route('/api/download_chat_file/<filename>')
def download_chat_file(filename):
    """Download a shared file from chat"""
    return send_from_directory(CHAT_UPLOAD_FOLDER, filename, as_attachment=True)

# ==================== FACULTY AUTHENTICATION ====================
FACULTY_AUTH_FILE = os.path.join(DATA_DIR, 'faculty_auth.json')

def load_faculty_auth():
    """Load faculty authentication data"""
    auth_data = load_json('faculty_auth.json')
    if auth_data is None:
        auth_data = {}
        save_json('faculty_auth.json', auth_data)
    return auth_data

def save_faculty_auth(auth_data):
    save_json('faculty_auth.json', auth_data)

@app.route('/api/faculty_login', methods=['POST'])
def faculty_login():
    """Authenticate faculty member"""
    data = request.get_json()
    name = data.get('name', '').strip()
    password = data.get('password', '')
    
    # Check if this faculty exists in teachers.json
    teachers = load_json('teachers.json')
    if not teachers:
        return jsonify({'success': False, 'error': 'No faculty data available'}), 400
    
    # Find matching faculty (case-insensitive)
    faculty = None
    for t in teachers:
        if t.get('name', '').lower() == name.lower():
            faculty = t
            break
    
    if not faculty:
        return jsonify({'success': False, 'error': 'Faculty member not found. Please check your name.'}), 401
    
    # Load auth data
    auth_data = load_faculty_auth()
    
    # Check if this faculty has a password set
    if name not in auth_data:
        # First time login - set password
        if not password:
            return jsonify({'success': False, 'error': 'Please set a password', 'first_time': True}), 200
        # Store hashed password
        auth_data[name] = generate_password_hash(password)
        save_faculty_auth(auth_data)
        # Create session
        session['faculty_name'] = name
        session['faculty_authenticated'] = True
        return jsonify({'success': True, 'first_time': True, 'name': name})
    else:
        # Verify password
        if check_password_hash(auth_data[name], password):
            session['faculty_name'] = name
            session['faculty_authenticated'] = True
            return jsonify({'success': True, 'first_time': False, 'name': name})
        else:
            return jsonify({'success': False, 'error': 'Invalid password'}), 401

@app.route('/api/faculty_logout', methods=['POST'])
def faculty_logout():
    """Logout faculty member"""
    session.pop('faculty_name', None)
    session.pop('faculty_authenticated', None)
    return jsonify({'success': True})

@app.route('/api/check_auth')
def check_auth():
    """Check if faculty is authenticated"""
    if session.get('faculty_authenticated'):
        return jsonify({'authenticated': True, 'name': session.get('faculty_name')})
    return jsonify({'authenticated': False})
import threading
import time

import threading
import time
from datetime import datetime, timedelta

# ==================== AUTO CLEANUP SYSTEM ====================

import threading
import time
from datetime import datetime, timedelta

# ==================== AUTO CLEANUP SYSTEM ====================

def cleanup_old_files():
    """Delete files older than 30 days from uploads and chat_files folders"""
    now = datetime.now()
    deleted_count = 0
    
    # 1. Clean up main uploads folder (submission files)
    if os.path.exists(UPLOAD_DIR):
        for filename in os.listdir(UPLOAD_DIR):
            if filename == 'chat_files':
                continue
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(filepath):
                try:
                    file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                    age_days = (now - file_time).days
                    if age_days > 30:
                        os.remove(filepath)
                        deleted_count += 1
                        print(f"Deleted old submission file: {filename} (age: {age_days} days)")
                except Exception as e:
                    print(f"Error deleting {filename}: {e}")
    
    # 2. Clean up chat_files folder
    if os.path.exists(CHAT_UPLOAD_FOLDER):
        for filename in os.listdir(CHAT_UPLOAD_FOLDER):
            filepath = os.path.join(CHAT_UPLOAD_FOLDER, filename)
            if os.path.isfile(filepath):
                try:
                    file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                    age_days = (now - file_time).days
                    if age_days > 7:
                        os.remove(filepath)
                        deleted_count += 1
                        print(f"Deleted old chat file: {filename} (age: {age_days} days)")
                except Exception as e:
                    print(f"Error deleting {filename}: {e}")
    
    if deleted_count == 0:
        print("No old files found to delete.")
    return deleted_count

def run_cleanup_scheduler():
    """Run cleanup every day at midnight"""
    while True:
        now = datetime.now()
        midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        seconds_to_midnight = (midnight - now).total_seconds()
        
        print(f"Next cleanup scheduled in {seconds_to_midnight/3600:.1f} hours")
        time.sleep(seconds_to_midnight)
        
        print(f"Running scheduled cleanup at {datetime.now()}")
        cleanup_old_files()
@app.route('/api/get_today_classes')
def get_today_classes():
    """Get today's class count for a program/section"""
    program = request.args.get('program', 'cyber')
    section = request.args.get('section', 'A')
    timetable_file = f'timetable_{program}_{section}.json'
    timetable = load_json(timetable_file)
    
    if not timetable or 'schedule' not in timetable:
        return jsonify({'count': 0})
    
    current_day = datetime.now().strftime('%A')
    if current_day in timetable['schedule'] and 'classes' in timetable['schedule'][current_day]:
        return jsonify({'count': len(timetable['schedule'][current_day]['classes'])})
    return jsonify({'count': 0})

@app.route('/api/online_faculty_count')
def online_faculty_count():
    """Get count of online faculty members"""
    auth_data = load_faculty_auth()
    # For demo, return count of faculty who have logged in recently
    # You can track last seen timestamps for more accuracy
    return jsonify({'count': len(auth_data)})

@app.route('/api/active_faculty')
def active_faculty():
    """Get list of active faculty"""
    auth_data = load_faculty_auth()
    faculty_list = list(auth_data.keys())
    return jsonify({'count': len(faculty_list), 'faculty': faculty_list})
if __name__=="__main__":
    print("Running initial cleanup on startup...")
    cleanup_old_files()
    cleanup_thread = threading.Thread(target=run_cleanup_scheduler, daemon=True)
    cleanup_thread.start()
    app.run(host='0.0.0.0', port=5000, debug=True)
    
import json

@app.route('/timetable') # Or whichever route corresponds to view_timetable
def view_timetable():
    # 1. Load the data from the folder you just uploaded
    try:
        with open('data/programs.json', 'r') as f:
            programs_dict = json.load(f)
    except FileNotFoundError:
        programs_dict = {}

    # 2. Pass 'programs' to the template
    return render_template('index.html', programs=programs_dict)
@app.route('/generate_204') # Android/Oppo check
@app.route('/library/test/success.html') # Apple check
@app.route('/hotspot-detect.html') # Newer iOS check
def captive_check():
    # Redirecting them to your main app port 5000
    return redirect("http://192.168.1.1:5000/", code=302)
