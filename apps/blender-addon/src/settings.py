import bpy

from bpy.props import PointerProperty, StringProperty, CollectionProperty, EnumProperty
from .components.translations import LanguageCodeItem


all_languages = [
        ("de", "German", "", 1),
        ("en", "English", "", 2)
    ]

language_name_map = {code: name for code, name, _, _ in all_languages}


def get_available_languages(self, context):
    if hasattr(context.scene, "studio_settings") and hasattr(context.scene.studio_settings, "languages"):
        used_language_codes = {lang.code for lang in context.scene.studio_settings.languages}
        return [lang for lang in all_languages if lang[0] not in used_language_codes]
    else:
        return all_languages
    

class StudioSettingsPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.studio_settings"
    resource_id: StringProperty(name="Resource ID", description="Enter the resource ID", default="")
    languages: CollectionProperty(type=LanguageCodeItem, name="Languages")
    available_languages: EnumProperty(items=get_available_languages, name="Available Languages")


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

        # UI BOX for languages
        box = layout.box()

        row = box.row()
        row.label(text="Languages:")
        for i, lang_item in enumerate(studio_settings.languages):
            row = box.row()
            row.label(text=f"{language_name_map.get(lang_item.code)}")
            remove_op = row.operator("alcm.remove_language", text="", icon='X')
            remove_op.index = i
    
        # Check if the enum has any items
        enum_items = get_available_languages(self, context)
        if enum_items:
            box.label(text="Available Languages:")
            row = box.row()
            row.prop(studio_settings, "available_languages", text="Add")
            # Add buttons
            row = box.row()
            op = row.operator("alcm.add_language", text="Add Language", icon='ADD')
            op.code = studio_settings.available_languages
        else:
            layout.label(text="All available language keys are used.")


class AddLanguageOperator(bpy.types.Operator):
    bl_idname = "alcm.add_language"
    bl_label = "Add Language"

    code: bpy.props.StringProperty()

    def execute(self, context):
        studio_settings = context.scene.studio_settings
        used_codes = [lang.code for lang in studio_settings.languages] + [self.code]
        available_languages = [lang for lang in all_languages if lang[0] not in used_codes]
      
        if available_languages:
            studio_settings.available_languages = available_languages[0][0]

        lang = studio_settings.languages.add()
        lang.code = self.code
        return {'FINISHED'}


class RemoveLanguageOperator(bpy.types.Operator):
    bl_idname = "alcm.remove_language"
    bl_label = "Remove Language"

    index: bpy.props.IntProperty()

    @classmethod
    def poll(cls, context):
        return len(context.scene.studio_settings.languages) > 0

    def execute(self, context):
        studio_settings = context.scene.studio_settings
        languages = studio_settings.languages
        if self.index < len(languages):
            languages.remove(self.index)
        return {'FINISHED'}


def register():
    bpy.types.Scene.studio_settings = PointerProperty(type=StudioSettingsPropertyGroup)


def unregister():
    del bpy.types.Scene.studio_settings