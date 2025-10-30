# Copilot Instructions for nes360

## Overview

This project is a 3D environment built using HTML and JavaScript, leveraging WebGL and A-Frame for rendering. The architecture is modular, with distinct components for models, controls, and scene management.

## Architecture

- **Components**: The project is structured around reusable components, primarily located in the `assets/models` directory. Each model is defined in `.bbmodel` files, which are loaded dynamically.
- **Data Flow**: Data is passed between components through properties and events. For example, the speed and acceleration of objects are managed through the `this.data` object in the JavaScript files.
- **Service Boundaries**: The main service boundaries are defined by the different models and their interactions within the scene. Understanding how these models communicate is crucial for extending functionality.

## Developer Workflows

- **Building**: Use Webpack for building the project. Ensure all dependencies are installed via npm before running the build command.
- **Testing**: Testing is primarily manual, focusing on visual inspection of the 3D environment. Automated tests are not currently implemented.
- **Debugging**: Use browser developer tools to inspect elements and debug JavaScript. Console logs are heavily utilized for tracking state changes.

## Project-Specific Conventions

- **Model Naming**: Models in the `assets/models` directory follow a naming convention that reflects their purpose (e.g., `flamingo.bbmodel` for a flamingo model).
- **Event Handling**: Custom events are used for communication between components. For example, when a model is clicked, it triggers an event that other components can listen to.

## Integration Points

- **External Dependencies**: The project relies on A-Frame and other libraries for rendering and controls. Ensure these are included in the HTML files.
- **Cross-Component Communication**: Components communicate through events and shared data properties. Understanding the event system in A-Frame is essential for effective development.

## Key Files/Directories

- `assets/models/`: Contains all 3D models used in the project.
- `dist/`: Contains the built files, including `aframe-extras.controls.js` which is crucial for user interactions.
- `test.html`: A testing ground for new features and models before integration into the main project.

## Examples

- To modify the speed of a model, adjust the `this.data.speed` property in the relevant component script.
- Use `document.querySelectorAll` to select multiple elements for batch operations in the scene.

---

This document should be updated as the project evolves to reflect new patterns and practices.
