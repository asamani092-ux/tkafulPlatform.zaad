"""الواجهة الموحّدة لمزوّدات بيانات الخارطة."""


class MapDataProvider:
    """
    عقد موحّد: markers()/regions()/kpis() تُعيد قوائم/عناصر PDPL-safe فقط.
    يقرأ إعداد الأدوات (ProjectMapLayer) لتطبيق الأيقونة/اللون/التفعيل لكل طبقة.
    """

    def __init__(self, project):
        self.project = project
        # فهرسة الطبقات المفعّلة: (layer_key, marker_type) → ProjectMapLayer
        self._layers = {
            (layer.layer_key, layer.marker_type): layer
            for layer in project.layers.filter(enabled=True)
        }
        self._has_layers = project.layers.exists()

    def layer_conf(self, layer_key, marker_type=""):
        return self._layers.get((layer_key, marker_type)) or self._layers.get((layer_key, ""))

    def is_enabled(self, layer_key, marker_type=""):
        # إن لم تُضبط أي طبقة بعد، تُعرض الطبقات افتراضياً (توافق خلفي).
        if not self._has_layers:
            return True
        return self.layer_conf(layer_key, marker_type) is not None

    def style(self, layer_key, marker_type=""):
        conf = self.layer_conf(layer_key, marker_type)
        return {
            "icon_key": (conf.icon_key if conf and conf.icon_key else self.project.icon_key),
            "color": (conf.color if conf and conf.color else self.project.color),
        }

    # يُعاد تعريفها في المزوّدات
    def markers(self):
        return []

    def regions(self):
        return []

    def kpis(self):
        return []
