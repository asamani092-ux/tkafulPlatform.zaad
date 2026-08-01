"""shim توافق: انتقلت الـ views إلى volunteering.views (D-02).
يُبقي `IsAdmin` متاحاً هنا لأن impact_map وغيرها كانت تستورده من هذا المسار."""
from volunteering.views import *  # noqa: F401,F403
from volunteering.views import IsAdmin  # noqa: F401
