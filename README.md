<a href="./README.md">
  <img width="120" height="120" src="./docs/remote-modules.svg" align="right">
</a>

# Remote Modules
> A module manager for distributed applications</br></br>
> [![nodejs](https://img.shields.io/badge/node-%3E=8.0.0-brightgreen.svg)](https://nodejs.org/)
> [![travis-ci](https://travis-ci.org/bernardmcmanus/remote-modules.svg?branch=next)](https://travis-ci.org/bernardmcmanus/remote-modules)
> [![coveralls](https://coveralls.io/repos/github/bernardmcmanus/remote-modules/badge.svg?branch=next)](https://coveralls.io/github/bernardmcmanus/remote-modules?branch=next)

# Contents
<!-- AUTO-GENERATED AT COMMIT. DO NOT EDIT -->

<!-- toc -->

- [Installation](#installation)
- [Introduction](#introduction)
  * [Why Remote Modules?](#why-remote-modules)
  * [Stability and Security](#stability-and-security)
- [API Documentation](#api-documentation)
- [Example App](#example-app)
- [Getting Started](#getting-started)
- [Key Features and Concepts](#key-features-and-concepts)
  * [Hot Swapping](#hot-swapping)
  * [Static Evaluation](#static-evaluation)
  * [Scope](#scope)
  * [Request Attributes](#request-attributes)
- [FAQ](#faq)

<!-- tocstop -->

# Installation

<sup>__NOTE:__ `remote-modules` should be installed as a dependency.</sup>

Install with yarn:

```
yarn add remote-modules
```

Install with npm:

```
npm install remote-modules
```

# Introduction

remote-modules is a full service JavaScript module manager. It's universal, so it will run both in browser and on server. It's comprised of several components that are used to compile, serve, fetch, and execute modules dynamically, on demand, over HTTP, _even server-side_.

Remember, __never use remote-modules to load untrusted code.__ It's poor form, and even in a sandbox it can have terrible consequences, especially on your server. Just don't do it.

## Why Remote Modules?

UI frameworks come in all shapes and sizes, but they all have one common dependency: __context__. This makes perfect sense considering browsers are designed to load and execute JavaScript on demand, but it also means UI apps that make use of SSR (server-side rendering) are hopelessly monolithic. To be sure, there are many ways to break things up - you can publish shared components or even entire pages as packages that are installed by the shell, but at the end of the day, even the smallest change means a full deploy.

remote-modules empowers you to build truly distributed, independently deployable applications. Its relevance extends far beyond the UI - any component or plugin based application is a great candidate. We'd love to hear how you're using remote-modules to solve your most frustrating architecture problems.

## Stability and Security

remote-modules is still in the very early stages of development, which means there will be big changes coming as we gather feedback and work to stabilize the API. We don't plan on making any breaking changes or adding significant features before the first major release, except for low-hanging fruit or some of the larger pain points. Bugs and vulnerabilities will be patched as they arise, and releases will adhere to semver rules.

<h4>Stability Designations</h4>

Rank | Description
---- | -----------
[![Deprecated](http://badges.github.io/stability-badges/dist/deprecated.svg "Deprecated")](http://github.com/badges/stability-badges) | Don't use this feature - it's no longer supported and will likely be removed
[![Experimental](http://badges.github.io/stability-badges/dist/experimental.svg "Experimental")](http://github.com/badges/stability-badges) | There may be fundamental changes to this feature
[![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable")](http://github.com/badges/stability-badges) | There may be breaking changes to this feature
[![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable")](http://github.com/badges/stability-badges) | There may be backward compatible changes to this feature

# API Documentation

_--- WIP ---_

# Example App

_--- WIP ---_

# Getting Started

_--- WIP ---_

# Key Features and Concepts

## Hot Swapping

_--- WIP ---_

## Static Evaluation

_--- WIP ---_

## Scope

_--- WIP ---_

## Request Attributes

_--- WIP ---_

# FAQ

1. Does it work with TypeScript?

    __YES__

2. Does it work with Flow?

    __YES__
