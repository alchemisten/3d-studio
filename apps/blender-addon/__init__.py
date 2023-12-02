bl_info = {
    "name": "WebGL Studio Exporter",
    "author": "Alchemisten AG",
    "description": "Enables you to directly export to WebGL Studio",
    "blender": (3, 6, 0),
    "version": (0, 0, 1),
    "location": "",
    "warning": "",
    "category": "Generic"
}

from . import auto_load

auto_load.init()


def register():
    auto_load.register()


def unregister():
    auto_load.unregister()
