
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/olympus-btc/ambrosia)

<p align="center">
  <img src="client/public/ambrosia.svg" alt="Ambrosia Logo" width="300"/>
</p>

**Status: In Development**
> [!NOTE]
> The project is under continuous development and is subject to change.
>

This repository contains the documentation and project details for a restaurant and retail point of sale (POS) system, with a frontend developed in React, and a backend in Kotlin. The main files and their contents are described below:

## Project Proposal

- [Proposal.md](doc/proposal.md): Contains a general description of the system, including the main modules and their functionalities. It is ideal for understanding the scope and purpose of the project.

## Installation

To install Ambrosia, refer to the [Installation Guide](doc/installation.md) where you will find all available options and detailed instructions for setting up the system.

## Testing

The project includes end-to-end (E2E) tests for the server API. For detailed information on running the tests, see the [E2E Tests README](server/e2e_tests_py/README.md).

### Quick Start

```bash
cd server/e2e_tests_py
uv venv && source .venv/bin/activate
uv pip install -e .
pytest
```

---

## Desktop Application (Electron)

Ambrosia POS también está disponible como aplicación de escritorio multiplataforma.

### Desarrollo

```bash
cd electron
npm install
npm run dev
```

### Build

```bash
cd electron
npm run build
```

Ver [electron/README.md](electron/README.md) para instrucciones detalladas.

---

## Want to contribute?

Check out the [Contribution Guide](Contributing.md) to learn how you can help and be part of the future of POS systems for restaurants.
