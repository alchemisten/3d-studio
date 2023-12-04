import bpy

from bpy.props import PointerProperty, StringProperty, CollectionProperty, EnumProperty
from .components.translations import LanguageCodeItem, I18nPropertyGroup, all_languages, language_name_map

from itertools import chain

def available_language_items(self, context):
    if hasattr(context.scene, "studio_settings") and hasattr(context.scene.studio_settings, "languages"):
        used_language_codes = {lang.code for lang in context.scene.studio_settings.languages}
        remaining = [lang for lang in all_languages if lang[0] not in used_language_codes]
        if len(remaining) > 0:
            return remaining
        else:
            return [("null", "Null", "", 0)]
    return all_languages

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


def update_languages(self, context):
    scene = context.scene
    studio_settings = scene.studio_settings  # Assuming this is where the languages are stored

    # Extract the set of language codes from studio_settings
    desired_language_codes = {lang.code for lang in studio_settings.languages}

    # Iterate over all objects in the scene
    for obj in chain(scene.objects, [scene]):
        # Check each property group in the object
        for prop_name, _ in obj.bl_rna.properties.items():
            if prop_name.startswith("studio_") and isinstance(getattr(obj, prop_name, None), bpy.types.PropertyGroup):
                studio_prop_group = getattr(obj, prop_name)

                # Check for properties of type I18nPropertyGroup
                for group_prop_name, _ in studio_prop_group.bl_rna.properties.items():
                    group_prop = getattr(studio_prop_group, group_prop_name, None)
                    if isinstance(group_prop, I18nPropertyGroup):
                        # Ensure that i18n_group has entries for all desired languages
                        existing_codes = {lang.code for lang in group_prop.i18n}
                        for code in desired_language_codes:
                            if code not in existing_codes:
                                new_lang = group_prop.i18n.add()
                                new_lang.code = code

                        # Remove languages not in desired_language_codes
                        for index, lang in reversed(list(enumerate(group_prop.i18n))):
                            if lang.code not in desired_language_codes:
                                group_prop.i18n.remove(index)


class AddLanguageOperator(bpy.types.Operator):
    bl_idname = "alcm.add_language"
    bl_label = "Add Language"

    code: bpy.props.StringProperty()

    def execute(self, context):
        studio_settings = context.scene.studio_settings

        lang = studio_settings.languages.add()
        lang.code = self.code

        available_languages = available_language_items(self, context)

        if available_languages:
            studio_settings.available_languages = available_languages[0][0]

        update_languages(self, context)
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

        available_languages = available_language_items(self, context)

        if available_languages:
            studio_settings.available_languages = available_languages[0][0]

        update_languages(self, context)
        return {'FINISHED'}


def register():
    bpy.types.Scene.studio_settings = PointerProperty(type=StudioSettingsPropertyGroup)


def unregister():
    del bpy.types.Scene.studio_settings
