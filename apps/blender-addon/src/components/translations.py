import bpy

from bpy.props import StringProperty, CollectionProperty

from itertools import chain

all_languages = [
        ("de", "German", "", 1),
        ("en", "English", "", 2)
    ]

language_name_map = {code: name for code, name, _, _ in all_languages}


def available_language_items(self, context):
    if hasattr(context.scene, "studio_settings") and hasattr(context.scene.studio_settings, "languages"):
        used_language_codes = {lang.code for lang in context.scene.studio_settings.languages}
        remaining = [lang for lang in all_languages if lang[0] not in used_language_codes]
        if len(remaining) > 0:
            return remaining
        else:
            return [("null", "Null", "", 0)]
    return all_languages


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



class LanguageCodeItem(bpy.types.PropertyGroup):
    bl_idname = "alcm.i18n_language_code"
    code: StringProperty(name="Language Code", default="")


class TranslationPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.i18n_translation"
    code: StringProperty(name="Language Code", description="Language code", default="")
    translation: StringProperty(name="Translation", description="Translation", default="")


class I18nPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.i18n"
    i18n: CollectionProperty(type=TranslationPropertyGroup)


class I18nPanelBase:
    bl_label = "Translations"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"

    @staticmethod
    def has_i18n_property_group(blender_data):
        if blender_data:
            for prop_name, prop_type in blender_data.bl_rna.properties.items():
                if prop_name.startswith("studio_"):
                    prop_group = getattr(blender_data, prop_name, None)
                    show_i18n_method = getattr(prop_group, "show_i18n", None)
                    if isinstance(prop_group, bpy.types.PropertyGroup) and callable(show_i18n_method) and show_i18n_method():
                        for group_prop_name, _ in prop_group.bl_rna.properties.items():
                            group_prop = getattr(prop_group, group_prop_name, None)
                            if isinstance(group_prop, I18nPropertyGroup):
                                return True

        return False

    def draw(self, context):
        layout = self.layout

        obj = context.object or context.scene
        studio_settings = context.scene.studio_settings

        i18n_props_by_lang = self.gather_i18n_properties(obj, studio_settings.languages)

        if i18n_props_by_lang:
            for lang_code, props in i18n_props_by_lang.items():
                box = layout.box()
                box.label(text=f"{language_name_map.get(lang_code, 'Unknown')} Translations", icon='WORLD_DATA')
                for prop_name, prop in props.items():
                    row = box.row()
                    row.prop(prop, "translation", text=prop_name.replace('_', ' ').title())
        else:
            layout.label(text="No i18n properties found.")

    def gather_i18n_properties(self, obj, languages):
        i18n_props_by_lang = {lang.code: {} for lang in languages}
        for prop_name, _ in obj.bl_rna.properties.items():
            if prop_name.startswith("studio_") and isinstance(getattr(obj, prop_name, None), bpy.types.PropertyGroup):
                studio_prop_group = getattr(obj, prop_name)
                show_i18n_method = getattr(studio_prop_group, "show_i18n", None)
                if callable(show_i18n_method) and show_i18n_method():
                    for group_prop_name, _ in studio_prop_group.bl_rna.properties.items():
                        prop = getattr(studio_prop_group, group_prop_name, None)
                        if isinstance(prop, I18nPropertyGroup):
                            for lang in prop.i18n:
                                if lang.code in i18n_props_by_lang:
                                    i18n_props_by_lang[lang.code][group_prop_name] = lang
        return i18n_props_by_lang


class I18nObjectPanel(I18nPanelBase, bpy.types.Panel):
    bl_idname = "ALCM_PT_i18n_object"
    bl_context = "object"

    @classmethod
    def poll(cls, context):
        return context.object and cls.has_i18n_property_group(context.object)
    

class I18nScenePanel(I18nPanelBase, bpy.types.Panel):
    bl_idname = "ALCM_PT_i18n_scene"
    bl_context = "scene"

    @classmethod
    def poll(cls, context):
        return context.scene and cls.has_i18n_property_group(context.scene)
    

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
