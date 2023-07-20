# Blender Content Viewer Addon

[[toc]]

## Prerequisites

- Have Blender installed
- Create .env file in this directory and specify following values:

```dotenv
BLENDER_PYTHON_PATH='<PATH_TO_YOUR_BLENDER_INSTALL>/Blender <VERSION>/<VERSION>/python/bin/python.exe'
```

### Development and Codestyle

Use prefixes from blender ([from Blender release notes](https://wiki.blender.org/wiki/Reference/Release_Notes/2.80/Python_API/Addons#Naming)):

- Header: `_HT_`
- Menu: `_MT_`
- Operator: `_OP_`
- Panel: `_PT_`
- UIList: `_UIList_`
