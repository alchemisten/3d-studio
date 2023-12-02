import bpy

from bpy.props import StringProperty, IntProperty, CollectionProperty, PointerProperty, BoolProperty


class LanguageCodeItem(bpy.types.PropertyGroup):
    bl_idname = "alcm.language_code_item"
    code: bpy.props.StringProperty(name="Language Code", default="")


class TranslationPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.translations"
    language_key: StringProperty(name="Language Key", description="Enter the language key", default="")
    translation: StringProperty(name="Translation", description="Enter the translation", default="")


class I18nPropertyGroup(bpy.types.PropertyGroup):
    name = 'bnre'
    bl_idname = "alcm.i18n"
    value: CollectionProperty(type=TranslationPropertyGroup)
    active_index: IntProperty(name="Active Index", default=0)


def is_i18n_property(obj, property_name):
    return hasattr(obj, property_name) and isinstance(getattr(obj, property_name), I18nPropertyGroup)


def has_i18n_property(obj):
    for attr in dir(obj):
        if is_i18n_property(obj, attr):
            return True


class TranslationUIList(bpy.types.UIList):
    bl_idname = "ALCM_UL_TranslationList"

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):

        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            split = layout.split(factor=0.25)
            split.prop(item, "language_key", text="", emboss=True, translate=False, icon="WORLD")
            split = split.split(factor=1.0)
            row = split.row(align=True)
            row.prop(item, "translation", text="", emboss=True, translate=False, icon="TEXT")
            op = row.operator(RemoveTranslationOperator.bl_idname, text="", icon="X")
            op.index = index
            op.property_name = 'data'

        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            layout.label(text="", icon_value=icon)


class I18nPanel(bpy.types.Panel):
    bl_idname = "ALCM_PT_i18n"
    bl_label = "Translations"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"

    @classmethod
    def poll(cls, context):
        if context.object is None:
            return has_i18n_property(context.scene)
        else:
            return has_i18n_property(context.object)

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        target = context.scene if context.object is None else context.object
        for attr in dir(target):
            if is_i18n_property(target, attr):
                attribute = getattr(target, attr)
                attribute_name = attribute.name if attribute.name else attr
                layout.label(text="Key: {}".format(attribute_name))

                row = layout.row()
                row.template_list(TranslationUIList.bl_idname, "", attribute, "value", attribute, "active_index")

                row = layout.row()
                op = row.operator(AddTranslationOperator.bl_idname, icon='ADD', text="Add Translation")
                op.use_scene = context.object is None
                op.property_name = attr


class AddTranslationOperator(bpy.types.Operator):
    bl_idname = "alcm.scene_add_translation"
    bl_label = "Add Translation"

    use_scene: BoolProperty()
    property_name: StringProperty()

    def execute(self, context):
        target = context.scene if self.use_scene else context.object
        if is_i18n_property(target, self.property_name):
            i18n_property = getattr(target, self.property_name)
            i18n_property.value.add()
            i18n_property.active_index = len(i18n_property.value) - 1
            return {'FINISHED'}
        else:
            return {'CANCELLED'}


class RemoveTranslationOperator(bpy.types.Operator):
    bl_idname = "alcm.scene_remove_translation"
    bl_label = "Remove Translation"

    use_scene: BoolProperty()
    property_name: StringProperty()
    index: bpy.props.IntProperty()

    def execute(self, context):
        target = context.scene if self.use_scene else context.object
        if is_i18n_property(target, self.property_name):
            i18n_property = getattr(target, self.property_name)
            i18n_property.value.remove(self.index)
            i18n_property.active_index = max(0, min(i18n_property.active_index, len(i18n_property.value) - 1))

            return {'FINISHED'}
        else:
            return {'CANCELLED'}

