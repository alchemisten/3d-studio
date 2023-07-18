import bpy

from bpy.props import PointerProperty, CollectionProperty, StringProperty, IntProperty, FloatVectorProperty


class TranslationPropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.cv_translations"
    language_key: StringProperty(name="Language Key", description="Enter the language key", default="")
    translation: StringProperty(name="Translation", description="Enter the translation", default="")


class ResourcePropertyGroup(bpy.types.PropertyGroup):
    bl_idname = "alcm.cv_resource"
    resource_id: StringProperty(name="Resource ID", description="Enter the resource ID", default="")
    name: CollectionProperty(type=TranslationPropertyGroup, name="Name")
    active_index: IntProperty(name="Active Index")


class AddTranslationOperator(bpy.types.Operator):
    bl_idname = "alcm.cv_scene_add_translation"
    bl_label = "Add Translation"

    def execute(self, context):
        context.scene.content_viewer.name.add()
        context.scene.content_viewer.active_index = len(context.scene.content_viewer.name) - 1
        return {'FINISHED'}


class RemoveTranslationOperator(bpy.types.Operator):
    bl_idname = "alcm.cv_scene_remove_translation"
    bl_label = "Remove Translation"

    index: bpy.props.IntProperty()

    def execute(self, context):
        context.scene.content_viewer.name.remove(self.index)
        context.scene.content_viewer.active_index = max(0, min(context.scene.content_viewer.active_index,
                                                               len(context.scene.content_viewer.name) - 1))
        return {'FINISHED'}


class TranslationUIList(bpy.types.UIList):
    bl_idname = "alcm.cv_ui_TranslationUIList"

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):

        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            split = layout.split(factor=0.25)
            split.prop(item, "language_key", text="", emboss=True, translate=False, icon="WORLD")
            split = split.split(factor=1.0)
            row = split.row(align=True)
            row.prop(item, "translation", text="", emboss=True, translate=False, icon="TEXT")
            row.operator("alcm.cv_scene_remove_translation", text="", icon="X").index = index

        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            layout.label(text="", icon_value=icon)


class ResourceSettingsPanel(bpy.types.Panel):
    bl_label = "Content Viewer"
    bl_idname = "alcm.cv_scene_resource_settings"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "scene"

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        layout.prop(scene.content_viewer, "resource_id")

        layout.label(text="Name Translations:")

        row = layout.row()
        row.template_list("alcm.cv_ui_TranslationUIList", "", scene.content_viewer, "name", scene.content_viewer, "active_index")

        row = layout.row()
        row.operator("alcm.cv_scene_add_translation", icon='ADD', text="Add Translation")


def register():
    bpy.types.Scene.content_viewer = PointerProperty(type=ResourcePropertyGroup)
