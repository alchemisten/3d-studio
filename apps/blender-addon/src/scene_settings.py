import bpy

from bpy.props import PointerProperty, StringProperty

from .components.translations import I18nPropertyGroup


class ResourcePropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.cv_resource"
    resource_id: StringProperty(name="Resource ID", description="Enter the resource ID", default="")
    #  active_index: IntProperty(name="Active Index")


class ResourceSettingsPanel(bpy.types.Panel):
    bl_idname = "alcm.cv_scene_resource_settings"
    bl_label = "Content Viewer"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "scene"

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        layout.prop(scene.content_viewer, "resource_id")


def register():
    bpy.types.Scene.content_viewer = PointerProperty(type=ResourcePropertyGroup)
    bpy.types.Scene.i18nName = PointerProperty(type=I18nPropertyGroup, name="Name")
    bpy.types.Scene.i18nDescription = PointerProperty(type=I18nPropertyGroup, name="Description")
