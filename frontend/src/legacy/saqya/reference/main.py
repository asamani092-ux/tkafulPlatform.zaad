import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS

# استيراد قاعدة البيانات والنماذج
from src.models.user import db, User, Supplier, Representative
from src.models.sponsorship import Sponsorship, Order
from src.models.financial import Invoice, Payment, Documentation

# استيراد المسارات
from src.routes.user import user_bp
from src.routes.auth import auth_bp
from src.routes.sponsorship import sponsorship_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# إعداد CORS للسماح بالطلبات من أي مصدر
CORS(app)

# إعدادات التطبيق
app.config['SECRET_KEY'] = 'saqya_platform_secret_key_2024'
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# إعدادات رفع الملفات
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')

# إنشاء مجلد الرفع إذا لم يكن موجوداً
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# تسجيل المسارات
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(sponsorship_bp, url_prefix='/api')

# تهيئة قاعدة البيانات
db.init_app(app)

with app.app_context():
    # إنشاء جميع الجداول
    db.create_all()
    
    # إنشاء مستخدم مشرف افتراضي إذا لم يكن موجوداً
    admin_user = User.query.filter_by(email='admin@alzad.org').first()
    if not admin_user:
        admin_user = User(
            name='مشرف النظام',
            email='admin@alzad.org',
            phone='+966500000000',
            role='admin',
            status='active'
        )
        admin_user.set_password('admin123')
        db.session.add(admin_user)
        db.session.commit()
        print("تم إنشاء مستخدم المشرف الافتراضي")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """خدمة الملفات الثابتة والواجهة الأمامية"""
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

@app.route('/api/health')
def health_check():
    """فحص صحة النظام"""
    return {
        'status': 'healthy',
        'message': 'منصة كفالات السقيا - جمعية الزاد',
        'version': '1.0.0'
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

