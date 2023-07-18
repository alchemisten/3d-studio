import bpy


class AddHighlightOperator(bpy.types.Operator):
    bl_idname = "alcm.cv_highlight_add_operator"
    bl_label = "Add Highlight"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        # Create the main empty object
        bpy.ops.object.empty_add(location=(0, 0, 0), type="CIRCLE")
        main_object = bpy.context.active_object
        main_object.name = "Highlight"

        # Create the child camera object
        bpy.ops.object.camera_add(location=(0, 0, 0))
        camera = bpy.context.active_object
        camera.name = "Camera"
        camera.parent = main_object

        # Create the child target point object
        bpy.ops.object.empty_add(location=(0, 0, -1)) # Positioned to face downwards
        target = bpy.context.active_object
        target.name = "Target"
        target.parent = main_object

        # Create the child target point object
        bpy.ops.object.empty_add(location=(0, 0, 0)) # Positioned to face downwards
        click_zone = bpy.context.active_object
        click_zone.name = "Click Zone"
        click_zone.parent = main_object

        # Set the camera's constraints to track to the target object
        track_constraint = camera.constraints.new(type='TRACK_TO')
        track_constraint.target = target
        track_constraint.track_axis = 'TRACK_NEGATIVE_Z'
        track_constraint.up_axis = 'UP_Y'

        return {'FINISHED'}


class AddHighlightPanel(bpy.types.Panel):
    bl_idname = "ALCM_CV_PT_highlight_add"
    bl_label = "Add Highlight"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Create"

    def draw(self, context):
        layout = self.layout
        layout.operator("alcm.cv_highlight_add_operator")


class ContentViewerMenu(bpy.types.Menu):
    bl_idname = "ALCM_CV_MT_menu"
    bl_label = "Content Viewer"

    def draw(self, context):
        layout = self.layout
        layout.operator(AddHighlightOperator.bl_idname)


def draw_func(self, context):
    layout = self.layout
    layout.menu(ContentViewerMenu.bl_idname)


def register():
    bpy.types.VIEW3D_MT_add.append(draw_func)


def unregister():
    bpy.types.VIEW3D_MT_add.remove(draw_func)