"""ترجمة رسائل التحقق من كلمة المرور إلى العربية — O(n) على عدد الرسائل."""


def password_errors_to_ar(messages: list[str]) -> list[str]:
    out: list[str] = []
    for msg in messages:
        lower = msg.lower()
        if "too short" in lower or "at least" in lower:
            out.append("كلمة المرور قصيرة جداً (8 أحرف على الأقل).")
        elif "too common" in lower:
            out.append("كلمة المرور شائعة جداً — اختر كلمة أقوى.")
        elif "entirely numeric" in lower:
            out.append("لا يمكن أن تكون كلمة المرور أرقاماً فقط.")
        elif "too similar" in lower:
            out.append("كلمة المرور قريبة جداً من بياناتك الشخصية.")
        else:
            out.append(msg)
    return out
