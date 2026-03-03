# c2pa-mcnl
[![CI](https://github.com/Dawn-Technology/c2pa-mcnl/actions/workflows/ci.yml/badge.svg)](https://github.com/Dawn-Technology/c2pa-mcnl/actions/workflows/ci.yml)
![GitHub License](https://img.shields.io/github/license/Dockbite/c2pa-mcnl)
![GitHub Created At](https://img.shields.io/github/created-at/Dockbite/c2pa-mcnl)
![GitHub contributors](https://img.shields.io/github/contributors/Dockbite/c2pa-mcnl)

C2PA implementation for Media Campus Nederland (MCNL) using Digital Verifiable Credentials (DVC) and an independent trust list.

## Table of Contents
- [Concept & Goals](#concept--goals)
- [About](#about)
- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Concept & Goals

The goal of this project is to create a proof of concept [C2PA](https://c2pa.org/) (Coalition for Content Provenance and Authenticity) implementation for [MCNL](https://mediacampus.nl/) (Media Campus Nederland). The implementation focuses on the use of Digital Verifiable Credentials (DVC) within the C2PA Manifest, a feature currently absent from the specification. Additionally, the project aims to establish an independently hosted trust list, distinct from the [C2PA Conformance Program](https://c2pa.org/conformance/).

### Open Source
The project is developed as an [open-source initiative](#license), allowing for community contributions and transparency. Furthermore, we hope to spread knowledge about C2PA and DVCs within the media industry.

### Independent Trust List
An independently hosted trust list will be created to manage trusted issuers and signers for C2PA manifests. This trust list will be separate from the official C2PA Conformance Program, ensuring independence and flexibility from big tech organizations for Dutch media corporations regarding the entities included in the list.

### C2PA implementation using JavaScript/TypeScript
The project utilizes JavaScript/TypeScript for the C2PA implementation, leveraging existing libraries and tools to facilitate development and integration.

Creating an SDK of the entire C2PA specification is a complex task. Therefore, the project focuses on using existing resources, such as:

- [c2pa-ts](https://github.com/TrustNXT/c2pa-ts): A TypeScript implementation of the C2PA specification maintained (indepentantly) by [TrustNXT](https://trustnxt.com/).
- [c2pa-js](https://github.com/contentauth/c2pa-js): A C2PA JavaScript implementation maintained by the Content Authenticity Initiative, which wraps the Rust implementation in WebAssembly.
- [c2pa-rs](https://github.com/contentauth/c2pa-rs): The "official" C2PA Rust implementation maintained by the Content Authenticity Initiative
- [c2patool](https://github.com/contentauth/c2pa-rs/tree/main/cli): A command-line tool for working with C2PA manifests, built on top of the c2pa-rs library.
- [c2pa-attacks](https://github.com/contentauth/c2pa-attacks): A repository containing various attack scenarios and test cases for C2PA implementations, useful for testing and validation. Maintained by the Content Authenticity Initiative.
- [c2pa-explorations](https://github.com/christianpaquin/c2pa-explorations/tree/main?tab=readme-ov-file): Experimentation and prototyping done by [Christian Paquin](https://www.microsoft.com/en-us/research/people/cpaquin/), a Microsoft engineer.

With these resources, the project aims to build a functional C2PA implementation that meets the specified goals.

### Verification website
A website similar to the Content Authenticity Initiative's [verify.contentauthenticity.org](https://verify.contentauthenticity.org/) that allows users to upload media files and verify their C2PA manifests. The main difference is that this website will use our own JavaScript/TypeScript implementation and trust list to verify the manifests. 

### Signing tool
A web-based signing tool that allows users to upload media files and attach C2PA manifests together with Digital Verifiable Credentials (DVC). Just like the verification website, this tool will use our own JavaScript/TypeScript implementation for the signing process. The main goal of the tool is to demonstrate the use of DVCs within C2PA manifests.

This tool will most likely not be served publicly, as it requires a x509 certificate to sign the manifests. Instead, it will be used for internal testing and demonstration purposes.

### Other resources

- [CAWG](https://cawg.io/): Building on the work of the C2PA, the CAWG defines technical standards that empower individuals and organizations to assert attribution of digital content while supporting privacy and transparency.
- [C2PA n'est pas une pipe](https://mediacampus.nl/app/uploads/2025/06/Rapport-%E2%80%93-C2PA-nest-pas-une-pipe-%E2%80%93-Verkenning-implementatie-C2PA_jun25.pdf):  Commissioned by NPO Innovatie (NPO), Media Campus NL, and
  Beeld & Geluid, this research investigated whether the C2PA specification is suitable to support NPO's objective in this study: "To combat
  disinformation by ensuring the authenticity of reporting through digital certificates." This investigation
  builds upon the previous Proof of Provenance project (2022) and considers the rapid
  developments surrounding C2PA and the EBU's call to support standards for origin verification.

## About

### Structure

The repository is structured as an Nx monorepo, which allows for efficient management of multiple projects, packages and libraries within a single codebase. The main components of the repository include:

- `./apps`
  - [verify-webapp](apps/verify-webapp/README.md): A verification website for C2PA manifests.
  - [signing-webapp](apps/signing-webapp/README.md): A web-based signing tool for attaching C2PA manifests to media files.
- `./libs`
  - `verify-webapp/*`: Grouping folder for libraries related to the verification webapp.
  - `signing-webapp/*`: Grouping folder for libraries related to the signing webapp.
  - `shared/*`: Grouping folder for shared libraries used across multiple apps.
- `./tools`
  - [did-generator](./tools/did-generator/README.md): A CLI tool for generating Decentralized Identifiers (DIDs) for testing purposes.
  - [cert-generator](./tools/cert-generator/README.md): A CLI tool for generating x509 certificates for testing purposes.

### ESLint
With the help of the `@nx/enforce-module-boundaries` rule, this monorepo enforces strict boundaries between different projects and libraries. This ensures that each project only depends on the libraries it is allowed to use, promoting modularity and maintainability.

For more information, see the [Nx documentation on module boundaries](https://nx.dev/docs/technologies/eslint/eslint-plugin/guides/enforce-module-boundaries).

### Nx
This repository is set up using [Nx](https://nx.dev/?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects), a smart, fast and extensible build system.  

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/tutorials/angular-monorepo-tutorial?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Enterprise Angular Monorepo Patterns](https://go.nx.dev/angular-patterns-ebook)

## Install
The project uses [PNPM](https://pnpm.io/installation) as the package manager. To install the dependencies, run the following command in the root directory:

`pnpm install`

## Usage
`TODO`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate and follow the existing code style.


## License

Distributed under the Apache 2.0 License. See LICENSE.md for more information.
