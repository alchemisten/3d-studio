import bpy
from mathutils import Vector


def set_parent_keep_transform(child_obj, parent_obj):
    # Store the world space matrix
    child_world_matrix = child_obj.matrix_world.copy()

    # Set the parent
    child_obj.parent = parent_obj

    # Reset the child's matrix to the stored world space matrix
    child_obj.matrix_parent_inverse = parent_obj.matrix_world.inverted()
    child_obj.matrix_world = child_world_matrix


def update_highlight_id(self, context):
    obj = context.object
    if obj and "studio_highlight" in obj and "main_object" not in obj.studio_highlight:
        new_id = self.highlight_id
        obj.name = f"Highlight {new_id}"

        # Rename linked children using stored references
        if obj.studio_highlight.camera_object:
            obj.studio_highlight.camera_object.name = f"Camera {new_id}"
        if obj.studio_highlight.click_zone_object:
            obj.studio_highlight.click_zone_object.name = f"Click Zone {new_id}"
        if obj.studio_highlight.target_object:
            obj.studio_highlight.target_object.name = f"Target {new_id}"


def update_highlight_scale(self, context):
    obj = context.object

    # loop all highlights in WebGL Studio collection Hightlight and update scale
    if 'WebGL Studio' in bpy.data.collections and 'Highlights' in bpy.data.collections['WebGL Studio'].children:
        for highlight in bpy.data.collections['WebGL Studio'].children['Highlights'].objects:
            highlight_scale = context.scene.studio_highlight_settings.scale
            if highlight.studio_highlight.click_zone_object:
                highlight.studio_highlight.click_zone_object.scale = (highlight_scale, highlight_scale, highlight_scale)


class HighlightSettingsPropertyGroup(bpy.types.PropertyGroup):
    name = "Global Highlight Settings"
    bl_idname = "alcm.highlight_settings"
    scale: bpy.props.FloatProperty(
        name="Scale",
        default=0.5,
        min=0.01,
        update=update_highlight_scale
    )


class HighlightPropertyGroup(bpy.types.PropertyGroup):
    name = "Highlight"
    bl_idname = "alcm.highlight"
    highlight_id: bpy.props.StringProperty(
        name="Id",
        update=update_highlight_id
    )
    camera_object: bpy.props.PointerProperty(name="Camera Object", type=bpy.types.Object)
    click_zone_object: bpy.props.PointerProperty(name="Click Zone Object", type=bpy.types.Object)
    target_object: bpy.props.PointerProperty(name="Target Object", type=bpy.types.Object)


class HighlightPartPropertyGroup(bpy.types.PropertyGroup):
    name = "Highlight Part"
    bl_idname = "alcm.highlight_part"
    highlight_id: bpy.props.StringProperty(
        name="Id",
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
        # Get the current 3D view region data
        region_data = context.region_data

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

        view_matrix_inv = region_data.view_matrix.inverted()
        view_location = view_matrix_inv.translation
        view_direction = view_matrix_inv.to_3x3() @ Vector((0, 0, -1))  # View direction pointing forward

        # Create the main empty object
        bpy.ops.object.empty_add(location=view_location)
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
        camera.lock_location = (True, True, True)
        camera.studio_highlight_part.highlight_id = self.highlight_id
        camera.studio_highlight_part.main_object = main_object
        main_object.studio_highlight.camera_object = camera

        # Ray origin (current view location) and direction (view direction)
        ray_direction = region_data.view_rotation @ Vector((0, 0, -1))

        # Calculate the intersection with the ground plane (z = 0)
        if view_direction.z != 0:
            t = -view_location.z / view_direction.z
            target_location = view_location + (view_direction * t)
        else:
            # In case the view is parallel to the ground plane, place the target at a default distance
            target_location = view_location + (view_direction * 2)

        bpy.ops.object.empty_add(location=target_location)
        target = bpy.context.active_object
        target.name = f"Target {self.highlight_id}"
        target.studio_highlight_part.highlight_id = self.highlight_id
        target.studio_highlight_part.main_object = main_object
        main_object.studio_highlight.target_object = target

        # Create the child click zone object
        # Forward vector from main_object to target
        main_to_target = target.location - main_object.location
        forward_vector = main_to_target.normalized()

        # Global 'up' vector (assumed to be Z-axis)
        global_up = Vector((0, 0, 1))

        # Right vector as a cross product of forward_vector and global_up
        right_vector = forward_vector.cross(global_up).normalized()

        # Up vector as a cross product of right_vector and forward_vector
        up_vector = right_vector.cross(forward_vector).normalized()

        # Midpoint between main_object and target
        midpoint = (main_object.location + target.location) / 2

        # Offset the click_zone_location to the right and up
        offset_distance = main_to_target.length * 0.05
        click_zone_location = midpoint + right_vector * offset_distance + up_vector * offset_distance

        bpy.ops.object.empty_add(location=click_zone_location, type="SPHERE", radius=1.0)
        click_zone = bpy.context.active_object
        click_zone.name = f"Click Zone {self.highlight_id}"
        click_zone.studio_highlight_part.highlight_id = self.highlight_id
        click_zone.studio_highlight_part.main_object = main_object
        main_object.studio_highlight.click_zone_object = click_zone

        set_parent_keep_transform(target, main_object)
        set_parent_keep_transform(click_zone, main_object)

        highlight_scale = context.scene.studio_highlight_settings.scale
        click_zone.scale = (highlight_scale, highlight_scale, highlight_scale)

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

        parts = [obj]
        if hasattr(obj, "studio_highlight"):
            studio_highlight = obj.studio_highlight
            if studio_highlight.camera_object:
                parts.append(studio_highlight.camera_object)
            if studio_highlight.click_zone_object:
                parts.append(studio_highlight.click_zone_object)
            if studio_highlight.target_object:
                parts.append(studio_highlight.target_object)

        # Collect all children (and deeper descendants) of the main object, if there were more
        objects_to_delete = [child for child in obj.children_recursive] + parts

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


class SetActiveCameraOperator(bpy.types.Operator):
    bl_idname = "alcm.set_active_camera"
    bl_label = "Set Active Camera"

    camera_name: bpy.props.StringProperty()

    def execute(self, context):
        camera = bpy.data.objects.get(self.camera_name)
        if camera and camera.type == 'CAMERA':
            context.scene.camera = camera
            # Find the first 3D view and set it to camera view
            for area in context.screen.areas:
                if area.type == 'VIEW_3D':
                    area.spaces.active.region_3d.view_perspective = 'CAMERA'
                    area.spaces.active.region_3d.update()
                    break
        else:
            self.report({'WARNING'}, "No camera found with the given name.")
        return {'FINISHED'}


class HighlightSettingsPanel(bpy.types.Panel):
    bl_idname = "ALCM_PT_highlight_settings"
    bl_label = "Global Highlight Settings"
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "scene"

    @classmethod
    def poll(cls, context):
        # TODO check if WebGL Studio is initialized at all
        return True

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # Display the properties from HighlightSettingsPropertyGroup
        layout.prop(scene.studio_highlight_settings, "scale")


class HighlightPanel(bpy.types.Panel):
    bl_idname = "ALCM_PT_highlight"
    bl_label = "Highlight"
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "object"

    @classmethod
    def poll(cls, context):
        return context.object and hasattr(context.object, "studio_highlight") or hasattr(context.object, "studio_highlight_part")

    def draw(self, context):
        layout = self.layout
        obj = context.object

        # Display the properties from HighlightPropertyGroup
        if hasattr(obj, "studio_highlight") and obj.studio_highlight.highlight_id != "":
            highlight_props = obj.studio_highlight

            # Display the Highlight ID
            main = layout.box()
            main.prop(highlight_props, "highlight_id")

            # Display readonly fields for the child objects
            self.add_set_active_camera_button(layout, highlight_props.camera_object)
            select = layout.box()
            select.label(text="Select:")
            if highlight_props.camera_object:
                self.add_select_button(select, highlight_props.camera_object, "Camera", 'CAMERA_DATA')
            if highlight_props.click_zone_object:
                self.add_select_button(select, highlight_props.click_zone_object, "Click Zone", 'MESH_PLANE')
            if highlight_props.target_object:
                self.add_select_button(select, highlight_props.target_object, "Target", 'OBJECT_DATA')

            # Button to delete the highlight
            row = layout.box()
            row.label(text="Actions:")
            row.operator("alcm.highlight_delete_operator", text=f"Delete Highlight {highlight_props.highlight_id}", icon='TRASH')

        if hasattr(obj, 'studio_highlight_part'):
            highlight_part_props = obj.studio_highlight_part

            # Display the Highlight ID
            layout.label(text=f"Highlight ID: {highlight_part_props.highlight_id}")

            # Display readonly fields for the child objects
            if highlight_part_props.main_object:
                row = layout.row()
                self.add_select_button(layout, highlight_part_props.main_object, "Main Object", 'OBJECT_DATA')

            self.add_set_active_camera_button(layout, obj)

    def add_select_button(self, layout, child_obj, label, icon):
        if child_obj:
            row = layout.row()
            op = row.operator("alcm.highlight_select_child", text=f"Select '{child_obj.name}'", icon=icon)
            op.object_name = child_obj.name

    def add_set_active_camera_button(self, layout, camera_obj):
        if camera_obj and camera_obj.type == 'CAMERA':
            row = layout.row()
            op = row.operator("alcm.set_active_camera", text="Preview Highlight Camera", icon='CAMERA_DATA')
            op.camera_name = camera_obj.name


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
    bpy.types.Scene.studio_highlight_settings = bpy.props.PointerProperty(type=HighlightSettingsPropertyGroup)
    bpy.types.Object.studio_highlight = bpy.props.PointerProperty(type=HighlightPropertyGroup)
    bpy.types.Object.studio_highlight_part = bpy.props.PointerProperty(type=HighlightPartPropertyGroup)


def unregister():
    bpy.types.VIEW3D_MT_add.remove(draw_func)
    del bpy.types.Scene.studio_highlight_settings
    del bpy.types.Object.studio_highlight
    del bpy.types.Object.studio_highlight_part
