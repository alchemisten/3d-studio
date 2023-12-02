import bpy

from bpy.props import PointerProperty, StringProperty, CollectionProperty
from .components.translations import LanguageCodeItem


class StudioSettingsPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.studio_settings"
    resource_id: StringProperty(name="Resource ID", description="Enter the resource ID", default="")
    available_languages: CollectionProperty(type=LanguageCodeItem, name="Languages")


class StudioSettingsPanel(bpy.types.Panel):
    bl_idname = "ALCM_PT_studio_settings"
    bl_label = "WebGL Studio"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "scene"

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        studio_settings = context.scene.studio_settings

        layout.prop(scene.studio_settings, "resource_id")

        # UI List for available_languages
        box = layout.box()
        box.label(text="Available Languages:")
        for i, lang_item in enumerate(studio_settings.available_languages):
            row = box.row()
            row.prop(lang_item, "code", text="Language Code")
            remove_op = row.operator("alcm.remove_language", text="", icon='X')
            remove_op.index = i

        # Add/Remove buttons
        row = layout.row()
        row.operator("alcm.add_language", text="Add Language", icon='ADD')


class AddLanguageOperator(bpy.types.Operator):
    bl_idname = "alcm.add_language"
    bl_label = "Add Language"

    def execute(self, context):
        item = context.scene.studio_settings.available_languages.add()
        item.code = "New Language"
        return {'FINISHED'}


class RemoveLanguageOperator(bpy.types.Operator):
    bl_idname = "alcm.remove_language"
    bl_label = "Remove Language"

    index: bpy.props.IntProperty()

    @classmethod
    def poll(cls, context):
        return len(context.scene.studio_settings.available_languages) > 0

    def execute(self, context):
        languages = context.scene.studio_settings.available_languages
        if self.index < len(languages):
            languages.remove(self.index)
        return {'FINISHED'}


def register():
    bpy.types.Scene.studio_settings = PointerProperty(type=StudioSettingsPropertyGroup)
    # bpy.types.Scene.i18nName = PointerProperty(type=I18nPropertyGroup, name="Name")
    # bpy.types.Scene.i18nDescription = PointerProperty(type=I18nPropertyGroup, name="Description")
