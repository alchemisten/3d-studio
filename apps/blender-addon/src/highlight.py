import bpy
from mathutils import Vector


def update_highlight_id(self, context):
    obj = context.object
    if obj and "studio_highlight" in obj and "main_object" not in obj.studio_highlight:
        new_id = self.highlight_id
        obj.name = f"Highlight {new_id}"

        # Rename linked children using stored references
        if obj.highlight_properties.camera_object:
            obj.highlight_properties.camera_object.name = f"Camera {new_id}"
        if obj.highlight_properties.click_zone_object:
            obj.highlight_properties.click_zone_object.name = f"Click Zone {new_id}"
        if obj.highlight_properties.target_object:
            obj.highlight_properties.target_object.name = f"Target {new_id}"


class HighlightPropertyGroup(bpy.types.PropertyGroup):
    name = "Highlight"
    bl_idname = "alcm.highlight"
    highlight_id: bpy.props.StringProperty(
        name="Highlight ID",
        update=update_highlight_id
    )
    camera_object: bpy.props.PointerProperty(name="Camera Object", type=bpy.types.Object)
    click_zone_object: bpy.props.PointerProperty(name="Click Zone Object", type=bpy.types.Object)
    target_object: bpy.props.PointerProperty(name="Target Object", type=bpy.types.Object)


class HighlightPartPropertyGroup(bpy.types.PropertyGroup):
    name = "Highlight Part"
    bl_idname = "alcm.highlight_part"
    highlight_id: bpy.props.StringProperty(
        name="Highlight ID",
        update=update_highlight_id
    )
    main_object: bpy.props.PointerProperty(name="Camera Object", type=bpy.types.Object)


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
        bpy.ops.object.empty_add(location=(0, 0, 0))
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
        camera.studio_highlight_part.highlight_id = self.highlight_id
        camera.studio_highlight.main_object = main_object
        main_object.studio_highlight.camera_object = camera

        # Create the child target point object at view direction but 2 units in front
        view_direction = context.region_data.view_rotation @ Vector((0, 0, -2))
        target_location = context.region_data.view_location + view_direction
        bpy.ops.object.empty_add(location=target_location)
        target = bpy.context.active_object
        target.name = f"Target {self.highlight_id}"
        target.parent = main_object
        target.studio_highlight_part.highlight_id = self.highlight_id
        target.studio_highlight.main_object = main_object
        main_object.studio_highlight.target_object = target

        # Create the child click zone object
        click_zone_location = (camera.location + target.location) / 2
        click_zone_location.x += 0.1  # Slightly to the right
        bpy.ops.object.empty_add(location=click_zone_location, type="CIRCLE")
        click_zone = bpy.context.active_object
        click_zone.name = f"Click Zone {self.highlight_id}"
        click_zone.parent = main_object
        click_zone.studio_highlight_part.highlight_id = self.highlight_id
        click_zone.studio_highlight.main_object = main_object
        main_object.studio_highlight.click_zone_object = click_zone

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


class SelectHighlightChildOperator(bpy.types.Operator):
    bl_idname = "alcm.highlight_select_child"
    bl_label = "Select Highlight Object"

    object_name: bpy.props.StringProperty()

    def execute(self, context):
        # Deselect all objects
        bpy.ops.object.select_all(action='DESELECT')

        # Select the specified object
        obj = bpy.data.objects.get(self.object_name)
        if obj:
            obj.select_set(True)
            context.view_layer.objects.active = obj

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
        if hasattr(obj, "studio_highlight") and obj.studio_highlight.highlight_id is not "":
            highlight_props = obj.studio_highlight

            # Display the Highlight ID
            layout.prop(highlight_props, "highlight_id")

            # Display readonly fields for the child objects
            if highlight_props.camera_object:
                row = layout.row()
                self.add_select_button(layout, highlight_props.camera_object, "Camera", 'CAMERA_DATA')
            if highlight_props.click_zone_object:
                row = layout.row()
                self.add_select_button(layout, highlight_props.click_zone_object, "Click Zone", 'MESH_PLANE')
            if highlight_props.target_object:
                row = layout.row()
                self.add_select_button(layout, highlight_props.target_object, "Target", 'OBJECT_DATA')

            # Button to delete the highlight
            layout.operator("alcm.highlight_delete_operator")

        if hasattr(obj, 'studio_highlight_part'):
            highlight_part_props = obj.studio_highlight_part

            # Display the Highlight ID
            layout.prop(highlight_part_props, "highlight_id")

            # Display readonly fields for the child objects
            if highlight_part_props.main_object:
                row = layout.row()
                self.add_select_button(layout, highlight_part_props.main_object, "Main", 'OBJECT_DATA')

    def add_select_button(self, layout, child_obj, label, icon):
        if child_obj:
            row = layout.row()
            row.label(text=f"{label}:")
            op = row.operator("alcm.highlight_select_child", text=f"Select {child_obj.name}", icon=icon)
            op.object_name = child_obj.name


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
    bpy.types.Object.studio_highlight_part = bpy.props.PointerProperty(type=HighlightPartPropertyGroup)


def unregister():
    bpy.types.VIEW3D_MT_add.remove(draw_func)
    del bpy.types.Object.studio_highlight
    del bpy.types.Object.studio_highlight_part
