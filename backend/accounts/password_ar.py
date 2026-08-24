"""ترجمة رسائل التحقق من كلمة المرور إلى العربية — O(n) على عدد الرسائل."""


def password_errors_to_ar(messages: list[str]) -> list[str]:
    out: list[str] = []
    for msg in messages:
        lower = msg.lower()
        if any("\u0600" <= ch <= "\u06FF" for ch in msg):
            out.append(msg)
        elif "too short" in lower or "at least" in lower or "minimum" in lower:
            out.append("كلمة المرور قصيرة جداً (8 أحرف على الأقل).")
        elif "too common" in lower or ("common" in lower and "password" in lower):
            out.append("كلمة المرور شائعة جداً — اختر كلمة أقوى.")
        elif "entirely numeric" in lower or "numeric" in lower:
            out.append("لا يمكن أن تكون كلمة المرور أرقاماً فقط.")
        elif "too similar" in lower or "similar" in lower:
            out.append("كلمة المرور قريبة جداً من بياناتك الشخصية.")
        elif "required" in lower or "blank" in lower:
            out.append("كلمة المرور الجديدة مطلوبة.")
        else:
            out.append("تعذّر قبول كلمة المرور — اختر كلمة أقوى وحاول مرة أخرى.")
    return out
