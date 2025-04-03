# C/C++ Auto Pair VS Code Extension

## Overview
C/C++ Auto Pair is a Visual Studio Code extension that simplifies managing C and C++ header/source file pairs. It allows users to create, rename, and manage associated `.h/.cpp` files efficiently within their projects.

## Features
- 📂 **Create Pair Files:** Quickly generate a header and source file with a chosen base name and extensions.
- 🔄 **Rename Pair Files:** Rename both header and source files while automatically updating includes and header guards.
- 📑 **Automatic Folder Selection:** Supports manual or automated placement of files in predefined `include/` and `src/` directories.
- 🛡 **Header Guards & Pragma Once Support:** Configurable options for header guard format.

## Usage
### Creating Pair Files
1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Search for `Create C/C++ Pair Files` and select it.
3. Enter a base name for the files.
4. Choose the header file extension (e.g., `.h`, `.hpp`).
5. Choose the source file extension (e.g., `.cpp`, `.c`).
6. Select directories (if `c-cpp-auto-pair.useManualFolderSelection: true`) or let the extension place them automatically.
7. Files will be created with appropriate header guards and `#include` directives.

### Creating Pair Files (`c-cpp-auto-pair.useManualFolderSelection: false`)
![Create Pair Files Auto](https://raw.githubusercontent.com/aydincpp/cpp-auto-pair/refs/heads/main/media/create_pair_files_auto.gif)

### Creating Pair Files (`c-cpp-auto-pair.useManualFolderSelection: true`)
![Create Pair Files Auto](https://raw.githubusercontent.com/aydincpp/cpp-auto-pair/refs/heads/main/media/create_pair_files_manual.gif)

### Renaming Pair Files
![Rename Pair Files](https://raw.githubusercontent.com/aydincpp/cpp-auto-pair/refs/heads/main/media/rename_pair_files.gif)

1. Open one of the pair files in the editor.
2. Open the Command Palette and run `Rename C/C++ Pair Files`.
3. Enter a new base name.
4. The header and source files will be renamed, updating references accordingly.
5. If multiple matching files exist, the extension will prompt you to select the correct pair file.

#### Handling Multiple Pair Files

If your project contains multiple header or source files with the same base name but different extensions or locations, the extension will detect them and ask you to choose the correct pair file. This ensures that the correct files are renamed together without affecting unrelated files.

##### Example Scenario

Consider the following project structure:

```
project/
├── include/
│   ├── math_utils.h
│   ├── math_utils.hpp
├── src/
│   ├── math_utils.cpp
│   ├── math_utils.cxx
```

If you attempt to rename `math_utils.cpp`, the extension will detect multiple matching headers (`math_utils.h` and `math_utils.hpp`). It will prompt you to select the correct header file before renaming both files.

## Configuration Options
Users can configure settings in VS Code (`settings.json`):

| Setting | Description | Default Value |
|---------|-------------|---------------|
| `c-cpp-auto-pair.defaultIncludeFolder` | Default folder for header files | `include` |
| `c-cpp-auto-pair.defaultSrcFolder` | Default folder for source files | `src` |
| `c-cpp-auto-pair.useManualFolderSelection` | Ask user for folder selection when creating files | `false` |
| `c-cpp-auto-pair.headerFileExtensions` | Available header file extensions | `[".h", ".hpp", ".hxx"]` |
| `c-cpp-auto-pair.sourceFileExtensions` | Available source file extensions | `[".c", ".cpp", ".cc", ".cxx"]` |
| `c-cpp-auto-pair.headerGuardType` | Header guard type (`ifndef` or `pragma_once`) | `ifndef` |

## License
This extension is licensed under the GPL-3.0 License.

## Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.

## Author
Created by **Aydin Ramezani**. For support or feature requests, reach out via:

- **GitHub:** [@aydincpp](https://github.com/aydincpp)
- **Instagram:** [@aydincpp](https://instagram.com/aydincpp)

Hey, I am a C++ developer as a hobby. I don't usually create VS Code extensions, but during the development of my game engine, as the project grew, creating files manually was becoming very frustrating. So, I created this VS Code extension. If this extension was helpful, please consider giving it some stars. If you found any issues, you can message me on Instagram, and I'll try my best to fix it! 😊
