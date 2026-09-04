from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Profile
from .admin_users import ROLE_VALUES, MSG_INVALID_ROLE


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "role",
            "name",
            "phone",
            "city",
            "gender",
            "age",
            "qualification",
            "skills",
            "available_days",
            "must_reset_password",
            "created_at",
        ]
        read_only_fields = ["must_reset_password"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "username", "profile"]


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for user registration - matches frontend payload exactly
    """
    # User fields
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    
    # Profile fields - matching frontend exactly
    name = serializers.CharField(required=True, max_length=150)
    gender = serializers.ChoiceField(choices=["ذكر", "أنثى"], required=True)
    age = serializers.IntegerField(required=True, min_value=18, max_value=65)
    city = serializers.CharField(required=True, max_length=100)
    phone = serializers.CharField(required=True, max_length=30)
    qualification = serializers.CharField(required=True, max_length=100)
    national_id = serializers.CharField(required=False, allow_blank=True, max_length=20)
    region = serializers.CharField(required=False, allow_blank=True, max_length=100)
    available_days = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    skills = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )

    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("البريد الإلكتروني مسجل مسبقاً")
        return value.lower()

    def validate_phone(self, value):
        """Validate Saudi phone number format"""
        # Remove any non-digits
        digits = ''.join(filter(str.isdigit, value))
        
        # Must be 9 digits starting with 5
        if len(digits) != 9 or not digits.startswith('5'):
            raise serializers.ValidationError("رقم الجوال يجب أن يبدأ بـ 5 ويحتوي على 9 أرقام")
        
        return digits

    def create(self, validated_data):
        """Create user and associated profile"""
        # Extract profile data
        profile_data = {
            'name': validated_data.pop('name'),
            'gender': validated_data.pop('gender'),
            'age': validated_data.pop('age'),
            'city': validated_data.pop('city'),
            'phone': validated_data.pop('phone'),
            'qualification': validated_data.pop('qualification'),
            'available_days': validated_data.pop('available_days', []),
            'skills': validated_data.pop('skills', []),
            'national_id': validated_data.pop('national_id', ''),
            'region': validated_data.pop('region', ''),
            'external_source': 'web',
        }
        
        # Create user (username = email for simplicity)
        email = validated_data['email']
        user = User.objects.create_user(
            username=email,  # Use email as username
            email=email,
            password=validated_data['password']
        )
        
        # Update the auto-created profile (from signals.py)
        profile = user.profile
        for key, value in profile_data.items():
            setattr(profile, key, value)
        profile.save()

        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that allows login with email instead of username
    Frontend sends email as 'username' field, this serializer handles the conversion
    """
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        # Get the credentials (frontend sends email as 'username')
        credentials = {
            'username': attrs.get('username'),
            'password': attrs.get('password')
        }

        # Try to find user by email
        username_or_email = credentials.get('username')
        if username_or_email and '@' in username_or_email:
            try:
                user = User.objects.get(email=username_or_email)
                # Replace email with actual username
                credentials['username'] = user.username
                attrs['username'] = user.username
            except User.DoesNotExist:
                pass

        data = super().validate(attrs)
        # بوابة الأدوار: بعد نجاح كلمة المرور، ارفض الدور المعطّل في الإعدادات — بلا توكن.
        from core.runtime_config import role_can_login

        role = getattr(getattr(self.user, "profile", None), "role", None) or "user"
        if not role_can_login(role):
            raise serializers.ValidationError(
                {"detail": "تسجيل الدخول غير مفعّل لهذا الدور على هذه المنصّة"}
            )
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    """قائمة/تفاصيل مستخدم للإدارة — بلا كلمات مرور أو هاشات."""

    name = serializers.CharField(source="profile.name", read_only=True)
    role = serializers.CharField(source="profile.role", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "role",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class AdminUserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    name = serializers.CharField(required=True, max_length=150)
    role = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    national_id = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            raise serializers.ValidationError("البريد الإلكتروني مسجّل مسبقاً")
        return email

    def validate_role(self, value):
        if value not in ROLE_VALUES:
            raise serializers.ValidationError(MSG_INVALID_ROLE)
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
        )
        profile = user.profile
        profile.name = validated_data["name"]
        profile.role = validated_data["role"]
        profile.city = validated_data.get("city") or ""
        profile.phone = validated_data.get("phone") or ""
        profile.national_id = validated_data.get("national_id") or ""
        # متطوّع يُنشأ من الإدارة يكون معتمداً فوراً ليظهر في نطاق المتطوعين
        if profile.role == "user":
            profile.is_approved = True
        profile.save(update_fields=["name", "role", "city", "phone", "national_id", "is_approved"])
        return user


class AdminUserUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=150)
    role = serializers.CharField(required=False)
    is_active = serializers.BooleanField(required=False)
    city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    national_id = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate_role(self, value):
        if value not in ROLE_VALUES:
            raise serializers.ValidationError(MSG_INVALID_ROLE)
        return value