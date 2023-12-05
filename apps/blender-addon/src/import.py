import bpy
import requests
import re

from bpy.props import StringProperty

from .components.translations import update_languages

class ImportWebGLProjectOperator(bpy.types.Operator):
    bl_idname = "alcm.import_legacy_webgl_project"
    bl_label = "Import WebGL Project"

    url: StringProperty(name="URL", default="")

    @staticmethod
    def find_translation(project, key, lang):
        if not project or not key or not lang:
            return key
        
        if not project["i18n"] or not project["i18n"][lang] or not project["i18n"][lang][key]:
            return key
        
        return project["i18n"][lang][key]

    def execute(self, context):
        print("Importing WebGL project from URL:", self.url)

        parsed_url = re.search(r"https?:\/\/([^\/]+)\/view\/([^\/]+)", self.url)

        if not parsed_url:
            bpy.ops.alcm.message_box_operator('INVOKE_DEFAULT',
                                              message=f"'{self.url}' not a valid URL")
            return {'CANCELLED'}

        (domain, project_id) = parsed_url.groups()

        if not domain or not project_id:
            bpy.ops.alcm.message_box_operator('INVOKE_DEFAULT',
                                              message=f"'{self.url}' is not a 3D Studio URL")
            return {'CANCELLED'}
        
        print("Domain:", domain, "Project ID:", project_id)

        api_url = f"https://{domain}/api/projects/{project_id}"

        api_data = requests.get(api_url)

        if api_data.status_code != 200:
            bpy.ops.alcm.message_box_operator('INVOKE_DEFAULT',
                                              message=f"API did return error {api_data.status_code} for '{api_url}': {api_data.reason}")
            return {'CANCELLED'}

        data = api_data.json()

        if not data:
            bpy.ops.alcm.message_box_operator('INVOKE_DEFAULT',
                                              message=f"API did not return valid JSON for '{api_url}'")
            return {'CANCELLED'}
        
        if not data["project"] or not data["id"]:
            bpy.ops.alcm.message_box_operator('INVOKE_DEFAULT',
                                              message=f"API did not return valid project data for '{api_url}'")
            return {'CANCELLED'}
        
        studio_settings = context.scene.studio_settings

        studio_settings.resource_id = data["id"]

        studio_settings.languages.clear()
        languages = data["project"]["languages"]
        for lang in languages:
            lang_item = studio_settings.languages.add()
            lang_item.code = lang
        
        update_languages(self, context)

        title_key = data["project"]["name"]
        for title in studio_settings.title.i18n:
            title.translation = self.find_translation(data, title_key, title.code)
            break

        highlights = data["highlights"]
        if highlights:
            for highlight in highlights:
                pass
                #bpy.ops.alcm.highlight_add_operator('INVOKE_DEFAULT',
                #                              highlight_id=f"{highlight['id']}")

        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self, width=400)

    def draw(self, context):
        self.layout.prop(self, 'url')