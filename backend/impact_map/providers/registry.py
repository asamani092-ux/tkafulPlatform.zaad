"""اختيار المزوّد المناسب حسب MapProject.source_type."""
from .native import NativeProvider
from .saqya import SaqyaProvider


def get_provider(project):
    if project.source_type == "saqya":
        return SaqyaProvider(project)
    return NativeProvider(project)
