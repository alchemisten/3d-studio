import bpy

from bpy.props import StringProperty

class MessageBoxOperator(bpy.types.Operator):
    bl_idname = "alcm.message_box_operator"
    bl_label = "WebGL Studio Message"

    message: StringProperty(default="Message")

    def execute(self, context):
        self.report({'INFO'}, self.message)
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self, width=400)

    def draw(self, context):
        self.layout.label(text=self.message)
