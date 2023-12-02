import bpy
from mathutils import Vector


class HighlightPropertyGroup(bpy.types.PropertyGroup):
    name = "Highlight"
    bl_idname = "alcm.highlight"
    highlight_id: bpy.props.StringProperty(name="Highlight ID")


class AddHighlightOperator(bpy.types.Operator):
    bl_idname = "alcm.highlight_add_operator"
    bl_label = "Add Highlight"
    bl_options = {'REGISTER', 'UNDO'}

    highlight_id: bpy.props.StringProperty(name="Highlight ID")

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)

    def execute(self, context):
        # Check/Create the 'WebGL Studio' collection
        if 'WebGL Studio' not in bpy.data.collections:
            webgl_studio_collection = bpy.data.collections.new('WebGL Studio')
            context.scene.collection.children.link(webgl_studio_collection)
        else:
            webgl_studio_collection = bpy.data.collections['WebGL Studio']

        # Check/Create the 'Highlights' collection inside 'WebGL Studio'
        if 'Highlights' not in webgl_studio_collection.children:
            highlight_collection = bpy.data.collections.new('Highlights')
            webgl_studio_collection.children.link(highlight_collection)
        else:
            highlight_collection = webgl_studio_collection.children['Highlights']

        highlight_name = f"Highlight {self.highlight_id}"

        # Check if highlight with the same ID already exists
        if any(obj.name.lower() == highlight_name.lower() for obj in highlight_collection.objects):
            # Call the message box operator with the error message
            bpy.ops.alcm.message_box_operator('INVOKE_DEFAULT',
                                              message=f"A highlight with ID '{self.highlight_id}' already exists.")
            return {'CANCELLED'}

        # Store the current active collection
        current_active_collection = context.view_layer.active_layer_collection

        # Deselect all objects
        bpy.ops.object.select_all(action='DESELECT')

        # Set 'Highlights' as the active collection
        context.view_layer.active_layer_collection = \
        context.view_layer.layer_collection.children['WebGL Studio'].children['Highlights']

        # Create the main empty object
        bpy.ops.object.empty_add(location=(0, 0, 0), type="CIRCLE")
        main_object = bpy.context.active_object
        main_object.name = highlight_name
        main_object.studio_highlight.highlight_id = self.highlight_id

        # Add main_object to the 'Highlights' collection
        if main_object.name not in highlight_collection.objects:
            highlight_collection.objects.link(main_object)

        # Create the child camera object
        bpy.ops.object.camera_add(location=(0, 0, 0))
        camera = bpy.context.active_object
        camera.name = f"Camera {self.highlight_id}"
        camera.parent = main_object

        # Create the child target point object at view direction but 2 units in front
        view_direction = context.region_data.view_rotation @ Vector((0, 0, -2))
        target_location = context.region_data.view_location + view_direction
        bpy.ops.object.empty_add(location=target_location)
        target = bpy.context.active_object
        target.name = f"Target {self.highlight_id}"
        target.parent = main_object

        # Create the child click zone object
        click_zone_location = (camera.location + target.location) / 2
        click_zone_location.x += 0.1  # Slightly to the right
        bpy.ops.object.empty_add(location=click_zone_location)
        click_zone = bpy.context.active_object
        click_zone.name = f"Click Zone {self.highlight_id}"
        click_zone.parent = main_object

        # Set the camera's constraints to track to the target object
        track_constraint = camera.constraints.new(type='TRACK_TO')
        track_constraint.target = target
        track_constraint.track_axis = 'TRACK_NEGATIVE_Z'
        track_constraint.up_axis = 'UP_Y'

        # Restore the original active collection
        context.view_layer.active_layer_collection = current_active_collection

        # Select and activate main_object
        main_object.select_set(True)
        context.view_layer.objects.active = main_object

        return {'FINISHED'}


class DeleteHighlightOperator(bpy.types.Operator):
    bl_idname = "alcm.highlight_delete_operator"
    bl_label = "Delete Highlight"

    @classmethod
    def poll(cls, context):
        return context.object and hasattr(context.object, "studio_highlight")

    def execute(self, context):
        obj = context.object

        # Collect all children (and deeper descendants) of the main object
        objects_to_delete = [child for child in obj.children_recursive] + [obj]

        # Use batch removal for efficiency
        bpy.data.batch_remove(objects_to_delete)
        return {'FINISHED'}


class HighlightPanel(bpy.types.Panel):
    bl_idname = "ALCM_PT_highlight"
    bl_label = "Highlight"
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "object"

    @classmethod
    def poll(cls, context):
        return context.object and hasattr(context.object, "studio_highlight")

    def draw(self, context):
        layout = self.layout
        obj = context.object

        # Display the properties from HighlightPropertyGroup
        if hasattr(obj, "studio_highlight"):
            layout.prop(obj.studio_highlight, "highlight_id")

        layout.operator("alcm.highlight_delete_operator")


class WebGLStudioMenu(bpy.types.Menu):
    bl_idname = "ALCM_MT_menu"
    bl_label = "WebGL Studio"

    def draw(self, context):
        layout = self.layout
        layout.operator(AddHighlightOperator.bl_idname)


def draw_func(self, context):
    layout = self.layout
    layout.menu(WebGLStudioMenu.bl_idname)


def register():
    bpy.types.VIEW3D_MT_add.append(draw_func)
    bpy.types.Object.studio_highlight = bpy.props.PointerProperty(type=HighlightPropertyGroup)


def unregister():
    bpy.types.VIEW3D_MT_add.remove(draw_func)
    del bpy.types.Object.studio_highlight
