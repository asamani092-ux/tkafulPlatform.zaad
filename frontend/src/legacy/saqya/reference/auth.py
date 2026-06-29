from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import check_password_hash
import jwt
from datetime import datetime, timedelta
from functools import wraps

from src.models.user import db, User

auth_bp = Blueprint('auth', __name__)

def token_required(f):
    """ديكوريتر للتحقق من صحة التوكن"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # البحث عن التوكن في الهيدر
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer TOKEN
            except IndexError:
                return jsonify({'message': 'تنسيق التوكن غير صحيح'}), 401
        
        if not token:
            return jsonify({'message': 'التوكن مطلوب'}), 401
        
        try:
            # فك تشفير التوكن
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'المستخدم غير موجود'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'التوكن منتهي الصلاحية'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'التوكن غير صحيح'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """ديكوريتر للتحقق من صلاحيات المشرف"""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'message': 'صلاحيات المشرف مطلوبة'}), 403
        return f(current_user, *args, **kwargs)
    
    return decorated

@auth_bp.route('/login', methods=['POST'])
def login():
    """تسجيل الدخول"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'البريد الإلكتروني وكلمة المرور مطلوبان'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({'message': 'البريد الإلكتروني أو كلمة المرور غير صحيحة'}), 401
        
        if user.status != 'active':
            return jsonify({'message': 'الحساب غير نشط'}), 401
        
        # إنشاء التوكن
        token = jwt.encode({
            'user_id': user.id,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'message': 'تم تسجيل الدخول بنجاح',
            'token': token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'خطأ في تسجيل الدخول: {str(e)}'}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """تسجيل مستخدم جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['name', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} مطلوب'}), 400
        
        # التحقق من صحة الدور
        valid_roles = ['admin', 'supplier', 'representative', 'donor']
        if data['role'] not in valid_roles:
            return jsonify({'message': 'الدور غير صحيح'}), 400
        
        # التحقق من عدم وجود المستخدم مسبقاً
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'message': 'البريد الإلكتروني مستخدم مسبقاً'}), 400
        
        # إنشاء المستخدم الجديد
        new_user = User(
            name=data['name'],
            email=data['email'],
            phone=data.get('phone'),
            role=data['role'],
            status='active'
        )
        new_user.set_password(data['password'])
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'تم إنشاء الحساب بنجاح',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'خطأ في إنشاء الحساب: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """الحصول على بيانات المستخدم الحالي"""
    return jsonify({
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """تحديث بيانات المستخدم"""
    try:
        data = request.get_json()
        
        # تحديث البيانات المسموحة
        if data.get('name'):
            current_user.name = data['name']
        if data.get('phone'):
            current_user.phone = data['phone']
        
        # تحديث كلمة المرور إذا تم توفيرها
        if data.get('password'):
            current_user.set_password(data['password'])
        
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'تم تحديث البيانات بنجاح',
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'خطأ في تحديث البيانات: {str(e)}'}), 500

@auth_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_users(current_user):
    """الحصول على قائمة المستخدمين (للمشرف فقط)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        role = request.args.get('role')
        
        query = User.query
        
        # تصفية حسب الدور إذا تم تحديده
        if role:
            query = query.filter_by(role=role)
        
        users = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'users': [user.to_dict() for user in users.items],
            'total': users.total,
            'pages': users.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'خطأ في جلب المستخدمين: {str(e)}'}), 500

@auth_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@token_required
@admin_required
def update_user_status(current_user, user_id):
    """تحديث حالة المستخدم (للمشرف فقط)"""
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        if not data.get('status'):
            return jsonify({'message': 'الحالة مطلوبة'}), 400
        
        valid_statuses = ['active', 'inactive', 'suspended']
        if data['status'] not in valid_statuses:
            return jsonify({'message': 'الحالة غير صحيحة'}), 400
        
        user.status = data['status']
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'تم تحديث حالة المستخدم بنجاح',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'خطأ في تحديث الحالة: {str(e)}'}), 500

