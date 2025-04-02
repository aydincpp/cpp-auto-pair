import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

// Global object to store all configuration values
let configValues: {
    defaultIncludeFolder: string;
    defaultSrcFolder: string;
    useManualFolderSelection: boolean;
    headerFileExtensions: string[];
    sourceFileExtensions: string[];
    headerGuardType: string;
};

export function activate(context: vscode.ExtensionContext) {
    // Retrieve all configuration values once and store them globally
    const config = vscode.workspace.getConfiguration('c-cpp-auto-pair');
    configValues = {
        defaultIncludeFolder: config.get<string>('defaultIncludeFolder', 'include'),
        defaultSrcFolder: config.get<string>('defaultSrcFolder', 'src'),
        useManualFolderSelection: config.get<boolean>('useManualFolderSelection', false),
        headerFileExtensions: config.get<string[]>('headerFileExtensions', [
            '.h',
            '.hpp',
            '.hxx',
            '.h++',
        ]),
        sourceFileExtensions: config.get<string[]>('sourceFileExtensions', [
            '.c',
            '.cpp',
            '.cc',
            '.cxx',
        ]),
        headerGuardType: config.get<string>('headerGuardType', 'ifndef')  // Default to 'ifndef'
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('c-cpp-auto-pair.createPairFiles', createPairFiles),
        vscode.commands.registerCommand('c-cpp-auto-pair.renamePairFiles', renamePairFiles),
    );
}

async function createPairFiles() {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open!');
            return;
        }

        // Prompt the user for the base name
        const baseName = await vscode.window.showInputBox({
            placeHolder: 'Enter the base name for the files (e.g., "add")',
            prompt: 'Base name for the new header and source files'
        });

        if (!baseName) {
            vscode.window.showErrorMessage('You must enter a base name!');
            return;
        }

        // Prompt user to select header file extension
        const selectedHeaderExt = await vscode.window.showQuickPick(configValues.headerFileExtensions, {
            placeHolder: 'Select the extension for the header file',
        });

        if (!selectedHeaderExt) { return; } // User canceled

        // Prompt user to select source file extension
        const selectedSourceExt = await vscode.window.showQuickPick(configValues.sourceFileExtensions, {
            placeHolder: 'Select the extension for the source file',
        });

        if (!selectedSourceExt) { return; } // User canceled

        // Get all folders in the workspace
        let allDirs = await getAllDirs(workspaceFolder);

        // Add an option for creating files in the root folder
        allDirs.unshift(workspaceFolder);

        // Add default folders
        const includeDir = path.join(workspaceFolder, configValues.defaultIncludeFolder);
        const srcDir = path.join(workspaceFolder, configValues.defaultSrcFolder);

        // Convert to relative paths for better readability
        const workspaceName = path.basename(workspaceFolder);
        const quickPickItems = allDirs.map(dir => path.relative(workspaceFolder, dir) || `[${workspaceName} - Root]`);

        // Determine where to place the files based on user settings
        let headerFilePath: string, cppFilePath: string;

        if (configValues.useManualFolderSelection) {
            // If manual folder selection is enabled, first ask for header file folder
            const headerFolder = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select the directory for the header file',
            });

            if (!headerFolder) { return; } // If user cancels, exit

            // Get the absolute path of the selected folder for header file
            const headerFolderPath = allDirs[quickPickItems.indexOf(headerFolder)];

            // Now, ask for the source file folder
            const sourceFolder = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select the directory for the source file',
            });

            if (!sourceFolder) { return; } // If user cancels, exit

            // Get the absolute path of the selected folder for source file
            const sourceFolderPath = allDirs[quickPickItems.indexOf(sourceFolder)];

            // Generate file paths
            headerFilePath = path.join(headerFolderPath, `${baseName}${selectedHeaderExt}`);
            cppFilePath = path.join(sourceFolderPath, `${baseName}${selectedSourceExt}`);
        } else {
            // Automatically place files in the default include/src folders
            headerFilePath = path.join(includeDir, `${baseName}${selectedHeaderExt}`);
            cppFilePath = path.join(srcDir, `${baseName}${selectedSourceExt}`);

            // Ensure the directories exist, create them if they do not
            await createDirectory(includeDir);
            await createDirectory(srcDir)
        }

        // Create files
        await createHeaderFile(headerFilePath, cppFilePath, baseName);
        await createCppFile(cppFilePath, headerFilePath, baseName);
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${(error as Error).message}`);
    }
}

async function renamePairFiles() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showErrorMessage("No file selected or open for renaming.");
        return;
    }

    const oldUri = activeEditor.document.uri;
    const oldFilePath = oldUri.fsPath;
    const oldFileExtName = path.extname(oldFilePath);
    const oldBaseName = path.basename(oldFilePath, oldFileExtName);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }

    const newBaseName = await vscode.window.showInputBox({
        placeHolder: 'Enter new base name',
        prompt: 'Rename the C++ pair files',
        value: oldBaseName
    });

    if (!newBaseName) {
        vscode.window.showErrorMessage('You must enter a new name!');
        return;
    }

    // Find matching files
    const matchedFiles = await findPairFiles(workspaceFolder, oldBaseName, oldFileExtName);

    // Exclude the active file
    const filteredFiles = matchedFiles.filter(file => file !== oldFilePath);

    if (filteredFiles.length === 0) {
        vscode.window.showErrorMessage(`No pair file found for ${oldBaseName}.`);
        return;
    }

    let pairFilePath = filteredFiles.length === 1 ? filteredFiles[0] : await vscode.window.showQuickPick(filteredFiles, {
        placeHolder: 'Select the correct pair file',
    });

    if (!pairFilePath) { return; } // If user cancels selection

    // Determine which file is header and which is cpp based on extensions
    const isHeaderFile = configValues.headerFileExtensions.includes(oldFileExtName);
    const isCppFile = configValues.sourceFileExtensions.includes(oldFileExtName);

    const headerFilePath = isHeaderFile ? oldFilePath : pairFilePath;
    const cppFilePath = isCppFile ? oldFilePath : pairFilePath;

    // Update header guard and include directive BEFORE renaming
    if (headerFilePath) {
        await updateHeaderGuard(headerFilePath, newBaseName);
    }
    if (cppFilePath) {
        await updateIncludeDirective(cppFilePath, headerFilePath, newBaseName);
    }

    // Rename the files AFTER updating them
    const newFilePath = path.join(path.dirname(oldFilePath), `${newBaseName}${oldFileExtName}`);
    const newPairFilePath = path.join(path.dirname(pairFilePath), `${newBaseName}${path.extname(pairFilePath)}`);

    await vscode.workspace.fs.rename(vscode.Uri.file(oldFilePath), vscode.Uri.file(newFilePath));
    await vscode.workspace.fs.rename(vscode.Uri.file(pairFilePath), vscode.Uri.file(newPairFilePath));

    vscode.window.showInformationMessage(`Renamed: ${oldBaseName} → ${newBaseName}`);
}

async function findPairFiles(dir: string, baseName: string, extName: string): Promise<string[]> {
    let matchedFiles: string[] = [];
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory() && !/node_modules|\.git|\.vscode|dist|build/.test(file.name)) {
            matchedFiles = matchedFiles.concat(await findPairFiles(fullPath, baseName, extName));
        } else {
            const fileExt = path.extname(file.name);
            const fileBase = path.basename(file.name, fileExt);

            // If this file matches the given base name
            if (fileBase === baseName) {
                // If current file is a header, search for a source file
                if (configValues.headerFileExtensions.includes(extName) && configValues.sourceFileExtensions.includes(fileExt)) {
                    matchedFiles.push(fullPath);
                }
                // If current file is a source, search for a header file
                else if (configValues.sourceFileExtensions.includes(extName) && configValues.headerFileExtensions.includes(fileExt)) {
                    matchedFiles.push(fullPath);
                }
            }
        }
    }

    return matchedFiles;
}

// Function to update the #include directive in the source file
async function updateHeaderGuard(filePath: string, newBaseName: string) {
    const content = await fs.readFile(filePath, 'utf8');

    // Extract file extension from `filePath`
    const fileExt = path.extname(filePath);

    // Validate if this is a header file
    if (!configValues.headerFileExtensions.includes(fileExt)) {
        vscode.window.showWarningMessage(`Skipping header guard update: ${filePath} is not a recognized header file.`);
        return;
    }

    // Generate header guard name (sanitize base name and use extension)
    const sanitizedBaseName = newBaseName.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
    const guardName = `${sanitizedBaseName}${fileExt.replace('.', '_').toUpperCase()}_`;

    // Replace old header guards
    const newContent = content
        .replace(/#ifndef\s+[A-Z0-9_]+/g, `#ifndef ${guardName}`)
        .replace(/#define\s+[A-Z0-9_]+/g, `#define ${guardName}`);

    await fs.writeFile(filePath, newContent, 'utf8');
}

// Function to update the #include directive in the .cpp file
async function updateIncludeDirective(cppFilePath: string, headerFilePath: string, newBaseName: string) {
    try {
        // Check if the files exist
        if (!await fileExists(cppFilePath)) {
            throw new Error(`C++ file not found: ${cppFilePath}`);
        }
        if (!await fileExists(headerFilePath)) {
            throw new Error(`Header file not found: ${headerFilePath}`);
        }

        const content = await fs.readFile(cppFilePath, 'utf8');

        // Extract the extension dynamically from the actual header file
        const headerExt = path.extname(headerFilePath);
        if (!headerExt) {
            throw new Error(`Could not determine header file extension: ${headerFilePath}`);
        }

        const newInclude = `#include "${newBaseName}${headerExt}"`;

        // Replace any existing #include directive with the correct extension
        const newContent = content.replace(/#include\s+"[\w-]+\.[a-zA-Z0-9]+"/g, newInclude);

        await fs.writeFile(cppFilePath, newContent, 'utf8');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to update #include directive: ${(error as Error).message}`);
        console.error(`Error updating #include directive in ${cppFilePath}:`, error);
    }
}

// Async function to recursively get all directories
async function getAllDirs(dirPath: string): Promise<string[]> {
    let dirs: string[] = [];
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory() && !/node_modules|\.git|\.vscode|dist|build/.test(entry.name)) {
                const fullPath = path.join(dirPath, entry.name);
                dirs.push(fullPath);
                dirs = dirs.concat(await getAllDirs(fullPath)); // Recursively add subdirectories
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading directory: ${dirPath}\nError: ${error}`);
    }
    return dirs;
}

// Function to create a header file with a header guard
async function createHeaderFile(filePath: string, cppFilePath: string, baseName: string) {
    const headerGuard = generateHeaderGuard(baseName);
    await createFile(filePath, headerGuard, "Header file");
}

// Function to create a cpp file with an #include statement
async function createCppFile(filePath: string, headerFilePath: string, baseName: string) {
    const headerExt = path.extname(headerFilePath);
    const cppContent = `#include "${baseName}${headerExt}"\n\n// Your cpp content goes here\n`;

    await createFile(filePath, cppContent, "Cpp file");
}

// Function to generate a header guard based on user settings
function generateHeaderGuard(baseName: string): string {
    if (configValues.headerGuardType === 'pragma_once') {
        return `#pragma once\n\n// Your header content goes here\n`;
    } else {
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
        return `#ifndef ${sanitizedBaseName}_H_\n#define ${sanitizedBaseName}_H_\n\n// Your header content goes here\n\n#endif // ${sanitizedBaseName}_H_\n`;
    }
}

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Helper function to create a file with given content
async function createFile(filePath: string, content: string, fileType: string) {
    if (await fileExists(filePath)) {
        vscode.window.showWarningMessage(`${fileType} already exists: ${filePath}`);
        return;
    }

    await fs.writeFile(filePath, content, 'utf8');
    vscode.window.showInformationMessage(`${fileType} created: ${filePath}`);
}

// Helper function to create a directory if it doesn’t exist
async function createDirectory(dirPath: string): Promise<void> {
    if (!await fileExists(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// This function is called when your extension is deactivated (clean up if necessary)
export function deactivate() { }
