import bpy

from bpy.props import StringProperty, IntProperty, CollectionProperty, PointerProperty, BoolProperty


def check_for_i18n_property(obj, prop_name_prefix):
    if hasattr(obj, "__annotations__"):
        for prop_name, prop_type in obj.__annotations__.items():
            if prop_name.startswith(prop_name_prefix) and prop_type == bpy.types.I18nPropertyGroup:
                return True
            elif hasattr(obj, prop_name):
                sub_obj = getattr(obj, prop_name)
                if check_for_i18n_property(sub_obj, ""):
                    return True
    return False


class LanguageCodeItem(bpy.types.PropertyGroup):
    bl_idname = "alcm.i18n_language_code"
    code: bpy.props.StringProperty(name="Language Code", default="")


class TranslationPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.i18n_translation"
    code: StringProperty(name="Language Code", description="Language code", default="")
    translation: StringProperty(name="Translation", description="Translation", default="")


class I18nPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.i18n"
    i18n: CollectionProperty(type=TranslationPropertyGroup)


class I18nPanel(bpy.types.Panel):
    bl_idname = "ALCM_PT_i18n"
    bl_label = "Translations"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"

    @classmethod
    def poll(cls, context):
        return check_for_i18n_property(context, "studio_") or check_for_i18n_property(context.scene, "studio_")

    def draw(self, context):
        layout = self.layout
        