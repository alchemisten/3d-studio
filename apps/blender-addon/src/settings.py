import bpy

from bpy.props import PointerProperty, StringProperty, CollectionProperty, EnumProperty
from .components.translations import LanguageCodeItem, I18nPropertyGroup, language_name_map, available_language_items


class StudioSettingsPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.studio_settings"
    resource_id: StringProperty(name="Resource ID", description="Enter the resource ID", default="")
    languages: CollectionProperty(type=LanguageCodeItem, name="Languages")
    available_languages: EnumProperty(items=available_language_items, name="Available Languages")
    title: PointerProperty(name="Title", type=I18nPropertyGroup)

    def show_i18n(self):
        """Determine whether to show the I18n panel based on resource_id."""
        return self.resource_id != ""


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

        # Actions
        if studio_settings.resource_id == "":
            layout.operator("alcm.import_legacy_webgl_project", icon='IMPORT')  


        # UI BOX for languages
        box = layout.box()

        row = box.row()
        row.label(text="Languages:")
        for i, lang_item in enumerate(studio_settings.languages):
            row = box.row()
            row.label(text=f"{language_name_map.get(lang_item.code)}")
            remove_op = row.operator("alcm.remove_language", text="", icon='X')
            remove_op.index = i

        # Check if any more languages to add
        enum_items = available_language_items(self, context)
        if enum_items and len(enum_items) > 0 and enum_items[0][0] != "null":
            box.label(text="Available Languages:")
            row = box.row()
            row.prop(studio_settings, "available_languages", text="Add")
            # Add buttons
            row = box.row()
            op = row.operator("alcm.add_language", text="Add Language", icon='ADD')
            op.code = studio_settings.available_languages
        else:
            row = box.row()
            row.label(text="All available language keys are used.")


def register():
    bpy.types.Scene.studio_settings = PointerProperty(type=StudioSettingsPropertyGroup)


def unregister():
    del bpy.types.Scene.studio_settings
