<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-wordmark-light.svg" alt="Liveblocks"   />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-wordmark-dark.svg" alt="Liveblocks"   />
  </a>
</p>
<p align="center">
  <a href="https://twitter.com/liveblocks">
    <img src="https://img.shields.io/badge/liveblocks-message?style=flat&logo=twitter&color=555&logoColor=fff" alt="Twitter" />
  </a>
  <a href="https://discord.gg/X4YWJuH9VY">
    <img src="https://img.shields.io/discord/913109211746009108?style=flat&label=discord&logo=discord&color=85f&logoColor=fff" alt="Discord" />
  </a>
    <a href="https://www.youtube.com/channel/UCDXT5skWxzOorIQrWG5OT2w">
    <img src="https://img.shields.io/youtube/channel/subscribers/UCDXT5skWxzOorIQrWG5OT2w?style=flat&label=youtube&logo=youtube&color=e14&logoColor=fff" alt="YouTube" />
  </a>
  <a href="https://github.com/liveblocks/liveblocks/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/liveblocks/liveblocks?style=flat&label=license&logo=github&color=f80&logoColor=fff" alt="License" />
  </a>
</p>

# Contributing

Welcome to our contributing guide! We're excited to have you as a contributor.

## Releasing

Packages are published on the [npm registry](https://www.npmjs.com/). Each
release is associated to a github tag.

A version is composed of three numbers: `X.Y.Z` where `X` is the major version,
`Y` is the minor version and `Z` is the patch version.

A tag is a label that is applied to a version. It can be used to identify a
version as a beta, or other version.

Combined together, a version and a tag can be used to identify a package
release.

Example:

- `v1.0.0` is the first release of the `1.0.0` version.
- `v1.0.0-beta1` is the first `beta` release of the `1.0.0` version.

We have some rules in place to make sure that the version numbers and tags are
correct.

Publishing a package is done by running the
[**Publish packages**](https://github.com/liveblocks/liveblocks/actions/workflows/publish-packages.yml)
workflow.

<!-- Insert workflow screenshot here -->

### Latest releases

Latest releases are stable and production ready.

We release packages under the `latest` npm tag using the following format:

- github tag: `vX.Y.Z`
- version: `X.Y.Z`
- npm tag: `latest`

Latest releases are only published from the `main` branch.

### Beta releases

Beta releases are near-stable and close to production ready.

We release packages under the `beta` npm tag using the following format:

- github tag: `vX.Y.Z-betaN`
- version: `X.Y.Z-betaN`
- npm tag: `beta`

Beta releases are only published from the `beta` branch.

### Other releases

Other releases are not stable and not production ready.

We release packages under the desired npm tag using the following format:

- github tag: `vX.Y.Z-<tag>N`
- version: `X.Y.Z-<tag>N`
- npm tag: `<tag>`

Other releases are published from any branch.
