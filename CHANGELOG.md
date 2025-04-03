# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-04-03
### Added
- Implemented automatic detection of header file extensions when renaming pair files.
- Added GIF demos to the README.md.
- Enhanced error handling for file operations.

### Changed
- Improved file existence checking using `fileExists()` helper function.
- Optimized folder creation with `createDirectory()`.

### Fixed
- Fixed an issue where the `#include` directive wasn't updated when renaming a file.
- Addressed a bug where the extension failed to detect existing pair files.

---

## [1.0.0] - 2025-04-2
### Added
- Initial release of **C/C++ Auto Pair**.
- Features for creating and renaming C++ pair files.
